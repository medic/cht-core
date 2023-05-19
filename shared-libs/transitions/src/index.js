const config = require('./config');
const db = require('./db');
const logger = require('./lib/logger');
const infodoc = require('@medic/infodoc');

let inited = false;

module.exports = (sourceDb, sourceConfig, sourceLogger) => {
  if (!inited) {
    logger.init(sourceLogger);
    db.init(sourceDb);
    infodoc.initLib(db.medic, db.sentinel);
    inited = true;
  }
  config.init(sourceConfig);

  const transitions = require('./transitions');
  return {
    date: require('./date'),
    dueTasks: require('./schedule/due_tasks'),
    getDeprecatedTransitions: transitions.getDeprecatedTransitions,
    getLoadingErrors: transitions.getLoadingErrors,
    infodoc: infodoc,
    loadTransitions: transitions.loadTransitions,
    messages: require('./lib/messages'),
    processChange: transitions.processChange,
    processDocs: transitions.processDocs,
  };
};
