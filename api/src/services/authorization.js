const db = require('../db');
const auth = require('../auth');
const _ = require('lodash');
const config = require('../config');
const viewMapUtils = require('@medic/view-map-utils');
const registrationUtils = require('@medic/registration-utils');

const ALL_KEY = '_all'; // key in the docs_by_replication_key view for records everyone can access
const UNASSIGNED_KEY = '_unassigned'; // key in the docs_by_replication_key view for unassigned records
const MEDIC_CLIENT_DDOC = '_design/medic-client';
const DEFAULT_DDOCS = [
  MEDIC_CLIENT_DDOC,
  'service-worker-meta',
  'settings',
];

// fake view map, to store whether doc is a medic.user-settings doc
const couchDbUser = doc => doc.type === 'user-settings';

const getUserSettingsId = username => `org.couchdb.user:${username}`;
const getDefaultDocs = (userCtx) => [ ...DEFAULT_DDOCS, getUserSettingsId(userCtx?.name)];

const getDepth = (userCtx) => {
  const depth = {
    contactDepth: -1,
    reportDepth: -1,
  };

  if (!userCtx.roles || !userCtx.roles.length) {
    return depth;
  }

  const settings = config.get('replication_depth');
  if (!settings) {
    return depth;
  }

  userCtx.roles.forEach(function(role) {
    // find the role with the deepest depth
    const setting = settings.find(setting => setting.role === role);
    const settingDepth = setting && parseInt(setting.depth, 10);
    if (!isNaN(settingDepth) && settingDepth > depth.contactDepth) {
      depth.contactDepth = settingDepth;
      depth.replicatePrimaryContacts = setting.replicate_primary_contacts;

      const settingsReportDepth = setting && parseInt(setting.report_depth);
      depth.reportDepth = !isNaN(settingsReportDepth) ? settingsReportDepth : -1;
    }
  });

  return depth;
};

const usesReportDepth = (authorizationContext) => authorizationContext.reportDepth >= 0;

const hasAccessToUnassignedDocs = (userCtx) => {
  return config.get('district_admins_access_unallocated_messages') &&
         auth.hasAllPermissions(userCtx, 'can_view_unallocated_data_records');
};

const includeSubjects = (authorizationContext, newSubjects, depth) => {
  const initialSubjectsCount = authorizationContext.subjectIds.length;
  newSubjects.forEach(subject => {
    if (!subject || authorizationContext.subjectIds.includes(subject)) {
      return;
    }

    authorizationContext.subjectsDepth[subject] = depth;
    authorizationContext.subjectIds.push(subject);
  });

  return authorizationContext.subjectIds.length !== initialSubjectsCount;
};

const excludeSubjects = (authorizationContext, ...subjectIds) => {
  authorizationContext.subjectIds = _.without(authorizationContext.subjectIds, ...subjectIds);
};

// gets the depth of a contact, relative to the user's facilities
const getContactDepth = (authorizationContext, contactsByDepth) => {
  const depthEntry = contactsByDepth.find(entry => {
    return entry.key.length === 2 && authorizationContext.userCtx.facility_id.includes(entry.key[0]);
  });
  return depthEntry && depthEntry.key[1];
};

// Updates authorizationContext.subjectIds, including or excluding tested contact `subjectId` and `docId`
// @param   {Boolean} allowed - whether subjects should be included or excluded
// @param   {Array}   authorizationContext.subjectIds - allowed subjectIds.
// @param   {Object}  authorizationContext.subjectsByDepth
// @param   {Array}   viewValues.contactsByDepth - results of `medic/contacts_by_depth` view against doc
// @returns {Boolean} whether new subjectIds were added to authorizationContext
const updateContext = (allowed, authorizationContext, { contactsByDepth }) => {
  if (!contactsByDepth || !contactsByDepth.length) {
    return false;
  }

  //first element of `contactsByDepth` contains both `subjectId` and `docID`
  const [{ key: [ docId ], value: subjectId }] = contactsByDepth;

  if (allowed) {
    const contactDepth = getContactDepth(authorizationContext, contactsByDepth);
    return includeSubjects(authorizationContext, [subjectId, docId], contactDepth);
  }

  excludeSubjects(authorizationContext, subjectId, docId);
  return false;
};

