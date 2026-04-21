const crypto = require('node:crypto');
const config = require('../config');

const DEFAULT_SHARED_DOC_TYPES = [
  'person',
  'clinic',
  'health_center',
  'district_hospital',
  'data_record',
  'task',
  'target',
];

/**
 * Generate a scope manifest for a user based on their settings.
 * The manifest defines what documents fall within a user's P2P sync scope.
 *
 * @param {Object} userSettings - User settings doc from CouchDB
 * @param {string} userSettings.facility_id - User's facility UUID
 * @param {string[]} userSettings.roles - User's roles
 * @returns {Object} ScopeManifest
 */
const getMaxReplicationDepth = (userRoles) => {
  const depthSettings = config.get('replication_depth') || [];
  return depthSettings
    .filter(setting => userRoles.includes(setting.role))
    .map(setting => Number.parseInt(setting.depth, 10))
    .filter(depth => !Number.isNaN(depth))
    .reduce((max, depth) => Math.max(max, depth), 0);
};

const generateManifest = (userSettings) => {
  if (!userSettings?.facility_id) {
    throw new Error('User settings must include facility_id');
  }

  const userRoles = userSettings.roles || [];
  const replicationDepth = getMaxReplicationDepth(userRoles);

  return {
    facility_subtree_root: Array.isArray(userSettings.facility_id)
      ? userSettings.facility_id[0]
      : userSettings.facility_id,
    replication_depth: replicationDepth,
    shared_doc_types: DEFAULT_SHARED_DOC_TYPES,
    scope_version: crypto.createHash('sha256')
      .update(JSON.stringify({
        facility: userSettings.facility_id,
        depth: replicationDepth,
        types: DEFAULT_SHARED_DOC_TYPES,
      }))
      .digest('hex')
      .slice(0, 16),
  };
};

module.exports = {
  generateManifest,
};
