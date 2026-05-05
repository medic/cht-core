/**
 * CHT Script API - Auth module
 * Provides tools related to Authentication.
 */

const { DB_ADMIN_ROLES } = require('@medic/constants');
const DISALLOWED_PERMISSION_PREFIX = '!';

const isAdmin = (userRoles) => {
  if (!Array.isArray(userRoles)) {
    return false;
  }

  return DB_ADMIN_ROLES.some(adminRole => userRoles.includes(adminRole));
};

const groupPermissions = (permissions) => {
  const groups = { allowed: [], disallowed: [] };

  permissions.forEach(permission => {
    if (permission.indexOf(DISALLOWED_PERMISSION_PREFIX) === 0) {
      // Removing the DISALLOWED_PERMISSION_PREFIX and keeping the permission name.
      groups.disallowed.push(permission.substring(1));
    } else {
      groups.allowed.push(permission);
    }
  });

  return groups;
};

const debug = (reason, permissions, roles) => {
  // eslint-disable-next-line no-console
  console.debug(`CHT Script API :: ${reason}. User roles: ${roles}. Wanted permissions: ${permissions}`);
};

const checkUserHasPermissions = (permissions, userRoles, chtPermissionsSettings, expectedToHave) => {
  return permissions.every(permission => {
    const roles = chtPermissionsSettings[permission];

    if (!roles) {
      return !expectedToHave;
    }

    return expectedToHave === userRoles.some(role => roles.includes(role));
  });
};

const filterRolesByConfigured = (userRoles, chtRolesSettings = {}) => {
  const availableRoles = new Set([...DB_ADMIN_ROLES, ...Object.keys(chtRolesSettings)]);
  return userRoles.filter(role => availableRoles.has(role));
};

const verifyParameters = (permissions, userRoles, chtPermissionsSettings) => {
  if (!Array.isArray(permissions) || !permissions.length) {
    debug('Permissions to verify are not provided or have invalid type');
    return false;
  }

  if (!Array.isArray(userRoles)) {
    debug('User roles are not provided or have invalid type');
    return false;
  }

  if (!chtPermissionsSettings || !Object.keys(chtPermissionsSettings).length) {
    debug('CHT-Core\'s configured permissions are not provided');
    return false;
  }

  return true;
};

const normalizePermissions = (permissions) => {
  if (permissions && typeof permissions === 'string') {
    return [permissions];
  }
  return permissions;
};

const checkAdminPermissions = (disallowedGroupList, permissions, userRoles) => {
  if (disallowedGroupList.every(permissions => permissions.length)) {
    debug('Disallowed permission(s) found for admin', permissions, userRoles);
    return false;
  }
  // Admin has the permissions automatically.
  return true;
};

/**
 * Verify if the user's role has the permission(s).
 * @param ctx the current data context
 * @returns a function that accepts permissions, userRoles, and an optional chtPermissionsSettings override
 */
const hasPermissions = (ctx) => (permissions, userRoles, chtPermissionsSettings) => {
  permissions = normalizePermissions(permissions);
  const settings = ctx.settings.getAll();
  const effectivePermissionsSettings = chtPermissionsSettings ?? settings.permissions;

  if (!verifyParameters(permissions, userRoles, effectivePermissionsSettings)) {
    return false;
  }

  const { allowed, disallowed } = groupPermissions(permissions);

  if (isAdmin(userRoles)) {
    return checkAdminPermissions([disallowed], permissions, userRoles);
  }

  const effectiveUserRoles = filterRolesByConfigured(userRoles, settings.roles);
  const hasDisallowed = !checkUserHasPermissions(disallowed, effectiveUserRoles, effectivePermissionsSettings, false);
  const hasAllowed = checkUserHasPermissions(allowed, effectiveUserRoles, effectivePermissionsSettings, true);

  if (hasDisallowed) {
    debug('Found disallowed permission(s)', permissions, userRoles);
    return false;
  }

  if (!hasAllowed) {
    debug('Missing permission(s)', permissions, userRoles);
    return false;
  }

  return true;
};

/**
 * Verify if the user's role has all the permissions of any of the provided groups.
 * @param ctx the current data context
 * @returns a function that accepts permissionsGroupList, userRoles, and an optional chtPermissionsSettings override
 */
const hasAnyPermission = (ctx) => (permissionsGroupList, userRoles, chtPermissionsSettings) => {
  const settings = ctx.settings.getAll();
  const effectivePermissionsSettings = chtPermissionsSettings ?? settings.permissions;
  if (!verifyParameters(permissionsGroupList, userRoles, effectivePermissionsSettings)) {
    return false;
  }

  const validGroup = permissionsGroupList.every(permissions => Array.isArray(permissions));
  if (!validGroup) {
    debug('Permission groups to verify are invalid');
    return false;
  }

  const allowedGroupList = [];
  const disallowedGroupList = [];
  permissionsGroupList.forEach(permissions => {
    const { allowed, disallowed } = groupPermissions(permissions);
    allowedGroupList.push(allowed);
    disallowedGroupList.push(disallowed);
  });

  if (isAdmin(userRoles)) {
    return checkAdminPermissions(disallowedGroupList, permissionsGroupList, userRoles);
  }

  const effectiveUserRoles = filterRolesByConfigured(userRoles, settings.roles);
  const hasAnyPermissionGroup = permissionsGroupList.some((permissions, i) => {
    const hasAnyAllowed = checkUserHasPermissions(
      allowedGroupList[i], effectiveUserRoles, effectivePermissionsSettings, true
    );
    const hasAnyDisallowed = !checkUserHasPermissions(
      disallowedGroupList[i], effectiveUserRoles, effectivePermissionsSettings, false
    );
    // Checking the 'permission group' is valid.
    return hasAnyAllowed && !hasAnyDisallowed;
  });

  if (!hasAnyPermissionGroup) {
    debug('No matching permissions', permissionsGroupList, userRoles);
    return false;
  }

  return true;
};

module.exports = {
  hasPermissions,
  hasAnyPermission
};
