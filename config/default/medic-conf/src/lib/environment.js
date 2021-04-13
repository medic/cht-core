const url = require('url');

const LOCAL_MATCHER = /^(.*localhost|\[::1\]|127\.0\.0\.\d{1,3})$/;
const DEV_MATCHER = /^(dev|test|staging)(-\w+|\d+)?$/;  // dev, test1, test-xx, ...

const state = {};

const initialize = (
  pathToProject,
  isArchiveMode,
  archiveDestination,
  extraArgs,
  apiUrl,
  force,
  skipTranslationCheck
) => {
  if (state.initialized) {
    throw Error('environment is already initialized');
  }

  Object.assign(state, {
    apiUrl,
    archiveDestination,
    extraArgs,
    initialized: true,
    isArchiveMode,
    pathToProject,
    force,
    skipTranslationCheck
  });
};

module.exports = {
  initialize,

  get pathToProject() { return state.pathToProject || '.'; },
  get isArchiveMode() { return !!state.isArchiveMode; },
  get archiveDestination() { return state.archiveDestination; },
  get instanceUrl() { return this.apiUrl && this.apiUrl.replace(/\/medic$/, ''); },
  get extraArgs() { return state.extraArgs; },
  get apiUrl() { return state.apiUrl; },
  get force() { return state.force; },
  get skipTranslationCheck() { return state.skipTranslationCheck; },

  /**
   * Return `true` if the environment **seems** to be production.
   * @returns {boolean}
   */
  isProduction() {
    if (!this.instanceUrl) {
      return false;
    }
    const hostname = new url.URL(this.instanceUrl).hostname;
    if (LOCAL_MATCHER.test(hostname)) {
      return false;
    }
    return !hostname.split('.').some(subdomain => DEV_MATCHER.test(subdomain));
  }
};
