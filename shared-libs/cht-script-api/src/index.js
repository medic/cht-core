/**
 * CHT Script API - Index
 * Builds and exports a versioned API from feature modules.
 * Whenever possible keep this file clean by defining new features in modules.
 */
const auth = require('./auth');

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

/**
 * Verify if the user's role has the permission(s).
 * @param permissions {string | string[]} Permission(s) to verify
 * @param userSettingsDoc {object} User Settings Document. If undefined then will take from the cache.
 * @param chtCoreSettingsDoc {object} CHT-Core Settings Document. If undefined then will take from the cache.
 * @return {boolean}
 */
const hasPermissions = (permissions, userSettingsDoc, chtCoreSettingsDoc) => {
  if (!userSettingsDoc || !chtCoreSettingsDoc) {
    if (!cache.userSettingsDoc || !cache.chtCoreSettingsDoc) {
      // eslint-disable-next-line no-console
      console.debug('CHT Script API :: Cannot check permissions: Set the user settings and CHT settings documents.');
      return false;
    }
    // Using cache for both documents at the same time.
    userSettingsDoc = cache.userSettingsDoc;
    chtCoreSettingsDoc = cache.chtCoreSettingsDoc;
  }

  return auth.hasPermissions(permissions, userSettingsDoc.roles, chtCoreSettingsDoc.permissions);
};

/**
 * Verify if the user's role has all the permissions of any of the provided groups.
 * @param permissions {string[][]} Array of groups of permissions due to the complexity of permission grouping
 * @param userSettingsDoc {object} User Settings Document. If undefined then will take from the cache.
 * @param chtCoreSettingsDoc {object} CHT-Core Settings Document. If undefined then will take from the cache.
 * @return {boolean}
 */
const hasAnyPermission = (permissions, userSettingsDoc, chtCoreSettingsDoc) => {
  if (!userSettingsDoc || !chtCoreSettingsDoc) {
    if (!cache.userSettingsDoc || !cache.chtCoreSettingsDoc) {
      // eslint-disable-next-line no-console
      console.debug('CHT Script API :: Cannot check permissions: Set the user settings and CHT settings documents.');
      return false;
    }
    // Using cache for both documents at the same time.
    userSettingsDoc = cache.userSettingsDoc;
    chtCoreSettingsDoc = cache.chtCoreSettingsDoc;
  }

  return auth.hasAnyPermission(permissions, userSettingsDoc.roles, chtCoreSettingsDoc.permissions);
};

/**
 * Returns a versioned API that is available for internal apps and end users configuring CHT-Core instances.
 * @return {{v1: Object }}
 */
const getApi = () => {
  return {
    v1: {
      hasPermissions,
      hasAnyPermission
    }
  };
};

module.exports = {
  setChtCoreSettingsDoc,
  setUserSettingsDoc,
  getApi
};
