const request = require('request');

const db = require('./src/db-pouch'),
  logger = require('./src/lib/logger'),
  serverChecks = require('@medic/server-checks');

if (process.env.TEST_ENV) {
  logger.info('TEST_ENV is set, server does not run in test mode.');
  process.exit(1);
}

process.on('unhandledRejection', reason => {
  logger.error('Unhandled Rejection:');
  logger.error('%o',reason);
});

const waitForApi = () =>
  new Promise(resolve => {
    //
    // This waits forever, with no escape hatch, becayse there is no way currently
    // to know what API is doing, and migrations could legitimately take days
    //
    //
    const waitLoop = () => {
      request(
        `http://localhost:${process.env.API_PORT || 5988}/setup/poll`,
        (err, response, body) => {
          if (err) {
            logger.info('Waiting for API to be ready...');
            return setTimeout(() => waitLoop(), 10 * 1000);
          }

          logger.info(`Api is ready: ${body}`);
          resolve();
        }
      );
    };

    waitLoop();
  });

serverChecks
  .check(db.serverUrl)
  .then(waitForApi)
  .then(() => {
    // Even requiring this boots translations, so has to be required after
    // api has booted
    const config = require('./src/config');
    return config.init().then(() => {
      require('./src/schedule').checkSchedule();
      logger.info('startup complete.');
    });
  })
  .catch(err => {
    logger.error('Fatal error intialising medic-sentinel');
    logger.error('%o',err);
    process.exit(1);
  });
