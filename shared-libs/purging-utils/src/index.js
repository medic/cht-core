const crypto = require('crypto');

const sortedUniqueRoles = roles => ([...new Set(roles)].sort());
const getRoleHash = roles => crypto
  .createHash('md5')
  .update(JSON.stringify(sortedUniqueRoles(roles)), 'utf8')
  .digest('hex');

const getPurgeDbName = (mainDbName, rolesHash) => `${mainDbName}-purged-role-${rolesHash}`;

const getPurgedId = id => id && `purged:${id}`;
const getPurgedGroupId = id => id && `purged-group:${id}`;
const extractId = purgedId => purgedId && String(purgedId).replace(/^purged(?:-group)?:/, '');

module.exports = {
  getRoleHash,
  getPurgeDbName,
  getPurgedId,
  extractId,
  sortedUniqueRoles,
  getPurgedGroupId,
};
