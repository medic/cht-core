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
  ];
  return roles.some(role => onlineRoles.includes(role));
};

const hasPermission = (roles, permission) => {
  const rolesWithPermission = config.get('permissions')[permission];
  if (!rolesWithPermission) {
    return false;
  }
  return _.some(rolesWithPermission, role => _.includes(roles, role));
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
  ONLINE_ROLE,

  hasAllPermissions: (roles, permissions) => {
    if (module.exports.isDbAdmin({ roles })) {
      return true;
    }

    if (!permissions || !roles) {
      return false;
    }

    if (!_.isArray(permissions)) {
      permissions = [ permissions ];
    }

    return _.every(permissions, _.partial(hasPermission, roles));
  }
};
