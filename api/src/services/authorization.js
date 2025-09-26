const db = require('../db');
const auth = require('../auth');
const _ = require('lodash');
const config = require('../config');
const viewMapUtils = require('@medic/view-map-utils');
const registrationUtils = require('@medic/registration-utils');
const request = require('@medic/couch-request');
const environment = require('@medic/environment');
const nouveau = require('@medic/nouveau');

const ALL_KEY = '_all'; // key in the docs_by_replication_key view for records everyone can access
const UNASSIGNED_KEY = '_unassigned'; // key in the docs_by_replication_key view for unassigned records
const MEDIC_CLIENT_DDOC = '_design/medic-client';
const DEFAULT_DDOCS = [
  MEDIC_CLIENT_DDOC,
  'service-worker-meta',
  'settings',
];

/**
 * @typedef {{
 * name:string,
 * roles:string[]
 * contact_id:string,
 * facility_id: string[],
 * contact:Object,
 * facility:Object[]
 * }} userCtx
 */

/**
 * @typedef {Object} AuthorizationContext
 * @property {userCtx} userCtx
 * @property {Array} contactsByDepthKeys,
 * @property {string[]} subjectIds,
 * @property {number} contactDepth.
 * @property {number} reportDepth.
 * @property {{[docId:string]:number}} subjectsDepth,
 * @property {boolean} replicatePrimaryContacts,
 */

/**
 * @typedef {{
 *   id: string,
 *   fields: {
 *     key: string|string[],
 *     type?: string,
 *     submitter?: string,
 *     subject?: string,
 *     private?: boolean,
 *     needed_signoff?: boolean,
 *   }
 * }} DocByReplicationKey
 */

// fake view map, to store whether doc is a medic.user-settings doc
const couchDbUser = doc => doc.type === 'user-settings';

const getUserSettingsId = username => `org.couchdb.user:${username}`;
const getDefaultDocs = (userCtx) => [ ...DEFAULT_DDOCS, getUserSettingsId(userCtx?.name)];

/**
 * Returns maximum allowed contact and report replication depth and most permissive
 * replicatePrimaryContacts setting for the highest depth based on user's roles
 * @param {userCtx} userCtx
 * @returns {{contactDepth: number, reportDepth: number, replicatePrimaryContacts:boolean}}
 */
const getDepth = (userCtx) => {
  const NO_VAL = -1;
  const depth = {
    contactDepth: NO_VAL,
    reportDepth: NO_VAL,
    replicatePrimaryContacts: false,
  };

  const getReportDepth = (value) => {
    value = parseInt(value, 10);
    return isNaN(value) ? NO_VAL : value;
  };

  if (!userCtx.roles || !userCtx.roles.length) {
    return depth;
  }

  const settings = config.get('replication_depth');
  if (!settings) {
    return depth;
  }

  userCtx.roles.forEach((role) => {
    // find the role with the highest depth
    const setting = settings.find(setting => setting.role === role);
    if (!setting) {
      return;
    }
    const settingDepth = parseInt(setting.depth, 10);
    if (isNaN(setting.depth)) {
      return;
    }

    if (settingDepth > depth.contactDepth) {
      depth.contactDepth = settingDepth;
      depth.replicatePrimaryContacts = !!setting.replicate_primary_contacts;
      depth.reportDepth = getReportDepth(setting.report_depth);
      return;
    }

    if (settingDepth === depth.contactDepth) {
      depth.replicatePrimaryContacts = depth.replicatePrimaryContacts || !!setting.replicate_primary_contacts;
      const settingsReportDepth = getReportDepth(setting.report_depth);
      depth.reportDepth = Math.max(depth.reportDepth, settingsReportDepth);
    }
  });

  return depth;
};

const usesReportDepth = (authorizationContext) => authorizationContext.reportDepth >= 0;

const hasAccessToUnassignedDocs = (userCtx) => {
  return config.get('district_admins_access_unallocated_messages') &&
         auth.hasAllPermissions(userCtx, 'can_view_unallocated_data_records');
};

const lowestSubjectDepth = (subjects, subjectsDepth, depth) => {
  const depths = [Number.MAX_VALUE, depth, ...subjects.map(subject => subjectsDepth[subject])];
  return Math.min(...depths.filter(d => !isNaN(d)));
};