// Returns whether an authenticated user has access to a document
// @param   {Object}   docId - CouchDB document ID
// @param   {Object}   authorizationContext.userCtx - authenticated user information
// @param   {Array}    authorizationContext.contactsByDepthKeys - list containing user's generated contactsByDepthKeys
// @param   {Array}    authorizationContext.subjectIds - allowed subjectIds.
// @param   {Object}   viewResults.replicationKey - result of `medic/docs_by_replication_key` view against doc
// @param   {Array}    viewResults.contactsByDepth - results of `medic/contacts_by_depth` view against doc
// @returns {Boolean}
const allowedDoc = (docId, authorizationContext, { replicationKeys, contactsByDepth }) => {
  if ([MEDIC_CLIENT_DDOC, getUserSettingsId(authorizationContext.userCtx.name)].includes(docId)) {
    return true;
  }

  if (!replicationKeys || !replicationKeys.length) {
    return false;
  }

  if (replicationKeys[0].key === ALL_KEY) {
    return true;
  }

  if (contactsByDepth && contactsByDepth.length) {
    //it's a contact
    return allowedContact(contactsByDepth, authorizationContext);
  }

  //it's a report, task or target
  const allowedDepth = isAllowedDepth(authorizationContext, replicationKeys);
  return replicationKeys.some(replicationKey => {
    const { key: subjectId, value: { submitter: submitterId } = {} } = replicationKey;
    const priv = replicationKey?.value?.private; // private is a reserved word
    const allowedSubmitter = submitterId && authorizationContext.subjectIds.includes(submitterId);
    if (!subjectId && allowedSubmitter) {
      return true;
    }
    const allowedSubject = subjectId && authorizationContext.subjectIds.includes(subjectId);
    return allowedSubject &&
           !isSensitive(authorizationContext.userCtx, subjectId, submitterId, priv, allowedSubmitter) &&
           allowedDepth;
  });
};

// Returns filtered list of docs the offline user is allowed to see
// @param   {Object}   authorizationContext
// @param   {Object[]} docObjs - the list of docObjs to be filtered
// @param   {String}   docObjs[].id - the docId
// @param   {Boolean}  docObjs[].allowed - when true, the doc is considered as allowed without being checked
// @param   {Object}   docObjs[].viewResults - results of authorization views against the doc
// @returns {Object[]} filtered list of docs the offline user is allowed to see
// If authorizationContext was updating during an iteration, the remaining docs are rechecked against the
// updated context.
const filterAllowedDocs = (authorizationContext, docObjs) => {
  const allowedDocs = [];
  let shouldIterate = true;

  const checkDoc = (docObj) => {
    const allowed = docObj.allowed || allowedDoc(docObj.id, authorizationContext, docObj.viewResults);
    shouldIterate = updateContext(allowed, authorizationContext, docObj.viewResults) || shouldIterate;

    if (!allowed) {
      return;
    }

    allowedDocs.push(docObj);
    docObjs = _.without(docObjs, docObj);
  };

  while (docObjs.length && shouldIterate) {
    shouldIterate = false;
    docObjs.forEach(checkDoc);
  }

  return allowedDocs;
};

const alwaysAllowCreate = doc => {
  return doc && doc.type && doc.type === 'feedback';
};

const getContactsByDepthKeys = (userCtx, depth) => {
  const keys = [];
  for (const facilityId of userCtx.facility_id) {
    if (depth >= 0) {
      keys.push(...Array.from({ length: depth + 1 }).map((_, i) => [facilityId, i]));
    } else {
      // no configured depth limit
      keys.push([ facilityId ]);
    }
  }

  return keys;
};

/**
 * Returns whether an authenticated user has access to a document
 * @param {Array<{ key: [string, string?], value: { _id:string, shortcode:string} }>} docContactsByDepth
 * @param {Object} authorizationContext
 * @param {Array} authorizationContext.contactsByDepthKeys - list containing user's generated contactsByDepthKeys
 * @param {Array<string>} authorizationContext.subjectIds - allowed subjectIds.
 *
 * @returns {Boolean}
 */
const allowedContact = (docContactsByDepth, authorizationContext) => {
  const viewResultKeys = docContactsByDepth.map(result => result.key);
  const contactsByDepthKeys = authorizationContext.contactsByDepthKeys;
  const matchedView = viewResultKeys.some(
    viewResult => contactsByDepthKeys.some(generated => _.isEqual(viewResult, generated))
  );

  if (matchedView) {
    return true;
  }

  // this doc isn't allowed through its direct lineage, but can be a primary contact of a place that is.
  const { _id: docId, shortcode } = docContactsByDepth[0].value;
  return authorizationContext.subjectIds.includes(docId) || authorizationContext.subjectIds.includes(shortcode);
};

