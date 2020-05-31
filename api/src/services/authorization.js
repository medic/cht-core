const db = require('../db');
const auth = require('../auth');
const _ = require('lodash');
const config = require('../config');
const viewMapUtils = require('@medic/view-map-utils');
const tombstoneUtils = require('@medic/tombstone-utils');

const ALL_KEY = '_all'; // key in the docs_by_replication_key view for records everyone can access
const UNASSIGNED_KEY = '_unassigned'; // key in the docs_by_replication_key view for unassigned records
const MEDIC_CLIENT_DDOC = '_design/medic-client';

// fake view map, to store whether doc is a medic.user-settings doc
const couchDbUser = doc => doc.type === 'user-settings';

const getUserSettingsId = username => `org.couchdb.user:${username}`;

const getDepth = (userCtx) => {
  if (!userCtx.roles || !userCtx.roles.length) {
    return -1;
  }

  const settings = config.get('replication_depth');
  if (!settings) {
    return -1;
  }
  let depth = -1;
  userCtx.roles.forEach(function(role) {
    // find the role with the deepest depth
    const setting = settings.find(setting => setting.role === role);
    const settingDepth = setting && parseInt(setting.depth, 10);
    if (!isNaN(settingDepth) && settingDepth > depth) {
      depth = settingDepth;
    }
  });
  return depth;
};

const hasAccessToUnassignedDocs = (userCtx) => {
  return config.get('district_admins_access_unallocated_messages') &&
         auth.hasAllPermissions(userCtx, 'can_view_unallocated_data_records');
};

const include = (array, ...values) => {
  let newValues = 0;
  values.forEach(value => value && array.indexOf(value) === -1 && array.push(value) && newValues++);
  return newValues;
};

const exclude = (array, ...values) => {
  return array.filter(value => values.indexOf(value) === -1);
};

