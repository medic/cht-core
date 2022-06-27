const logger = require('../../logger');

// TODO add translations (just like bootstrap) once the actions are decided upon
const actions = [
  {
    id: 'check',
    translation: 'Running installation checks',
    display: true,
  },
  {
    id: 'install',
    translation: 'Installing',
    display: false,
  },
  {
    id: 'index',
    translation: 'Indexing data',
    display: false,
  },
  {
    id: 'config',
    translation: 'Configuring CHT',
    display: true,
  },
  {
    id: 'migrate',
    translation: 'Migrating data',
    display: true,
  },
  {
    id: 'config_forms',
    translation: 'Configuring forms',
    display: true,
  },
];

const start = (actionId) => {
  const action = actions.find(action => action.id === actionId);
  if (!action) {
    logger.warn(`Startup action not found: ${actionId}`);
    return;
  }
  // complete previously started actions
  actions.forEach(action => {
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
