const db = require('../db'),
      auth = require('../auth'),
      _ = require('lodash'),
      config = require('../config'),
      viewMapUtils = require('@medic/view-map-utils'),
      tombstoneUtils = require('@medic/tombstone-utils');

const ALL_KEY = '_all', // key in the docs_by_replication_key view for records everyone can access
      UNASSIGNED_KEY = '_unassigned'; // key in the docs_by_replication_key view for unassigned records

// fake view map, to store whether doc is a medic.user-settings doc
const couchDbUser = doc => doc.type === 'user-settings';

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
  if (['_design/medic-client', 'org.couchdb.user:' + authorizationContext.userCtx.name].indexOf(docId) !== -1) {
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

  //it's a report
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

const getAuthorizationContext = (userCtx) => {
  const authorizationCtx = {
    userCtx,
    contactsByDepthKeys: getContactsByDepthKeys(userCtx, module.exports.getDepth(userCtx)),
    subjectIds: []
  };

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
    authorizationCtx.subjectIds.push(ALL_KEY);
    if (hasAccessToUnassignedDocs(userCtx)) {
      authorizationCtx.subjectIds.push(UNASSIGNED_KEY);
    }
    return authorizationCtx;
  });
};

/**
 * Method to ensure users don't see reports submitted by their boss about the user
 */
const isSensitive = function(userCtx, subject, submitter, allowedSubmitter) {
  if (!subject || !submitter) {
    return false;
  }

  if (subject !== userCtx.contact_id && subject !== userCtx.facility_id) {
    return false;
  }

  return !allowedSubmitter;
};

const getAllowedDocIds = (feed) => {
  return db.medic.query('medic/docs_by_replication_key', { keys: feed.subjectIds }).then(results => {
    const validatedIds = ['_design/medic-client', 'org.couchdb.user:' + feed.userCtx.name],
          tombstoneIds = [];

    results.rows.forEach(row => {
      if (isSensitive(feed.userCtx, row.key, row.value.submitter, feed.subjectIds.indexOf(row.value.submitter) !== -1)) {
        return;
      }

      if (tombstoneUtils.isTombstoneId(row.id)) {
        tombstoneIds.push(row.id);
        return;
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

const convertTombstoneIds = (docIds) => {
  return docIds.map(docId => tombstoneUtils.isTombstoneId(docId) ? tombstoneUtils.extractStub(docId).id : docId);
};

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
  isDeleteStub: tombstoneUtils._isDeleteStub
};
