const crypto = require('crypto');

const ONLINE_ROLE = 'mm-online';
const DB_ADMIN_ROLE = '_admin';

const sortedUniqueRoles = roles => ([...new Set(roles)].sort());
const getRoleHash = roles => crypto
  .createHash('md5')
  .update(JSON.stringify(sortedUniqueRoles(roles)), 'utf8')
  .digest('hex');

const getPurgeDbName = (mainDbName, rolesHash) => `${mainDbName}-purged-role-${rolesHash}`;

const isOnlineOnly = (roles) => roles.some(role => [ONLINE_ROLE, DB_ADMIN_ROLE].includes(role));

// todo consider moving this somewhere else, it's a duplicate of a function that atm exists in the users controller
// in api but is moved to api auth in a not yet merged PR
// (https://github.com/medic/medic/pull/5793/files#diff-2506ee9bb8932374adc99dfab80dda0cR65)
// and now is needed in Sentinel.
const isOffline = (configured, roles) => {
  if (!configured || isOnlineOnly(roles)) {
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
