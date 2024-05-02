/**
 * CHT Script API - Index
 * Builds and exports a versioned API from feature modules.
 * Whenever possible keep this file clean by defining new features in modules.
 */
const auth = require('./auth');

/**
 * Verify if the user's role has the permission(s).
 * @param permissions {string | string[]} Permission(s) to verify
 * @param userRoles {string[]} Array of user roles.
 * @param chtPermissionsSettings {object} Object of configured permissions in CHT-Core's settings.
 * @return {boolean}
 */
const hasPermissions = (permissions, userRoles, chtPermissionsSettings) => {
  return auth.hasPermissions(permissions, userRoles, chtPermissionsSettings);
};

/**
 * Verify if the user's role has all the permissions of any of the provided groups.
 * @param permissionsGroupList {string[][]} Array of groups of permissions due to the complexity of permission grouping
 * @param userRoles {string[]} Array of user roles.
 * @param chtPermissionsSettings {object} Object of configured permissions in CHT-Core's settings.
 * @return {boolean}
 */
const hasAnyPermission = (permissionsGroupList, userRoles, chtPermissionsSettings) => {
  return auth.hasAnyPermission(permissionsGroupList, userRoles, chtPermissionsSettings);
};

module.exports = {
  v1: {
    hasPermissions,
    hasAnyPermission
  }
};