const includeSubjects = (authorizationContext, newSubjects, depth) => {
  const initialSubjectsCount = authorizationContext.subjectIds.length;

  depth = lowestSubjectDepth(newSubjects, authorizationContext.subjectsDepth, depth);
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
  return depthEntry?.key[1];
};

/**
 * Updates authorizationContext.subjectIds, including or excluding tested contact `subjectId` and `docId`
 * @param   {Boolean} allowed - whether subjects should be included or excluded
 * @param   {AuthorizationContext} authorizationContext
 * @param   {Array}   contactsByDepth - results of `medic/contacts_by_depth` view against doc
 * @returns {Boolean} whether new subjectIds were added to authorizationContext
 **/
const updateContext = (allowed, authorizationContext, { contactsByDepth }) => {
  if (!contactsByDepth || !contactsByDepth.length) {
    return false;
  }

  // first element of `contactsByDepth` contains both `subjectId` and `docID`
  const [{ key: [ docId ], value: { shortcode: subjectId, primary_contact: primaryContact } }] = contactsByDepth;

  if (allowed) {
    const newSubjects = [subjectId, docId];
    if (authorizationContext.replicatePrimaryContacts) {
      newSubjects.push(primaryContact);
    }
    const contactDepth = getContactDepth(authorizationContext, contactsByDepth);
    return includeSubjects(authorizationContext, newSubjects, contactDepth);
  }

  excludeSubjects(authorizationContext, subjectId, docId);
  return false;
};

/**
 * Returns whether an authenticated user has access to a document
 * @param   {String}   docId - CouchDB document ID
 * @param   {AuthorizationContext}   authorizationContext
 * @param   {DocByReplicationKey}   docsByReplicationKey - result of `medic/_nouveau/docs_by_replication_key` index
 * @param   {Array}    contactsByDepth - results of `medic/contacts_by_depth` view against doc
 * @returns {Boolean}
 */
const allowedDoc = (docId, authorizationContext, { docsByReplicationKey, contactsByDepth }) => {
  if ([MEDIC_CLIENT_DDOC, getUserSettingsId(authorizationContext.userCtx.name)].includes(docId)) {
    return true;
  }

  const replicationKeys = Array.isArray(docsByReplicationKey.key) ?
    docsByReplicationKey.key : [docsByReplicationKey.key];

  if (replicationKeys.includes(ALL_KEY)) {
    return true;
  }

  if (contactsByDepth?.length) {
    // it's a contact
    return allowedContact(docId, contactsByDepth, authorizationContext);
  }

  // it's a report, task or target
  const allowedDepth = isAllowedDepth(authorizationContext, docsByReplicationKey);
  const { subject: subjectId, submitter: submitterId, private: priv } = docsByReplicationKey;
  const allowedSubmitter = submitterId && authorizationContext.subjectIds.includes(submitterId);
  if (!subjectId && allowedSubmitter) {
    return true;
  }

  return replicationKeys.some(subjectId => {
    const allowedSubject = subjectId && authorizationContext.subjectIds.includes(subjectId);
    return allowedSubject &&
           !isSensitive(authorizationContext.userCtx, subjectId, submitterId, priv, allowedSubmitter) &&
           allowedDepth;
  });
};

/**
 * Returns filtered list of docs the offline user is allowed to see
 * @param   {AuthorizationContext}   authorizationContext
 * @param   {Object[]} docObjs - the list of docObjs to be filtered
 * @param   {String}   docObjs[].id - the docId
 * @param   {Boolean}  docObjs[].allowed - when true, the doc is considered as allowed without being checked
 * @param   {Object}   docObjs[].viewResults - results of authorization views against the doc
 * @returns {Object[]} filtered list of docs the offline user is allowed to see
 * If authorizationContext was updating during an iteration, the remaining docs are rechecked against the
 * updated context.
 */
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
 * @param {String} docId document id
 * @param {Array<{ key: [string, string?], value: { _id:string, shortcode:string} }>} docContactsByDepth
 * @param {AuthorizationContext} authorizationContext
 * @param {Boolean} authorizationContext.replicatePrimaryContacts - whether to allow replication of primary contacts
 *
 * @returns {Boolean}
 */
