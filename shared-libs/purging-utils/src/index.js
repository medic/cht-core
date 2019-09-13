const crypto = require('crypto');

const sortedUniqueRoles = roles => ([...new Set(roles.sort())]);
const getRoleHash = roles => crypto
  .createHash('md5')
  .update(JSON.stringify(sortedUniqueRoles(roles)), 'utf8')
  .digest('hex');

const getPurgeDbName = (mainDbName, rolesHash) => `${mainDbName}-purged-role-${rolesHash}`;

const isOffline = (configured, roles) => {
  if (!configured) {
    return false;
  }

  const configuredRole = roles.some(role => configured[role]);
  return !configuredRole || roles.some(role => configured[role] && configured[role].offline);
};

const getPurgedId = id => id && `purged:${id}`;
const extractId = purgedId => purgedId && String(purgedId).replace(/^purged:/, '');

module.exports = {
  getRoleHash,
  isOffline,
  getPurgeDbName,
  getPurgedId,
  extractId,
  sortedUniqueRoles,
};