const getContextObject = (userCtx) => {
  const { contactDepth, reportDepth, replicatePrimaryContacts } = getDepth(userCtx);
  const subjectsDepth = {};
  return {
    userCtx,
    contactsByDepthKeys: getContactsByDepthKeys(userCtx, contactDepth, replicatePrimaryContacts),
    subjectIds: [ ALL_KEY, getUserSettingsId(userCtx.name) ],
    contactDepth,
    reportDepth,
    subjectsDepth,
    replicatePrimaryContacts,
  };
};

const getContactSubjects = (row, replicatePrimaryContacts) => {
  const { _id: docId, shortcode, primary_contact: primaryContact } = row.value || {};
  const subjects = [docId, shortcode];

  if (replicatePrimaryContacts) {
    subjects.push(primaryContact);
  }

  return subjects.filter(Boolean);
};

const getAuthorizationContext = (userCtx) => {
  const authorizationCtx = getContextObject(userCtx);

  return db.medic.query('medic/contacts_by_depth', { keys: authorizationCtx.contactsByDepthKeys }).then(results => {
    results.rows.forEach(row => {
      const subjects = getContactSubjects(row, authorizationCtx.replicatePrimaryContacts);
      authorizationCtx.subjectIds.push(...subjects);

      if (usesReportDepth(authorizationCtx)) {
        const subjectDepth = row.key[1];
        subjects.forEach(subject => authorizationCtx.subjectsDepth[subject] = subjectDepth);
      }
    });

    authorizationCtx.subjectIds = _.uniq(authorizationCtx.subjectIds);
    if (hasAccessToUnassignedDocs(userCtx)) {
      authorizationCtx.subjectIds.push(UNASSIGNED_KEY);
      authorizationCtx.subjectsDepth[UNASSIGNED_KEY] = 0;
    }
    return authorizationCtx;
  });
};

const getReplicationKeys = (viewResults) => {
  const replicationKeys = [];
  if (!viewResults || !viewResults.replicationKeys) {
    return replicationKeys;
  }

  viewResults.replicationKeys.forEach(({ key: subjectId, value: { submitter: submitterId } = {}}) => {
    replicationKeys.push(subjectId);
    if (submitterId) {
      replicationKeys.push(submitterId);
    }
  });

  return replicationKeys;
};

/**
 * returns a list of corresponding contact docs
 * @param {string[]} replicationKeys - either contact shortcodes (`patient_id` or `place_id`) or doc ids
 * @returns {Promise<Object[]>}
 */
const findContactsByReplicationKeys = (replicationKeys) => {
  replicationKeys = _.without(replicationKeys, UNASSIGNED_KEY);

  if (!replicationKeys || !replicationKeys.length) {
    return Promise.resolve([]);
  }

  replicationKeys = _.uniq(replicationKeys);
  const keys = replicationKeys.map(id => ['shortcode', id]);

  return db.medic
    .query('medic-client/contacts_by_reference', { keys })
    .then(result => {
      let docIds = [];
      replicationKeys.forEach(replicationKey => {
        const keys = result.rows.filter(row => row.key[1] === replicationKey).map(row => row.id);
        if (keys.length) {
          docIds.push(...keys);
        } else {
          docIds.push(replicationKey);
        }
      });
      docIds = _.uniq(docIds);

      return db.medic.allDocs({ keys: docIds, include_docs: true });
    })
    .then(results => results.rows.map(row => row.doc).filter(doc => doc));
};

const getContactsByLineage = async (docs) => {
  const lineageIds = new Set();

  for (const doc of docs) {
    let parent = doc;
    while (parent) {
      lineageIds.add(parent._id);
      parent = parent.parent;
    }
  }

  const uniqIds = [...lineageIds].filter(Boolean);
  const allDocsResult = await db.medic.allDocs({ keys: uniqIds, include_docs: true });
  return allDocsResult.rows.map(row => row.doc).filter(doc => doc);
};

/**
 * Iterates over list of contacts and populates list of allowed subject ids. Returns whether new subjects were added.
 * @param {{ subjectIds: string[], replicatePrimaryContacts: Boolean }}authorizationCtx
 * @param {Object[]} contacts - contact docs to be evaluated
 */
