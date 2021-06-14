
const ADMIN_ROLE = '_admin';
const NATIONAL_ADMIN_ROLE = 'national_admin'; // Deprecated: kept for backwards compatibility: #4525

const cache = {
  userSettingsDoc: null,
  chtCoreSettingsDoc: null
};

const setUserSettingsDoc = (userSettingsDoc) => {
  cache.userSettingsDoc = userSettingsDoc;
};

const setChtCoreSettingsDoc = (chtCoreSettingsDoc) => {
  cache.chtCoreSettingsDoc = chtCoreSettingsDoc;
};

const isAdmin = (user) => {
  if (!user || !user.roles) {
    return false;
  }

  return [ADMIN_ROLE, NATIONAL_ADMIN_ROLE].some(role => user.roles.includes(role));
};

const hasPermission = (permission) => {
  if (!cache.chtCoreSettingsDoc
    || !cache.chtCoreSettingsDoc.permissions
    || !cache.userSettingsDoc
    || !cache.userSettingsDoc.roles
  ) {
    return false;
  }

  if (isAdmin(cache.userSettingsDoc)) {
    // Admin has the permissions automatically.
    return true;
  }

  const roles = cache.chtCoreSettingsDoc.permissions[permission];

  if (!roles) {
    return false;
  }

  return cache.userSettingsDoc.roles.some(role => roles.includes(role));
};

const getApi = () => {
  return {
    v1: {
      hasPermission
    }
  };
};

module.exports = {
  setChtCoreSettingsDoc,
  setUserSettingsDoc,
  getApi
};
