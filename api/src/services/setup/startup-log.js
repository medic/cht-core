const logger = require('../../logger');
const config = require('../../config');

const actions = {
  checks: {
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
  forms: {
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
  complete();

  action.display = true;
  action.started = true;
};

const complete = () => {
  Object.values(actions).forEach(action => {
    if (action.started) {
      action.completed = true;
    }
  });
};

const getProgress = (locale) => {
  const translatedActions = {};
  Object.entries(actions).forEach(([actionId, action]) => {
    translatedActions[actionId] = {
      ...action,
      text: config.translate(action.translation, locale)
    };
  });
  const completed = !Object.values(actions).find(action => {
    return (action.started && !action.completed) ||
           (action.display && !action.completed);
  });

  return {
    actions: translatedActions,
    completed,
  };
};

module.exports = {
  start,
  getProgress,
  complete,
};
