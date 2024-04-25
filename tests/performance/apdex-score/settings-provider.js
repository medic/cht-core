const { resolve, extname } = require('node:path');
const { existsSync, readFileSync } = require('node:fs');

let SETTINGS_CACHE;
const SUPPORTED_INPUT_FILE = '.json';

const loadSettingsFile = () => {
  const path = process.env.APDEX_TEST_SETTINGS;
  if (!path) {
    throw new Error(
      'No path to the settings file provided. Set the environment variable APDEX_TEST_SETTINGS.'
    );
  }

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
};

const getInstanceURL = () => {
  return SETTINGS_CACHE?.instanceURL;
};

const getUser = (type, role) => {
  return SETTINGS_CACHE?.users?.find(user => user.type === type && user.role === role);
};

const getAppiumSettings = () => {
  return SETTINGS_CACHE?.appium;
};

const getContactList = () => {
  return SETTINGS_CACHE?.pages?.contactList;
};

const getContactDetails = (contactType) => {
  return SETTINGS_CACHE?.pages?.contactDetails?.find(item => item.contactType === contactType );
};

const getReportList = () => {
  return SETTINGS_CACHE?.pages?.reportList;
};

const getReportDetails = (formId) => {
  return SETTINGS_CACHE?.pages?.reportDetails?.find(item => item.form === formId );
};

const getTaskList = () => {
  return SETTINGS_CACHE?.pages?.taskList;
};

const getMessageList = () => {
  return SETTINGS_CACHE?.pages?.messageList;
};

const getTargets = () => {
  return SETTINGS_CACHE?.pages?.targets;
};

const getContactForms = (formId) => {
  return SETTINGS_CACHE?.contactForms?.find(item => item.form === formId );
};

const getReportForm = (formId) => {
  return SETTINGS_CACHE?.reportForms?.find(item => item.form === formId );
};

const getTaskForms = (formId) => {
  return SETTINGS_CACHE?.taskForms?.find(item => item.form === formId );
};

module.exports = {
  loadSettingsFile,
  getInstanceURL,
  getUser,
  getAppiumSettings,
};
