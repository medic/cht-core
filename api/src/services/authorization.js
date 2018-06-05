const db = require('../db-pouch'),
      auth = require('../auth'),
      _ = require('underscore'),
      config = require('../config'),
      viewMapUtils = require('@shared-libs/view-map-utils'),
      tombstoneUtils = require('@shared-libs/tombstone-utils');

const ALL_KEY = '_all', // key in the docs_by_replication_key view for records everyone can access
      UNASSIGNED_KEY = '_unassigned'; // key in the docs_by_replication_key view for unassigned records

// fake view map, to store only relevant information about user changes
const couchDbUser = (doc) => {
  if (doc.type === 'user-settings') {
    return _.pick(doc, 'contact_id', 'facility_id');
  }
  return false;
};

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
    const setting = _.findWhere(settings, { role: role });
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
  values.forEach(value => array.indexOf(value) === -1 && array.push(value) && newValues++);
  return newValues;
};

const exclude = (array, ...values) => {
  return array.filter(value => values.indexOf(value) === -1);
};

// Returns whether an authenticated user has access to a document
// @param {Object}  docId - CouchDB document ID
// @param {Object}  feed.userCtx - authenticated user information
// @param {Array}   feed.contactsByDepthKeys - list containing user's generated contactsByDepthKeys
// @param {Array}   feed.subjectIds - allowed subjectIds. Is updated when this function is called against a contact.
// @param {Object}  viewValues.replicationKey - result of `medic/docs_by_replication_key` view against doc
// @param {Array}   viewValues.contactsByDepth - results of `medic/contacts_by_depth` view against doc
// @returns {(boolean|Object)} Object containing number of new subjectIds if doc is an allowed contact, bool otherwise
const allowedDoc = (docId, feed, { replicationKeys, contactsByDepth }) => {
  if (['_design/medic-client', 'org.couchdb.user:' + feed.userCtx.name].indexOf(docId) !== -1) {
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
    const subjectId = contactsByDepth[0][1];
    if (allowedContact(contactsByDepth, feed.contactsByDepthKeys)) {
      const newSubjects = include(feed.subjectIds, subjectId, docId);
      return { newSubjects };
    }

    feed.subjectIds = exclude(feed.subjectIds, subjectId, docId );
    return false;
  }

  //it's a report
  return replicationKeys.some(replicationKey => {
    const [ subjectId, { submitter: submitterId } ] = replicationKey;
    const allowedSubmitter = submitterId && feed.subjectIds.indexOf(submitterId) !== -1;
    if (!subjectId && allowedSubmitter) {
      return true;
    }
    const allowedSubject = subjectId && feed.subjectIds.indexOf(subjectId) !== -1;
    return allowedSubject && !isSensitive(feed.userCtx, subjectId, submitterId, allowedSubmitter);
  });
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

const getUserAuthorizationData = (userCtx) => {
  const authData = {
    contactsByDepthKeys: getContactsByDepthKeys(userCtx, module.exports.getDepth(userCtx)),
    subjectIds: []
  };

  return db.medic.query('medic/contacts_by_depth', { keys: authData.contactsByDepthKeys }).then(results => {
    results.rows.forEach(row => {
      if (tombstoneUtils.isTombstoneId(row.id)) {
        authData.subjectIds.push(tombstoneUtils.extractStub(row.id).id);
      } else {
        authData.subjectIds.push(row.id);
      }
      if (row.value) {
        authData.subjectIds.push(row.value);
      }
    });

    authData.subjectIds.push(ALL_KEY);
    if (hasAccessToUnassignedDocs(userCtx)) {
      authData.subjectIds.push(UNASSIGNED_KEY);
    }
    return authData;
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
    const validatedIds = ['_design/medic-client', 'org.couchdb.user:' + feed.userCtx.name];
    results.rows.forEach(row => {
      if (!isSensitive(feed.userCtx, row.key, row.value.submitter, feed.subjectIds.indexOf(row.value.submitter) !== -1)) {
        validatedIds.push(row.id);
      }
    });

    return validatedIds;
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
  if (docId !== 'org.couchdb.user:' + userCtx.name || !couchDbUser) {
    return false;
  }

  if (userCtx.contact_id !== couchDbUser.contact_id ||
      userCtx.facility_id !== couchDbUser.facility_id) {
    return true;
  }

  return false;
};

module.exports = {
  isAuthChange: isAuthChange,
  allowedDoc: allowedDoc,
  getDepth: getDepth,
  getViewResults: getViewResults,
  getUserAuthorizationData: getUserAuthorizationData,
  getAllowedDocIds: getAllowedDocIds,
  excludeTombstoneIds: excludeTombstoneIds,
  convertTombstoneIds: convertTombstoneIds
};
