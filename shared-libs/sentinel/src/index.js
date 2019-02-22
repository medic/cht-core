const config = require('./config'),
      db = require('./db'),
      logger = require('./lib/logger');

module.exports = {
  init: (sourceDb, settings, translations, sourceLogger) => {
    logger.init(sourceLogger);
    db.init(sourceDb);
    config.init(settings, translations);
  }
};

module.exports.transitions = require('./transitions');
module.exports.messages = require('./lib/messages');
module.exports.utils = require('./lib/utils');
module.exports.mutingUtils = require('./lib/muting_utils');
module.exports.date = require('./date');
module.exports.infodoc = require('./lib/infodoc');