const populateAllowedSubjectIds = (authorizationCtx, contacts) => {
  const initialSubjectIdsCount = authorizationCtx.subjectIds.length;
  contacts.forEach(contact => {
    if (!contact) {
      return;
    }

    const viewResults = getViewResults(contact);
    if (!allowedDoc(contact._id, authorizationCtx, viewResults)) {
      return;
    }

    const contactsByDepthResults = viewResults.contactsByDepth?.[0]?.value;
    const subjectIds = [contactsByDepthResults._id, contactsByDepthResults.shortcode];
    if (authorizationCtx.replicatePrimaryContacts) {
      subjectIds.push(contactsByDepthResults.primary_contact);
    }
    const contactDepth = getContactDepth(authorizationCtx, viewResults.contactsByDepth);
    includeSubjects(authorizationCtx, subjectIds, contactDepth);
  });
  return authorizationCtx.subjectIds.length !== initialSubjectIdsCount;
};

/**
 * To determine whether a user has access to a small set of docs (for example, during a GET attachment
 * request), instead of querying `medic/contacts_by_depth` to get all allowed subjectIds, runs the view queries
 * over the provided docs, gets all contacts that the docs emit for in `medic/docs_by_replication_key`,
 * if primary contacts are replicated, we also include the docs' lineage, and creates a reduced set of
 * relevant allowed subject ids.
 *
 * @param userCtx
 * @param scopeDocsCtx
 * @returns {Promise<{subjectIds: (string|string)[]}
 */
const getScopedAuthorizationContext = async (userCtx, scopeDocsCtx = []) => {
  const authorizationCtx = getContextObject(userCtx);

  scopeDocsCtx = scopeDocsCtx.filter(docCtx => docCtx && docCtx.doc);
  if (!scopeDocsCtx.length) {
    return authorizationCtx;
  }

  // collect all values that the docs would emit in `medic/docs_by_replication_key`
  const replicationKeys = [];
  scopeDocsCtx.forEach(docCtx => {
    const viewResults = docCtx.viewResults || getViewResults(docCtx.doc);
    replicationKeys.push(...getReplicationKeys(viewResults));
  });

  const contacts = await findContactsByReplicationKeys(replicationKeys);
  if (authorizationCtx.replicatePrimaryContacts) {
    const contactsByLineage = await getContactsByLineage(contacts);
    contacts.push(...contactsByLineage);
  }

  // we simulate a `medic/contacts_by_depth` filter over the list contacts
  // reiterate because primary contacts are only allowed after we initially populate subject ids list
  let newSubjects;
  do {
    newSubjects = populateAllowedSubjectIds(authorizationCtx, contacts);
    console.log(newSubjects);
  } while (newSubjects);


  if (hasAccessToUnassignedDocs(userCtx)) {
    authorizationCtx.subjectIds.push(UNASSIGNED_KEY);
  }

  console.log(authorizationCtx.subjectIds);

  return authorizationCtx;
};

/**
 * Method to ensure users don't see private reports submitted by their boss about the user's contact
 * @param {Object} userCtx                    User context object
 * @param {string} userCtx.contact_id         the user's contact's uuid
 * @param {[string]} userCtx.facility_id      the user's places' uuids
 * @param {Object|undefined} userCtx.contact  the user's contact
 * @param {Array|undefined} userCtx.facility the users' places
 * @param {string|undefined} subject          report's subject
 * @param {string|undefined} submitter        report's submitter
 * @param {boolean} isPrivate                 whether the report is private
 * @param {boolean|function} allowedSubmitter boolean or function that returns a boolean representing whether the user
 *                                            can see the submitter of the report
 * @returns {boolean}
 */
const isSensitive = (userCtx, subject, submitter, isPrivate, allowedSubmitter) => {
  if (!subject || !submitter || !isPrivate) {
    return false;
  }

  const sensitiveSubjects = [
    ...(userCtx.facility?.map(facility => registrationUtils.getSubjectIds(facility)) || []).flat(),
    ...registrationUtils.getSubjectIds(userCtx.contact),
    ...userCtx.facility_id,
    userCtx.contact_id,
  ];

  if (!sensitiveSubjects.includes(subject)) {
    return false;
  }

  return typeof allowedSubmitter === 'function' ? !allowedSubmitter() : !allowedSubmitter;
};

