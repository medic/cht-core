const config = require('./config'),
      db = require('./db'),
      logger = require('./lib/logger');

module.exports = {
  init: (sourceDb, settings, translations, sourceLogger) => {
    logger.set(sourceLogger);
    db.init(sourceDb);
    config.init(settings, translations);
    module.exports.transitions = require('./transitions');
  }
};