// Updates authorizationContext.subjectIds, including or excluding tested contact `subjectId` and `docId`
// @param   {Boolean} allowed - whether subjects should be included or excluded
// @param   {Array}   authorizationContext.subjectIds - allowed subjectIds.
// @param   {Array}   viewValues.contactsByDepth - results of `medic/contacts_by_depth` view against doc
// @returns {Boolean} whether new subjectIds were added to authorizationContext
const updateContext = (allowed, authorizationContext, { contactsByDepth }) => {
  if (contactsByDepth && contactsByDepth.length) {
    //first element of `contactsByDepth` contains both `subjectId` and `docID`
    const [[[ docId ], subjectId ]] = contactsByDepth;

    if (allowed) {
      return !!include(authorizationContext.subjectIds, subjectId, docId);
    }

    authorizationContext.subjectIds = exclude(authorizationContext.subjectIds, subjectId, docId );
    return false;
  }

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
  if ([MEDIC_CLIENT_DDOC, getUserSettingsId(authorizationContext.userCtx.name)].indexOf(docId) !== -1) {
    return true;
  }

  if (!replicationKeys || !replicationKeys.length) {
    return false;
  }

  if (replicationKeys[0][0] === ALL_KEY) {
    return true;
  }

  if (contactsByDepth && contactsByDepth.length) {
    //it's a contact
    return allowedContact(contactsByDepth, authorizationContext.contactsByDepthKeys);
  }

  //it's a report, task or target
  return replicationKeys.some(replicationKey => {
    const [ subjectId, { submitter: submitterId } ] = replicationKey;
    const allowedSubmitter = submitterId && authorizationContext.subjectIds.indexOf(submitterId) !== -1;
    if (!subjectId && allowedSubmitter) {
      return true;
    }
    const allowedSubject = subjectId && authorizationContext.subjectIds.indexOf(subjectId) !== -1;
    return allowedSubject && !isSensitive(authorizationContext.userCtx, subjectId, submitterId, allowedSubmitter);
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
  if (depth >= 0) {
    for (let i = 0; i <= depth; i++) {
      keys.push([ userCtx.facility_id, i ]);
    }
  } else {
    // no configured depth limit
    keys.push([ userCtx.facility_id ]);
  }

  return keys;
};

// checks whether there is at least one common contactsByDepthKey
const allowedContact = (contactsByDepth, userContactsByDepthKeys) => {
  const viewResultKeys = contactsByDepth.map(result => result[0]);
  return viewResultKeys.some(viewResult => userContactsByDepthKeys.some(generated => _.isEqual(viewResult, generated)));
};

const getContextObject = (userCtx) => ({
  userCtx,
  contactsByDepthKeys: getContactsByDepthKeys(userCtx, module.exports.getDepth(userCtx)),
  subjectIds: [ ALL_KEY, getUserSettingsId(userCtx.name) ]
});

const getAuthorizationContext = (userCtx) => {
  const authorizationCtx = getContextObject(userCtx);

  return db.medic.query('medic/contacts_by_depth', { keys: authorizationCtx.contactsByDepthKeys }).then(results => {
    results.rows.forEach(row => {
      if (tombstoneUtils.isTombstoneId(row.id)) {
        authorizationCtx.subjectIds.push(tombstoneUtils.extractStub(row.id).id);
      } else {
        authorizationCtx.subjectIds.push(row.id);
      }
      if (row.value) {
        authorizationCtx.subjectIds.push(row.value);
      }
    });

    authorizationCtx.subjectIds = _.uniq(authorizationCtx.subjectIds);
    if (hasAccessToUnassignedDocs(userCtx)) {
      authorizationCtx.subjectIds.push(UNASSIGNED_KEY);
    }
    return authorizationCtx;
  });
};

const getReplicationKeys = (viewResults) => {
  const replicationKeys = [];
  if (!viewResults || !viewResults.replicationKeys) {
    return replicationKeys;
  }

  viewResults.replicationKeys.forEach(([ subjectId, { submitter: submitterId } ]) => {
    replicationKeys.push(subjectId);
    if (submitterId) {
      replicationKeys.push(submitterId);
    }
  });

  return replicationKeys;
};

const getAllTombstones = (ids) => {
  // collect all tombstones for the selected contacts
  const tombstonePromises = ids
    .filter(id => !tombstoneUtils.isTombstoneId(id))
    .map(id => {
      const opts = {
        include_docs: true,
        start_key: tombstoneUtils.getTombstonePrefix(id),
        end_key: `${tombstoneUtils.getTombstonePrefix(id)}\ufff0`,
      };
      return db.medic.allDocs(opts);
    });

  return tombstonePromises;
};

// replication keys are either contact shortcodes (`patient_id` or `place_id`) or doc ids
// returns a list of corresponding contact docs
const findContactsByReplicationKeys = (replicationKeys) => {
  replicationKeys = _.without(replicationKeys, UNASSIGNED_KEY);

  if (!replicationKeys || !replicationKeys.length) {
    return Promise.resolve([]);
  }

  replicationKeys = _.uniq(replicationKeys);
  const keys = [];
  replicationKeys.forEach(id => keys.push(['shortcode', id], ['tombstone-shortcode', id]));

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

      return Promise.all([
        db.medic.allDocs({ keys: docIds, include_docs: true }),
        ...getAllTombstones(docIds),
      ]);
    })
    .then(results => {
      const contacts = results.reduce((acc, result) => {
        if (!result || !result.rows || !result.rows.length) {
          return acc;
        }

        acc.push(...result.rows.map(row => row.doc).filter(doc => doc));
        return acc;
      }, []);
      return contacts;
    });
};

const getContactShortcode = (viewResults) => viewResults &&
                                             viewResults.contactsByDepth &&
                                             viewResults.contactsByDepth[0] &&
                                             viewResults.contactsByDepth[0][1];

const getContactUuid = (viewResults) => viewResults &&
                                        viewResults.contactsByDepth &&
                                        viewResults.contactsByDepth[0] &&
                                        viewResults.contactsByDepth[0][0] &&
                                        viewResults.contactsByDepth[0][0][0];