/**
 * Returns whether a doc should be visible, depending on configured replication_depth.report_depth.
 * We're receiving all relevant replication keys to check whether at least one is of valid depth.
 * In cases of reports with `needs_signoff`, the replication key of valid depth might be at facility level, but that
 * key would be marked as sensitive.
 * @param {Object} authorizationContext
 * @param {Object} authorizationContext.subjectsDepth
 * @param {number} authorizationContext.subjectsDepth.subject - relative depth of every contact the user can see
 * @param {Object} authorizationContext.reportDepth - the maximum allowed depth for replicated reports
 * @param {Array[]} replicationKeys - array of pairs of subject + value, emitted by docs_by_replication_keys view
 * @returns {boolean}
 */
const isAllowedDepth = (authorizationContext, replicationKeys) => {
  if (!usesReportDepth(authorizationContext)) {
    // no depth limitation
    return true;
  }

  const [{ value: { type: docType } = {} }] = replicationKeys;
  if (docType !== 'data_record') {
    // allow everything that's not a data_record through (f.e. targets)
    return true;
  }

  return replicationKeys.some(replicationKey => {
    const { key: subject, value: { submitter } = {} } = replicationKey;
    if (submitter === authorizationContext.userCtx.contact_id) {
      // current user is the submitter
      return true;
    }

    return authorizationContext.subjectsDepth[subject] <= authorizationContext.reportDepth;
  });
};

const groupViewResultsById = (authorizationContext, viewResults) => {
  if (!usesReportDepth(authorizationContext)) {
    return {};
  }

  return _.groupBy(viewResults.rows, 'id');
};

const isTaskDoc = (row) => row.value && row.value.type === 'task';

// casting everything to string to insure that comparisons are against the same type to avoid 5 > 'a' || 5 < 'a'
const prepareForSortedSearch = array => array.map(element => String(element)).sort();
const sortedIncludes = (sortedArray, element) => _.sortedIndexOf(sortedArray, String(element)) !== -1;

const getDocsByReplicationKey = (authorizationContext) => {
  return db.medic.query('medic/docs_by_replication_key', { keys: authorizationContext.subjectIds }).then(results => {
    const viewResultsById = groupViewResultsById(authorizationContext, results);

    // leverage binary search when looking up subjects
    const sortedSubjects = prepareForSortedSearch(authorizationContext.subjectIds);

    const docsByReplicationKey = [];

    results.rows.forEach(row => {
      const { key: subject, value: { submitter } = {} } = row;
      const priv = row?.value?.private; // private is a reserved word
      const allowedSubmitter = () => sortedIncludes(sortedSubjects, submitter);
      if (isSensitive(authorizationContext.userCtx, subject, submitter, priv, allowedSubmitter)) {
        return;
      }

      if (isAllowedDepth(authorizationContext, viewResultsById[row.id])) {
        docsByReplicationKey.push(row);
      }
    });

    return docsByReplicationKey;
  });
};

const filterAllowedDocIds = (authCtx, docsByReplicationKey, { includeTasks = true } = {}) => {
  const validatedIds = [MEDIC_CLIENT_DDOC, getUserSettingsId(authCtx.userCtx.name)];

  if (!docsByReplicationKey || !docsByReplicationKey.length) {
    return validatedIds;
  }

  docsByReplicationKey.forEach(row => {
    if (isTaskDoc(row) && !includeTasks) {
      return;
    }
    validatedIds.push(row.id);
  });

  return _.uniq(validatedIds);
};

const getAllowedDocIds = (authorizationContext, { includeTasks = true } = {}) => {
  return getDocsByReplicationKey(authorizationContext).then(docsByReplicationKey => {
    return filterAllowedDocIds(authorizationContext, docsByReplicationKey, { includeTasks });
  });
};

const getViewResults = (doc) => {
  return {
    contactsByDepth: viewMapUtils.getViewMapFn('medic', 'contacts_by_depth')(doc),
    replicationKeys: viewMapUtils.getViewMapFn('medic', 'docs_by_replication_key')(doc),
    couchDbUser: couchDbUser(doc)
  };
};

module.exports = {
  DEFAULT_DDOCS,
  updateContext,
  getDefaultDocs,
  allowedDoc: allowedDoc,
  getViewResults: getViewResults,
  getAuthorizationContext: getAuthorizationContext,
  getAllowedDocIds: getAllowedDocIds,
  getDocsByReplicationKey: getDocsByReplicationKey,
  filterAllowedDocIds: filterAllowedDocIds,
  alwaysAllowCreate: alwaysAllowCreate,
  filterAllowedDocs: filterAllowedDocs,
  getScopedAuthorizationContext: getScopedAuthorizationContext,
};
