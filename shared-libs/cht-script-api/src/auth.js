/**
 * CHT Script API - Auth module
 * Provides tools related to Authentication.
 */

const ADMIN_ROLE = '_admin';
const NATIONAL_ADMIN_ROLE = 'national_admin'; // Deprecated: kept for backwards compatibility: #4525
const DISALLOWED_PERMISSION_PREFIX = '!';

const isAdmin = (userRoles) => {
  if (!userRoles) {
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
}

const printLog = (reason, permissions, roles) => {
  console.debug(`CHT Script API :: ${reason}. User roles: ${roles}. Wanted permissions: ${permissions}`);
}

const checkUserHasPermissions = (permissions, userRoles, chtPermissions) => {
  return permissions.every(permission => {
    const roles = chtPermissions[permission] || [];
    return userRoles.some(role => roles.includes(role));
  });
}

const hasPermissions = (permissions, userRoles, chtPermissions) => {
  if (!userRoles || !chtPermissions) {
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

  const hasDisallowed = !!disallowed.length && checkUserHasPermissions(disallowed, userRoles, chtPermissions);
  const hasAllowed = checkUserHasPermissions(allowed, userRoles, chtPermissions);

  if (hasDisallowed) {
    printLog('Found disallowed permission(s)', permissions, userRoles);
    return false;
  }

  if (!hasAllowed) {
    printLog('Missing required permission(s)', permissions, userRoles);
    return false;
  }

  return true;
};

module.exports = {
  hasPermissions
};
