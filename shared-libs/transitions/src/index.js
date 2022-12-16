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
    loadTransitions: transitions.loadTransitions,
    processChange: transitions.processChange,
    processDocs: transitions.processDocs,
    getDeprecatedTransitions: transitions.getDeprecatedTransitions,
    messages: require('./lib/messages'),
    date: require('./date'),
    infodoc: infodoc,
    dueTasks: require('./schedule/due_tasks')
  };
};