const allowedContact = (docId, docContactsByDepth, authorizationContext) => {
  const viewResultKeys = docContactsByDepth.map(result => result.key);
  const contactsByDepthKeys = authorizationContext.contactsByDepthKeys;
  const matchedView = viewResultKeys.some(
    viewResult => contactsByDepthKeys.some(generated => _.isEqual(viewResult, generated))
  );

  if (matchedView) {
    return true;
  }

  if (!authorizationContext.replicatePrimaryContacts) {
    return false;
  }

  // this doc isn't allowed through its direct lineage, but can be a primary contact of a place that is.
  return authorizationContext.subjectIds.includes(docId);
};

/**
 * Returns authorization user context object for an offline user
 * @param {{ name:string, roles:string[] }} userCtx
 * @returns {AuthorizationContext}
 */
const getContextObject = (userCtx) => {
  const { contactDepth, reportDepth, replicatePrimaryContacts } = getDepth(userCtx);
  const subjectsDepth = {};
  return {
    userCtx,
    contactsByDepthKeys: getContactsByDepthKeys(userCtx, contactDepth),
    subjectIds: [ ALL_KEY, getUserSettingsId(userCtx.name) ],
    contactDepth,
    reportDepth,
    subjectsDepth,
    replicatePrimaryContacts,
  };
};

const getContactSubjects = (row) => {
  const subjects = [];

  subjects.push(row.id);

  if (row.value?.shortcode) {
    subjects.push(row.value.shortcode);
  }

  return subjects;
};

/**
 * Returns the authorization context for an offline user.
 * @param {{ name:string, roles:string[] }} userCtx
 * @returns* {Promise<AuthorizationContext>}
 */
const getAuthorizationContext = async (userCtx) => {
  const authCtx = getContextObject(userCtx);
  const contactsSubjects = {};

  const results = await db.medic.query('medic/contacts_by_depth', { keys: authCtx.contactsByDepthKeys });
  results.rows.forEach(row => {
    const subjects = getContactSubjects(row);

    contactsSubjects[row.id] = { subjects, primaryContact: row.value?.primary_contact };
    authCtx.subjectIds.push(...subjects);

    if (usesReportDepth(authCtx)) {
      const depth = lowestSubjectDepth(subjects, authCtx.subjectsDepth, row.key[1]);
      subjects.forEach(subject => authCtx.subjectsDepth[subject] = depth);
    }
  });

  if (authCtx.replicatePrimaryContacts) {
    await addPrimaryContactsSubjects(authCtx, contactsSubjects);
  }

  authCtx.subjectIds = _.uniq(authCtx.subjectIds);
  if (hasAccessToUnassignedDocs(userCtx)) {
    authCtx.subjectIds.push(UNASSIGNED_KEY);
    authCtx.subjectsDepth[UNASSIGNED_KEY] = 0;
  }

  return authCtx;
};

/**
 * Retrieves unknown primary contacts from the database.
 * Iterates over all primary contacts and includes them in the subjects lists and assigns correct depth.
 * @param {AuthorizationContext} authCtx
 * @param {{[docId:string]: { primaryContact:string, subjects:string[] }}} contacts - map of contacts and their subject
 * ids and primary contact
 * @returns {Promise<void>}
 */
const addPrimaryContactsSubjects = async (authCtx, contacts) => {
  const primaryContactIds = Object
    .values(contacts)
    .map(({ primaryContact }) => primaryContact)
    .filter(id => !!id);
  const unknownPrimaryContacts = _.uniq(primaryContactIds.filter(id => !contacts[id]));

  if (unknownPrimaryContacts.length) {
    const result = await db.medic.query('medic/contacts_by_depth', { keys: unknownPrimaryContacts.map(id => [id] ) });
    result.rows.forEach(row => {
      const subjects = getContactSubjects(row);
      authCtx.subjectIds.push(...subjects);
      contacts[row.id] = { subjects };
    });
  }

  if (usesReportDepth(authCtx)) {
    primaryContactIds.forEach(primaryContactId => {
      const parents = Object.entries(contacts)
        .filter(([, { primaryContact } ]) => primaryContact === primaryContactId)
        .map(([id]) => id);
      const depth = lowestSubjectDepth(parents, authCtx.subjectsDepth);
      contacts[primaryContactId].subjects.forEach(subject => authCtx.subjectsDepth[subject] = depth);
    });
  }

};

