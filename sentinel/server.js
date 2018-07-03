const config = require('./src/config'),
      logger = require('./src/lib/logger'),
      serverChecks = require('@shared-libs/server-checks'),
      loglevel = process.argv[2];

if (loglevel === 'debug') {
  logger.info('setting loglevel to %s.', loglevel);
  logger.transports.Console.level = loglevel;
}

if (process.env.TEST_ENV) {
  logger.info('TEST_ENV is set, server does not run in test mode.');
  return;
}

process.on('unhandledRejection', reason => {
  console.error('Unhandled Rejection:');
  console.error(reason);
});

serverChecks.nodeVersionCheck('sentinel');

config.init()
  .then(() => {
    if (!loglevel) {
      logger.transports.Console.level = config.get('loglevel');
      logger.debug('loglevel is %s.', logger.transports.Console.level);
    }
    require('./src/schedule').checkSchedule();
    logger.info('startup complete.');
  })
  .catch(err => {
    console.error('Fatal error intialising medic-sentinel');
    console.log(err);
    process.exit(1);
  });
