const config = require('./config');
const db = require('./db');
const infodoc = require('@medic/infodoc');

let inited = false;

module.exports = (sourceDb, sourceConfig) => {
  if (!inited) {
    db.init(sourceDb);
    infodoc.initLib(db.medic, db.sentinel);
    inited = true;
  }
  config.init(sourceConfig);

  const transitions = require('./transitions');
  const utils = require('./lib/utils');

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
    isWithinTimeFrame: utils.isWithinTimeFrame,
  };
};
