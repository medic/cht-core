const config = require('./libs/config');
const { USER_ROLES, DB_ADMIN_ROLES } = require('@medic/constants');

/**
 * this role is used in webapp bootstrap and session service to mainly determine whether the user should
 * replicate or not, without requiring access to server settings.
 */
const ONLINE_ROLE = USER_ROLES.ONLINE;

const hasRole = (userCtx, role) => {
  return userCtx?.roles?.includes(role);
};

const isDbAdmin = userCtx => DB_ADMIN_ROLES.some(adminRole => hasRole(userCtx, adminRole));

const hasOnlineRole = roles => {
  if (!Array.isArray(roles) || !roles.length) {
    return false;
  }

  const onlineRoles = [
    ...DB_ADMIN_ROLES,
    ONLINE_ROLE,
  ];
  return roles.some(role => onlineRoles.includes(role));
};

module.exports = {
  hasOnlineRole,
  isOnlineOnly: userCtx => {
    return userCtx && module.exports.hasOnlineRole(userCtx.roles);
  },
  isOffline: roles => {
    if (!roles.length) {
      return false;
    }

    const configured = config.get('roles') || {};
    const configuredRoles = roles.filter(role => configured[role]);

    return !module.exports.isOnlineOnly({ roles }) &&
           (!configuredRoles.length || configuredRoles?.some(role => configured[role]?.offline));
  },
  isDbAdmin,
  ONLINE_ROLE,
};
