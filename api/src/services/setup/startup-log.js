const logger = require('../../logger');

// TODO add translations (just like bootstrap) once the actions are decided upon
const actions = {
  serverChecks: {
    translation: 'Running server checks',
    display: true,
  },
  installationChecks: {
    translation: 'Running installation checks',
    display: true,
  },
  install: {
    translation: 'Installing',
    display: false,
  },
  index: {
    translation: 'Indexing data',
    display: false,
  },
  config: {
    translation: 'Configuring CHT',
    display: true,
  },
  migrate: {
    translation: 'Migrating data',
    display: true,
  },
  configForms: {
    translation: 'Configuring forms',
    display: true,
  }
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

const getProgress = () => actions;

module.exports = {
  start,
  getProgress,
};
