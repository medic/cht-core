const config = require('./libs/config');
const { USER_ROLES } = require('@medic/constants');

/**
 * this role is used in webapp bootstrap and session service to mainly determine whether the user should
 * replicate or not, without requiring access to server settings.
 */
const ONLINE_ROLE = USER_ROLES.ONLINE;
const DB_ADMIN_ROLES = ['admin', '_admin'];

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

const hasPermission = (roles, permission) => {
  const rolesWithPermission = config.get('permissions')[permission];
  if (!rolesWithPermission) {
    return false;
  }
  return rolesWithPermission.some(role => roles.includes(role));
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

  hasAllPermissions: (roles, permissions) => {
    if (module.exports.isDbAdmin({ roles })) {
      return true;
    }

    if (!permissions || !roles) {
      return false;
    }

    if (!Array.isArray(permissions)) {
      permissions = [ permissions ];
    }

    return permissions.every(permission => hasPermission(roles, permission));
  }
};