// in case we want to determine whether a user has access to a small set of docs (for example, during a GET attachment
// request), instead of querying `medic/contacts_by_depth` to get all allowed subjectIds, we run the view queries
// over the provided docs, get all contacts that the docs emit for in `medic/docs_by_replication_key` and create a
// reduced set of relevant allowed subject ids.
const getScopedAuthorizationContext = (userCtx, scopeDocsCtx = []) => {
  const authorizationCtx = getContextObject(userCtx);

  scopeDocsCtx = scopeDocsCtx.filter(docCtx => docCtx && docCtx.doc);
  if (!scopeDocsCtx.length) {
    return Promise.resolve(authorizationCtx);
  }

  // collect all values that the docs would emit in `medic/docs_by_replication_key`
  const replicationKeys = [];
  scopeDocsCtx.forEach(docCtx => {
    const viewResults = docCtx.viewResults || getViewResults(docCtx.doc);
    replicationKeys.push(...getReplicationKeys(viewResults));
  });

  return findContactsByReplicationKeys(replicationKeys).then(contacts => {
    // we simulate a `medic/contacts_by_depth` filter over the list contacts
    contacts.forEach(contact => {
      if (!contact) {
        return;
      }

      const viewResults = getViewResults(contact);
      if (!allowedDoc(contact._id, authorizationCtx, viewResults)) {
        return;
      }

      authorizationCtx.subjectIds.push(getContactUuid(viewResults));
      const shortcode = getContactShortcode(viewResults);
      if (shortcode) {
        authorizationCtx.subjectIds.push(shortcode);
      }
    });

    authorizationCtx.subjectIds = _.uniq(authorizationCtx.subjectIds);
    if (hasAccessToUnassignedDocs(userCtx)) {
      authorizationCtx.subjectIds.push(UNASSIGNED_KEY);
    }

    return authorizationCtx;
  });
};


// Method to ensure users don't see reports submitted by their boss about the user
const isSensitive = function(userCtx, subject, submitter, allowedSubmitter) {
  if (!subject || !submitter) {
    return false;
  }

  if (subject !== userCtx.contact_id && subject !== userCtx.facility_id) {
    return false;
  }

  return !allowedSubmitter;
};

const getAllowedDocIds = (feed, { includeTombstones = true } = {}) => {
  return db.medic.query('medic/docs_by_replication_key', { keys: feed.subjectIds }).then(results => {
    const validatedIds = [MEDIC_CLIENT_DDOC, getUserSettingsId(feed.userCtx.name)];
    const tombstoneIds = [];

    results.rows.forEach(row => {
      if (isSensitive(feed.userCtx, row.key, row.value.submitter, feed.subjectIds.includes(row.value.submitter))) {
        return;
      }

      if (tombstoneUtils.isTombstoneId(row.id)) {
        return includeTombstones && tombstoneIds.push(row.id);
      }

      validatedIds.push(row.id);
    });

    // only include tombstones if the winning rev of the document is deleted
    // if a doc appears in the view results, it means that the winning rev is not deleted
    tombstoneIds.forEach(tombstoneId => {
      const docId = tombstoneUtils.extractStub(tombstoneId).id;
      if (!validatedIds.includes(docId)) {
        validatedIds.push(tombstoneId);
      }
    });

    return _.uniq(validatedIds);
  });
};

const excludeTombstoneIds = (docIds) => {
  return docIds.filter(docId => !tombstoneUtils.isTombstoneId(docId));
};

const convertTombstoneId = docId => tombstoneUtils.isTombstoneId(docId) ? tombstoneUtils.extractStub(docId).id : docId;
const convertTombstoneIds = docIds => docIds.map(convertTombstoneId);

const getViewResults = (doc) => {
  return {
    contactsByDepth: viewMapUtils.getViewMapFn('medic', 'contacts_by_depth')(doc),
    replicationKeys: viewMapUtils.getViewMapFn('medic', 'docs_by_replication_key')(doc),
    couchDbUser: couchDbUser(doc)
  };
};

const isAuthChange = (docId, userCtx, { couchDbUser }) => {
  return docId === 'org.couchdb.user:' + userCtx.name && !!couchDbUser;
};

module.exports = {
  isAuthChange: isAuthChange,
  allowedDoc: allowedDoc,
  getDepth: getDepth,
  getViewResults: getViewResults,
  getAuthorizationContext: getAuthorizationContext,
  getAllowedDocIds: getAllowedDocIds,
  excludeTombstoneIds: excludeTombstoneIds,
  convertTombstoneIds: convertTombstoneIds,
  alwaysAllowCreate: alwaysAllowCreate,
  updateContext: updateContext,
  filterAllowedDocs: filterAllowedDocs,
  isDeleteStub: tombstoneUtils._isDeleteStub,
  generateTombstoneId: tombstoneUtils.generateTombstoneId,
  convertTombstoneId: convertTombstoneId,
  getScopedAuthorizationContext: getScopedAuthorizationContext,
};
