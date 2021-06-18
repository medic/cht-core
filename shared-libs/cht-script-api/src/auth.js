/**
 * CHT Script API - Auth module
 * Provides tools related to Authentication.
 */

const ADMIN_ROLE = '_admin';
const NATIONAL_ADMIN_ROLE = 'national_admin'; // Deprecated: kept for backwards compatibility: #4525
const DISALLOWED_PERMISSION_PREFIX = '!';

const isAdmin = (userRoles) => {
  if (!Array.isArray(userRoles)) {
    return false;
  }

  return [ADMIN_ROLE, NATIONAL_ADMIN_ROLE].some(role => userRoles.includes(role));
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

const printLog = (reason, permissions, roles) => {
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

const verifyParameters = (permissions, userRoles, chtPermissionsSettings) => {
  if (!permissions || !permissions.length) {
    printLog('No permissions to verify.');
    return false;
  }

  if (!userRoles || !userRoles.length) {
    printLog('User has no roles');
    return false;
  }

  if (!chtPermissionsSettings || !Object.keys(chtPermissionsSettings).length) {
    printLog('No permissions configured in CHT-Core');
    return false;
  }

  return true;
};

/**
 * Verify if the user's role has the permission(s).
 * @param permissions {string | string[]} Permission(s) to verify
 * @param userRoles {string[]} Array of user roles.
 * @param chtPermissionsSettings {object} Object of configured permissions in CHT-Core's settings.
 * @return {boolean}
 */
const hasPermissions = (permissions, userRoles, chtPermissionsSettings) => {
  if (!verifyParameters(permissions, userRoles, chtPermissionsSettings)) {
    return false;
  }

  if (!Array.isArray(permissions)) {
    permissions = [ permissions ];
  }

  const { allowed, disallowed } = groupPermissions(permissions);

  if (isAdmin(userRoles)) {
    if (disallowed.length) {
      printLog('Disallowed permission(s) found for admin', permissions, userRoles);
      return false;
    }
    // Admin has the permissions automatically.
    return true;
  }

  const hasDisallowed = !checkUserHasPermissions(disallowed, userRoles, chtPermissionsSettings, false);
  const hasAllowed = checkUserHasPermissions(allowed, userRoles, chtPermissionsSettings, true);

  if (hasDisallowed) {
    printLog('Found disallowed permission(s)', permissions, userRoles);
    return false;
  }

  if (!hasAllowed) {
    printLog('Missing permission(s)', permissions, userRoles);
    return false;
  }

  return true;
};

/**
 * Verify if the user's role has all the permissions of any of the provided groups.
 * @param permissionsGroupList {string[][]} Array of groups of permissions due to the complexity of permission grouping
 * @param userRoles {string[]} Array of user roles.
 * @param chtPermissionsSettings {object} Object of configured permissions in CHT-Core's settings.
 * @return {boolean}
 */
const hasAnyPermission = (permissionsGroupList, userRoles, chtPermissionsSettings) => {
  if (!verifyParameters(permissionsGroupList, userRoles, chtPermissionsSettings)) {
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
    if (disallowedGroupList.every(permissions => permissions.length)) {
      printLog('Disallowed permission(s) found for admin', permissionsGroupList, userRoles);
      return false;
    }
    // Admin has the permissions automatically.
    return true;
  }

  const hasAnyPermissionGroup = permissionsGroupList.some((permissions, i) => {
    const hasAnyAllowed = checkUserHasPermissions(allowedGroupList[i], userRoles, chtPermissionsSettings, true);
    const hasAnyDisallowed = !checkUserHasPermissions(disallowedGroupList[i], userRoles, chtPermissionsSettings, false);
    // Checking the 'permission group' is valid.
    return hasAnyAllowed && !hasAnyDisallowed;
  });

  if (!hasAnyPermissionGroup) {
    printLog('No matching permissions', permissionsGroupList, userRoles);
    return false;
  }

  return true;
};

module.exports = {
  hasPermissions,
  hasAnyPermission
};
