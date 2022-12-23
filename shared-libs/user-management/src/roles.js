const _ = require('lodash');
const config = require('./libs/config');

/**
 * this role is used in webapp bootstrap and session service to mainly determine whether the user should
 * replicate or not, without requiring access to server settings.
 */
const ONLINE_ROLE = 'mm-online';
const DB_ADMIN_ROLE = '_admin';

const hasRole = (userCtx, role) => {
  return _.includes(userCtx && userCtx.roles, role);
};

const isDbAdmin = userCtx => hasRole(userCtx, DB_ADMIN_ROLE);

const hasOnlineRole = roles => {
  if (!Array.isArray(roles) || !roles.length) {
    return false;
  }

  const onlineRoles = [
    DB_ADMIN_ROLE,
    ONLINE_ROLE,
    'national_admin', // kept for backwards compatibility
  ];
  return roles.some(role => onlineRoles.includes(role));
};

module.exports = {
  hasOnlineRole,
  isOnlineOnly: userCtx => {
    return userCtx && module.exports.hasOnlineRole(userCtx.roles);
  },
  isOffline: roles => {
    const configured = config.get('roles') || {};
    const configuredRole = roles.some(role => configured[role]);
    return !isDbAdmin({ roles }) &&
      (!configuredRole || roles.some(role => configured[role] && configured[role].offline));
  },
  isDbAdmin,
  ONLINE_ROLE
};
