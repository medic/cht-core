const config = require('./config'),
      db = require('./db'),
      logger = require('./lib/logger');

module.exports = (sourceDb, settings, translations, sourceLogger) => {
  logger.init(sourceLogger);
  db.init(sourceDb);
  config.init(settings, translations);

  return {
    transitions: require('./transitions'),
    messages: require('./lib/messages'),
    date: require('./date'),
    infodoc: require('./lib/infodoc'),
    dueTasks: require('./schedule/due_tasks')
  };
};
