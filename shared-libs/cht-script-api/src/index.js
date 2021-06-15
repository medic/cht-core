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

/**
 * Sets the User Settings Document to the cache.
 * @param userSettingsDoc
 */
const setUserSettingsDoc = (userSettingsDoc) => {
  cache.userSettingsDoc = userSettingsDoc;
};

/**
 * Sets the CHT-Core Settings Document to the cache.
 * @param chtCoreSettingsDoc
 */
const setChtCoreSettingsDoc = (chtCoreSettingsDoc) => {
  cache.chtCoreSettingsDoc = chtCoreSettingsDoc;
};

/**
 * Verify if user has the permission(s).
 * @param permissions {String|Array[String]} Permission(s) to verify
 * @param userSettingsDoc {Object} User Settings Document. If undefined then will take from the cache.
 * @param chtCoreSettingsDoc CHT-Core Settings Document. If undefined then will take from the cache.
 * @return {boolean}
 */
const hasPermissions = (permissions, userSettingsDoc, chtCoreSettingsDoc) => {
  if (!userSettingsDoc || !chtCoreSettingsDoc) {
    if (!cache.userSettingsDoc || !cache.chtCoreSettingsDoc) {
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
 * Returns a versioned API that is available for internal apps and end users configuring CHT-Core instances.
 * @return {{v1: Object }}
 */
const getApi = () => {
  return {
    v1: {
      hasPermissions
    }
  };
};

module.exports = {
  setChtCoreSettingsDoc,
  setUserSettingsDoc,
  getApi
};
