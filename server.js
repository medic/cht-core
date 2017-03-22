const config = require('./config'),
      logger = require('./lib/logger'),
      loglevel = process.argv[2];

if (loglevel === 'debug') {
  logger.info('setting loglevel to %s.', loglevel);
  logger.transports.Console.level = loglevel;
}

if (process.env.TEST_ENV) {
  logger.info('TEST_ENV is set, server does not run in test mode.');
  return;
}

config.init(function(err) {
  if (err) {
    logger.error('Error loading config: ', err);
    process.exit(1);
  }
  logger.info('loaded config.');
  if (!loglevel) {
    logger.transports.Console.level = config.get('loglevel');
    logger.debug('loglevel is %s.', logger.transports.Console.level);
  }
  logger.info('attaching transitions...');
  require('./transitions').attach();
  require('./schedule').checkSchedule();
  logger.info('startup complete.');
});
