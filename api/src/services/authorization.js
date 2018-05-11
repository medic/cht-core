let db = require('../db-pouch'),
    auth = require('../auth'),
    _ = require('underscore'),
    config = require('../config'),
    viewMapUtils = require('@shared-libs/view-map-utils'),
    tombstoneUtils = require('@shared-libs/tombstone-utils')(db.medic, Promise);

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

const exclude = (array, ...values) => {
  if (!Array.isArray(array)) {
    return;
  }

  let i = 0;
  while (i < array.length) {
    if (values.indexOf(array[i]) !== -1) {
      array.splice(i, 1);
    } else {
      i++;
    }
  }
};

const include = (array, ...values) => {
  if (!Array.isArray(array)) {
    return;
  }
  values.forEach(value => array.indexOf(value) === -1 && array.push(value));
};

const allowedDoc = (doc, userInfo, viewResults) => {
  const { userCtx, subjectIds, depth } = userInfo;
  const { replicationKey, contactsByDepth } = viewResults;

  if (!replicationKey) {
    return false;
  }

  if (replicationKey[0] === ALL_KEY) {
    return true;
  }

  if (contactsByDepth && contactsByDepth.length) {
    const subjectId = contactsByDepth[0][1];
    //it's a contact
    if (allowedContact(contactsByDepth, userCtx, depth)) {
      include(subjectIds, subjectId, doc._id);
      return true;
    }

    exclude(subjectIds, subjectId, doc._id );
    return false;
  }

  //it's a report
  const [ subjectId, { submitter: submitterId } ] = replicationKey;
  const allowedSubject = subjectId && subjectIds.indexOf(subjectId) !== -1;
  const allowedSubmitter = submitterId && subjectIds.indexOf(submitterId) !== -1;
  const sensitive = isSensitive(userCtx, subjectId, submitterId, allowedSubmitter);

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
  const existentKeys = contactsByDepth.map(result => result[0]);

  return existentKeys.some(i => generatedKeys.some(j => _.isEqual(i, j)));
};

const getSubjectIds = (userCtx, depth) => {
  depth = depth || module.exports.getDepth(userCtx);
  const keys = getContactsByDepthKeys(userCtx, depth);

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
  return {
    contactsByDepth: viewMapUtils.getViewMapFn('contacts_by_depth', true)(doc),
    replicationKey: viewMapUtils.getViewMapFn('docs_by_replication_key')(doc)
  };
};

const allowedChange = (feed, changeObj) => {
  const userOpts = _.pick(feed, 'userCtx', 'subjectIds', 'depth');
  return allowedDoc(changeObj.change.doc, userOpts, changeObj.authData);
};

module.exports = {
  allowedChange: allowedChange,
  allowedDoc: allowedDoc,
  getDepth: getDepth,
  getViewResults: getViewResults,
  getSubjectIds: getSubjectIds,
  getValidatedDocIds: getValidatedDocIds,
};

// used for testing
if (process.env.UNIT_TEST_ENV) {
  _.extend(module.exports, {
    _isAllowedContact: allowedContact,
    _isSensitive: isSensitive,
    _tombstoneUtils: tombstoneUtils,
    _viewMapUtils: viewMapUtils
  });
}