const getReplicationKeys = (viewResults) => {
  const replicationKeys = [];
  if (!viewResults || !viewResults.docsByReplicationKey) {
    return replicationKeys;
  }

  if (Array.isArray(viewResults.docsByReplicationKey.key)) {
    replicationKeys.push(...viewResults.docsByReplicationKey.key);
  } else {
    replicationKeys.push(viewResults.docsByReplicationKey.key);
  }
  replicationKeys.push(viewResults.docsByReplicationKey.submitter);

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
      const docIds = new Set();
      replicationKeys.forEach(replicationKey => {
        const keys = result.rows.filter(row => row.key[1] === replicationKey).map(row => row.id);
        if (keys.length) {
          docIds.add(...keys);
        } else {
          docIds.add(replicationKey);
        }
      });

      return db.medic.allDocs({ keys: [...docIds], include_docs: true });
    })
    .then(results => results.rows.map(row => row.doc).filter(doc => doc));
};

/**
 * Returns a list of places for which the passed contacts are assigned as primary contacts.
 * @param {{ _id:string }[]} docs
 * @returns {Promise<Object[]>}
 */
const getPrimaryPlaces = async (docs) => {
  const docIds = docs.map(doc => doc._id);
  const queryResult = await db.medic.query('medic/contacts_by_primary_contact', { keys: docIds, include_docs: true });
  return queryResult.rows.map(row => row.doc).filter(doc => doc);
};

/**
 * Iterates over list of contacts and populates list of allowed subject ids. Returns whether new subjects were added.
 * @param {{ subjectIds: string[], replicatePrimaryContacts: Boolean }} authorizationCtx
 * @param {Object[]} contacts - contact docs to be evaluated
 */
const populateAllowedSubjectIds = (authorizationCtx, contacts) => {
  const initialSubjectIdsCount = authorizationCtx.subjectIds.length;
  contacts.forEach(contact => {
    const viewResults = getViewResults(contact);
    if (!allowedDoc(contact._id, authorizationCtx, viewResults)) {
      return;
    }

    const contactsByDepthResults = viewResults.contactsByDepth?.[0]?.value;
    if (!contactsByDepthResults) {
      return;
    }

    const subjectIds = [contact._id, contactsByDepthResults.shortcode];
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
 * @param {userCtx} userCtx
 * @param {{ doc:{}, viewResults:{} }[]} scopeDocsCtx
 * @returns { Promise<AuthorizationContext> }
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
    docCtx.viewResults = viewResults;
  });

  const contacts = await findContactsByReplicationKeys(replicationKeys);
  if (authorizationCtx.replicatePrimaryContacts) {
    const primaryPlaces = await getPrimaryPlaces(contacts);
    contacts.push(...primaryPlaces);
  }

  // we simulate a `medic/contacts_by_depth` filter over the list contacts
  // reiterate because primary contacts are only included in subjects lists
  // after we initially populate it with all other contacts
  let newSubjects;
  do {
    newSubjects = populateAllowedSubjectIds(authorizationCtx, contacts);
  } while (newSubjects && authorizationCtx.replicatePrimaryContacts);

  if (hasAccessToUnassignedDocs(userCtx)) {
    authorizationCtx.subjectIds.push(UNASSIGNED_KEY);
  }

  return authorizationCtx;
};

/**
 * Method to ensure users don't see private reports submitted by their boss about the user's contact
 * @param {userCtx} userCtx                    User context object
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
 * @param {AuthorizationContext} authorizationContext
 * @param {DocByReplicationKey} docByReplicationKey
 * @returns {boolean}
 */
const isAllowedDepth = (authorizationContext, docByReplicationKey) => {
  if (!usesReportDepth(authorizationContext)) {
    // no depth limitation
    return true;
  }

  if (docByReplicationKey?.type !== 'data_record') {
    // allow everything that's not a data_record through (f.e. targets)
    return true;
  }

  if (docByReplicationKey.submitter === authorizationContext.userCtx.contact_id) {
    // current user is the submitter
    return true;
  }

  const replicationKeys = Array.isArray(docByReplicationKey.key) ?
    docByReplicationKey.key : [docByReplicationKey.key];

  return replicationKeys.some(replicationKey => {
    return authorizationContext.subjectsDepth[replicationKey] <= authorizationContext.reportDepth;
  });
};

