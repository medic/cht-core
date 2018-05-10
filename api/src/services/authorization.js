let db = require('../db-pouch'),
    auth = require('../auth'),
    _ = require('underscore'),
    config = require('../config'),
    viewMapUtils = require('@shared-libs/view-map-utils'),
    tombstoneUtils = require('@shared-libs/tombstone-utils')(db.medic, Promise);

const ALL_KEY = '_all', // key in the docs_by_replication_key view for records everyone can access
      UNASSIGNED_KEY = '_unassigned'; // key in the docs_by_replication_key view for unassigned records

let contactsByDepthFn,
    docsByReplicationKeyFn;

const initViewFunctions = () => {
  contactsByDepthFn = viewMapUtils.getViewMapFn(config.get(), 'contacts_by_depth');
  docsByReplicationKeyFn = viewMapUtils.getViewMapFn(config.get(), 'docs_by_replication_key');
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

const exclude = (array, value) => {
  if (_.isArray(array)) {
    array = _.without(array, value);
  }
};

const include = (array, value) => {
  if (_.isArray(array) && _.indexOf(array, value) === -1) {
    array.push(value);
  }
};

const allowedDoc = (doc, userInfo, viewResults) => {
  const { userCtx, validatedIds, subjectIds, depth } = userInfo;
  const { replicationKey, contactsByDepth } = viewResults;

  if (!replicationKey) {
    return false;
  }

  if (replicationKey[0] === ALL_KEY) {
    return true;
  }

  if (contactsByDepth) {
    //it's a contact
    if (allowedContact(doc, userCtx, depth)) {
      include(subjectIds, contactsByDepth[1]);
      include(validatedIds, doc._id);
      return true;
    }

    exclude(subjectIds, contactsByDepth[1]);
    exclude(validatedIds, doc._id);
    return false;
  }

  //it's a report
  const [ subjectId, { submitter: submitterId } ] = replicationKey;
  const allowedSubject = subjectId && subjectIds.indexOf(subjectId) !== -1;
  const allowedSubmitter = submitterId && validatedIds.indexOf(submitterId) !== -1;
  const sensitive = isSensitive(userCtx, subjectId, submitterId, allowedSubmitter);

  if ((!subjectId && allowedSubmitter) || (allowedSubject && !sensitive)) {
    include(validatedIds, doc._id);
    return true;
  }

  exclude(validatedIds, doc._id);
  return false;
};

const allowedContact = (contact, user, maxDepth, currentDepth) => {
  currentDepth = currentDepth || 0;
  if (maxDepth >= 0 && currentDepth > maxDepth) {
    return false;
  }

  if (!contact || !contact._id) {
    return false;
  }

  if (contact._id === user.facility_id) {
    return true;
  }

  return allowedContact(contact.parent, user, maxDepth, currentDepth + 1);
};

const getSubjectIds = (userCtx) => {
  const keys = [];
  const depth = module.exports.getDepth(userCtx);

  if (depth >= 0) {
    for (let i = 0; i <= depth; i++) {
      keys.push([ userCtx.facility_id, i ]);
    }
  } else {
    // no configured depth limit
    keys.push([ userCtx.facility_id ]);
  }

  return Promise
    .all([
      db.medic.query('medic/contacts_by_depth', { keys: keys }),
      db.medic.query('medic-tombstone/contacts_by_depth', { keys: keys }),
    ])
    .then(resultSets => {
      const subjectIds = [];

      resultSets.forEach((resultSet, tombstone) => {
        resultSet.rows.forEach(row => {
          subjectIds.push( tombstone ? tombstoneUtils.extractDocId(row.id) : row.id );
          if (row.value) {
            subjectIds.push(row.value);
          }
        });
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
  return Promise
    .all([
      db.medic.query('medic/docs_by_replication_key', { keys: subjectIds }),
      db.medic.query('medic-tombstone/docs_by_replication_key', { keys: subjectIds })
    ])
    .then(resultSets => {
      const validatedIds = ['_design/medic-client', 'org.couchdb.user:' + userCtx.name];

      resultSets.forEach(resultSet => {
        resultSet.rows.forEach(row => {
          if (!isSensitive(userCtx, row.key, row.value.submitter, subjectIds.indexOf(row.value.submitter) !== -1)) {
            validatedIds.push(row.id);
          }
        });
      });

      return validatedIds;
    });
};

const getViewResults = (doc) => {
  if (!docsByReplicationKeyFn || !contactsByDepthFn) {
    module.exports.initViewFunctions();
  }
  return {
    replicationKey: docsByReplicationKeyFn(doc),
    contactsByDepth: contactsByDepthFn(doc)
  };
};

const allowedChange = (feed, changeObj) => {
  const userOpts = _.pick(feed, 'userCtx', 'subjectIds', 'validatedIds', 'depth');
  return module.exports.allowedDoc(changeObj.change.doc, userOpts, changeObj.authData);
};

module.exports = {
  allowedChange: allowedChange,
  allowedDoc: allowedDoc,
  getDepth: getDepth,
  getViewResults: getViewResults,
  initViewFunctions: initViewFunctions,
  getSubjectIds: getSubjectIds,
  getValidatedDocIds: getValidatedDocIds,

  //exposed for testing purposes
  _isAllowedContact: allowedContact,
  _isSensitive: isSensitive,
  _tombstoneUtils: tombstoneUtils,
  _viewMapUtils: viewMapUtils
};
