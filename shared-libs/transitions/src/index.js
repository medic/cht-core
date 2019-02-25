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
    utils: require('./lib/utils'),
    mutingUtils: require('./lib/muting_utils'),
    date: require('./date'),
    infodoc: require('./lib/infodoc'),
    schedules: require('./lib/schedules'),
    getTransition: name => require(`./transitions/${name}`),
    dueTasks: require('./schedule/due_tasks')
  };
};
