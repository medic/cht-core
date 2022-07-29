const request = require('request');

const db = require('./src/db');
const logger = require('./src/lib/logger');
const serverChecks = require('@medic/server-checks');

process
  .on('unhandledRejection', reason => {
    logger.error('Unhandled Rejection:');
    logger.error('%o', reason);
  })
  .on('uncaughtException', err => {
    logger.error('UNCAUGHT EXCEPTION!');
    logger.error('  Error: %o', err);
    process.exit(1);
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
        `http://${process.env.API_HOST || 'localhost'}:${process.env.API_PORT || 5988}/setup/poll`,
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

logger.info('Running server checks…');
serverChecks
  .check(db.couchUrl)
  .then(waitForApi)
  .then(() => {
    // Even requiring this boots translations, so has to be required after
    // api has booted
    const config = require('./src/config');
    return config.init().then(() => {
      require('./src/schedule').init();
      logger.info('startup complete.');
    });
  })
  .catch(err => {
    logger.error('Fatal error intialising medic-sentinel');
    logger.error('%o', err);
    process.exit(1);
  });
