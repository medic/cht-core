const { resolve, extname } = require('node:path');
const { existsSync, readFileSync } = require('node:fs');

let SETTINGS_CACHE;

const getInstanceURL = () => {
  return SETTINGS_CACHE?.instanceURL;
};

const getIterations = () => {
  return SETTINGS_CACHE?.iterations;
};

const hasPrivacyPolicy = () => {
  return !!SETTINGS_CACHE?.hasPrivacyPolicy;
};

const getCapabilitiesSettings = () => {
  return SETTINGS_CACHE?.capabilities;
};

const getUser = (type, role) => {
  return SETTINGS_CACHE?.users?.find(user => user.type === type && user.role === role);
};

const getPage = (name) => {
  return SETTINGS_CACHE?.pages && SETTINGS_CACHE.pages[name];
};

const getForm = (name) => {
  return SETTINGS_CACHE?.forms && SETTINGS_CACHE.forms[name];
};

const getCommonElements = () => {
  return SETTINGS_CACHE?.commonElements;
};

const settingsProvider = {
  getIterations,
  getInstanceURL,
  hasPrivacyPolicy,
  getCapabilitiesSettings,
  getUser,
  getPage,
  getForm,
  getCommonElements,
};

module.exports = () => {
  if (SETTINGS_CACHE) {
    return settingsProvider;
  }

  const path = process.env.APDEX_TEST_SETTINGS;
  if (!path) {
    throw new Error(
      'No path to the settings file provided. Set the environment variable APDEX_TEST_SETTINGS.'
    );
  }

  const SUPPORTED_INPUT_FILE = '.json';
  const resolvedPath = resolve(path);
  if (extname(resolvedPath) !== SUPPORTED_INPUT_FILE) {
    throw new Error(
      'The settings file is not a JSON file. Retry using a file with extension ending in .json'
    );
  }

  if (!existsSync(resolvedPath)) {
    throw new Error('The settings file does not exist in the specified location. Verify the path is correct.');
  }

  SETTINGS_CACHE = JSON.parse(readFileSync(resolvedPath));

  return settingsProvider;
};
