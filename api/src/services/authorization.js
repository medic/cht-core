const db = require('../db-pouch'),
      auth = require('../auth'),
      _ = require('underscore'),
      config = require('../config'),
      viewMapUtils = require('@shared-libs/view-map-utils'),
      tombstoneUtils = require('@shared-libs/tombstone-utils');

const ALL_KEY = '_all', // key in the docs_by_replication_key view for records everyone can access
      UNASSIGNED_KEY = '_unassigned'; // key in the docs_by_replication_key view for unassigned records

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
  values.forEach(value => array.indexOf(value) === -1 && array.push(value));
  return array;
};

const exclude = (array, ...values) => {
  return array.filter(value => values.indexOf(value) === -1);
};

// Returns whether an authenticated user has access to a document
// @param {Object} doc - CouchDB document
// @param {Object} authData.userCtx - authenticated user information
// @param {number} authData.depth - allowed maximum replication depth
// @param {Array} authData.subjectIds - allowed subjectIds. Is updated when this function is called against a contact.
// @param {Object} viewValues.replicationKey - result of `medic/docs_by_replication_key` view against doc
// @param {Array} viewValues.contactsByDepth - results of `medic/contacts_by_depth` view against doc
const allowedDoc = (doc, authData, { replicationKey, contactsByDepth }) => {
  if (['_design/medic-client', 'org.couchdb.user:' + authData.userCtx.name].indexOf(doc._id) !== -1) {
    return true;
  }

  if (!replicationKey) {
    return false;
  }

  if (replicationKey[0] === ALL_KEY) {
    return true;
  }

  if (contactsByDepth && contactsByDepth.length) {
    //it's a contact
    const subjectId = contactsByDepth[0][1];
    if (allowedContact(contactsByDepth, authData.userCtx, authData.depth)) {
      authData.subjectIds = include(authData.subjectIds, subjectId, doc._id);
      return true;
    }

    authData.subjectIds = exclude(authData.subjectIds, subjectId, doc._id );
    return false;
  }

  //it's a report
  const [ subjectId, { submitter: submitterId } ] = replicationKey,
        allowedSubject = subjectId && authData.subjectIds.indexOf(subjectId) !== -1,
        allowedSubmitter = submitterId && authData.subjectIds.indexOf(submitterId) !== -1,
        sensitive = isSensitive(authData.userCtx, subjectId, submitterId, allowedSubmitter);

  if ((!subjectId && allowedSubmitter) || (allowedSubject && !sensitive)) {
    return true;
  }

  return false;
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

const allowedContact = (contactsByDepth, userCtx, depth) => {
  const generatedKeys = getContactsByDepthKeys(userCtx, depth);
  const viewResultKeys = contactsByDepth.map(result => result[0]);

  return viewResultKeys.some(viewResult => generatedKeys.some(generated => _.isEqual(viewResult, generated)));
};

const getSubjectIds = (userCtx, depth) => {
  depth = depth || module.exports.getDepth(userCtx);
  const keys = getContactsByDepthKeys(userCtx, depth);

  return db.medic.query('medic/contacts_by_depth', { keys: keys }).then(results => {
    const subjectIds = [];
    results.rows.forEach(row => {
      if (tombstoneUtils.isTombstoneId(row.id)) {
        subjectIds.push(tombstoneUtils.extractStub(row.id).id);
      } else {
        subjectIds.push(row.id);
      }
      if (row.value) {
        subjectIds.push(row.value);
      }
    });

    subjectIds.push(ALL_KEY);
    if (hasAccessToUnassignedDocs(userCtx)) {
      subjectIds.push(UNASSIGNED_KEY);
    }

    return subjectIds;
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

const getValidatedDocIds = (subjectIds, userCtx) => {
  return db.medic.query('medic/docs_by_replication_key', { keys: subjectIds }).then(results => {
    const validatedIds = ['_design/medic-client', 'org.couchdb.user:' + userCtx.name];
    results.rows.forEach(row => {
      if (!isSensitive(userCtx, row.key, row.value.submitter, subjectIds.indexOf(row.value.submitter) !== -1)) {
        validatedIds.push(row.id);
      }
    });

    return validatedIds;
  });
};

const getViewResults = (doc) => {
  return {
    contactsByDepth: viewMapUtils.getViewMapFn('medic', 'contacts_by_depth', true)(doc),
    replicationKey: viewMapUtils.getViewMapFn('medic', 'docs_by_replication_key')(doc)
  };
};

const isAuthChange = (doc, userCtx) => {
  if (doc._id !== 'org.couchdb.user:' + userCtx.name) {
    return false;
  }

  if (userCtx.contact_id !== doc.contact_id ||
      userCtx.facility_id !== doc.facility_id) {
    return true;
  }

  return false;
};

module.exports = {
  isAuthChange: isAuthChange,
  allowedDoc: allowedDoc,
  getDepth: getDepth,
  getViewResults: getViewResults,
  getSubjectIds: getSubjectIds,
  getValidatedDocIds: getValidatedDocIds,
};
