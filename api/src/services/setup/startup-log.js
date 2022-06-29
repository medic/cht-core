const logger = require('../../logger');
const config = require('../../config');

const actions = {
  installationChecks: {
    translation: 'api.startup.checks',
    display: true,
  },
  install: {
    translation: 'api.startup.install',
    display: false,
  },
  index: {
    translation: 'api.startup.index',
    display: false,
  },
  config: {
    translation: 'api.startup.config',
    display: true,
  },
  migrate: {
    translation: 'api.startup.migrate',
    display: true,
  },
  configForms: {
    translation: 'api.startup.forms',
    display: true,
  },
};

const start = (actionId) => {
  const action = actions[actionId];
  if (!action) {
    logger.warn(`Startup action not found: ${actionId}`);
    return;
  }
  // complete previously started actions
  Object.values(actions).forEach(action => {
    if (action.started) {
      action.completed = true;
    }
  });

  action.display = true;
  action.started = true;
};

const getProgress = (locale) => {
  return Object
    .values(actions)
    .map(action => ({
      ...action,
      text: config.translate(action.translation, locale)
    }));
};

module.exports = {
  start,
  getProgress,
};