// casting everything to string to insure that comparisons are against the same type to avoid 5 > 'a' || 5 < 'a'
const prepareForSortedSearch = array => array.map(element => String(element)).sort();
const sortedIncludes = (sortedArray, element) => _.sortedIndexOf(sortedArray, String(element)) !== -1;


/**
 * Returns a list of document ids that the user is allowed to see and edit
 * @param authorizationContext
 * @returns {Promise<DocByReplicationKey[]>}
 */
const getDocsByReplicationKeyNouveau = async (authorizationContext) => {
  const allKeys = [...authorizationContext.subjectIds];
  const hits = [];

  while (allKeys.length) {
    const chunk = allKeys.splice(0, nouveau.BATCH_LIMIT);
    const response = await request.post({
      uri: `${environment.couchUrl}/_design/medic/_nouveau/docs_by_replication_key`,
      body: {
        q: `key:(${chunk.map(nouveau.escapeKeys).join(' OR ')})`,
        limit: nouveau.RESULTS_LIMIT,
      }
    });

    if (!response.hits || !response.hits.length) {
      continue;
    }

    hits.push(...response.hits.map(hit => ({
      id: hit.id,
      fields: {
        ...hit.fields,
        key: Array.isArray(hit.fields.key) ? hit.fields.key : [hit.fields.key],
      }
    })));
  }

  return hits;
};

/**
 * Returns a list of document ids that the user is allowed to see and edit
 * @param {AuthorizationContext} authorizationContext
 * @returns {Promise<string[]>}
 */
const getDocsByReplicationKey = async (authorizationContext) => {
  return getDocsByReplicationKeyNouveau(authorizationContext).then(hits => {
    // leverage binary search when looking up subjects
    const sortedSubjects = prepareForSortedSearch(authorizationContext.subjectIds);

    const docsByReplicationKey = [];

    hits.forEach((hit) => {
      const { submitter, subject } = hit.fields;
      const allowedSubmitter = () => sortedIncludes(sortedSubjects, submitter);
      if (isSensitive(authorizationContext.userCtx, subject, submitter, hit.fields.private, allowedSubmitter)) {
        return;
      }

      if (isAllowedDepth(authorizationContext, hit.fields)) {
        docsByReplicationKey.push(hit);
      }
    });

    return docsByReplicationKey;
  });
};

/**
 * Returns a list of document ids that the user is allowed to see and edit
 * @param {AuthorizationContext} authCtx
 * @param {DocByReplicationKey[]} docsByReplicationKey
 * @param {boolean} includeTasks - whether task documents should be included
 * @returns {string[]}
 */
const filterAllowedDocIds = (authCtx, docsByReplicationKey, { includeTasks = true } = {}) => {
  const validatedIds = [MEDIC_CLIENT_DDOC, getUserSettingsId(authCtx.userCtx.name)];

  if (!docsByReplicationKey || !docsByReplicationKey.length) {
    return validatedIds;
  }

  docsByReplicationKey.forEach(hit => {
    if (!includeTasks && hit.fields.type === 'task') {
      return;
    }
    validatedIds.push(hit.id);
  });

  return _.uniq(validatedIds);
};

/**
 * Evaluates medic/contacts_by_depth and medic/docs_by_replication_key view map functions over the document and
 * returns results, and whether the document is a user-settings document or not
 * @param {Object} doc - CouchDb document
 * @returns {{contactsByDepth: [], docsByReplicationKey: [], couchDbUser: boolean}}
 */
const getViewResults = (doc) => {
  return {
    contactsByDepth: viewMapUtils.getViewMapFn('medic', 'contacts_by_depth')(doc),
    docsByReplicationKey: viewMapUtils.getNouveauViewMapFn('medic', 'docs_by_replication_key')(doc),
    couchDbUser: couchDbUser(doc)
  };
};

module.exports = {
  DEFAULT_DDOCS,
  updateContext,
  getDefaultDocs,
  allowedDoc,
  getViewResults,
  getAuthorizationContext,
  getDocsByReplicationKey,
  filterAllowedDocIds,
  filterAllowedDocs,
  getScopedAuthorizationContext,
};
