const request = require('request');

const db = require('./src/db-pouch'),
      { logger, transports } = require('./src/lib/logger'),
      serverChecks = require('@shared-libs/server-checks'),
      loglevel = process.argv[2];

if (loglevel === 'debug') {
  logger.info(`setting loglevel to ${loglevel}`);
  transports.console.level = loglevel;
}

if (process.env.TEST_ENV) {
  logger.info('TEST_ENV is set, server does not run in test mode.');
  return;
}

process.on('unhandledRejection', reason => {
  logger.error('Unhandled Rejection:');
  logger.error(reason);
});

const waitForApi = () => new Promise(resolve => {
  //
  // This waits forever, with no escape hatch, becayse there is no way currently
  // to know what API is doing, and migrations could legitimately take days
  //
  //
  const waitLoop = () => {
    request(`http://localhost:${process.env.API_PORT || 5988}/setup/poll`, (err, response, body) => {
      if (err) {
        logger.info('Waiting for API to be ready...');
        return setTimeout(() => waitLoop(), 10 * 1000);
      }

      logger.info('Api is ready:', body);
      resolve();
    });
  };

  waitLoop();
});

serverChecks.check(db.serverUrl)
  .then(waitForApi)
  .then(() => {
    // Even requiring this boots translations, so has to be required after
    // api has booted
    const config = require('./src/config');
    return config.init()
      .then(() => {
        if (!loglevel) {
          transports.console.level = config.get('loglevel');
          logger.info(`loglevel is ${transports.console.level}`);
        }
        require('./src/schedule').checkSchedule();
        logger.info('startup complete.');
      });
  })
  .catch(err => {
    logger.error('Fatal error intialising medic-sentinel');
    logger.error(err.toString());
    process.exit(1);
  });
