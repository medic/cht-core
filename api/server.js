const db = require('./src/db-pouch'),
  serverChecks = require('@shared-libs/server-checks'),
  logger = require('./src/logger');

process
  .on('unhandledRejection', reason => {
    logger.error('UNHANDLED REJECTION!');
    logger.error('  Reason: %o', reason);
  })
  .on('uncaughtException', err => {
    logger.error('UNCAUGHT EXCEPTION!');
    logger.error('  Error: %o', err);
    process.exit(1);
  });

serverChecks.check(db.serverUrl).then(() => {
  const app = require('./src/routing'),
    config = require('./src/config'),
    migrations = require('./src/migrations'),
    ddocExtraction = require('./src/ddoc-extraction'),
    translations = require('./src/translations'),
    serverUtils = require('./src/server-utils'),
    apiPort = process.env.API_PORT || 5988;

  Promise.resolve()
    .then(() => logger.info('Extracting ddoc…'))
    .then(ddocExtraction.run)
    .then(() => logger.info('DDoc extraction completed successfully'))

    .then(() => logger.info('Loading configuration…'))
    .then(config.load)
    .then(() => logger.info('Configuration loaded successfully'))
    .then(config.listen)

    .then(() => logger.info('Merging translations…'))
    .then(translations.run)
    .then(() => logger.info('Translations merged successfully'))

    .then(() => logger.info('Running db migrations…'))
    .then(migrations.run)
    .then(() => logger.info('Database migrations completed successfully'))

    .catch(err => {
      logger.error('Fatal error initialising medic-api');
      logger.error('%o',err);
      process.exit(1);
    })

    .then(() => {
      // Define error-handling middleware last.
      // http://expressjs.com/guide/error-handling.html
      app.use((err, req, res, next) => {
        // jshint ignore:line
        if (res.headersSent) {
          // If we've already started a response (eg streaming), pass on to express to abort it
          // rather than attempt to resend headers for a 5xx response
          return next(err);
        }
        serverUtils.serverError(err, req, res);
      });
    })

    .then(() =>
      app.listen(apiPort, () => {
        logger.info('Medic API listening on port ' + apiPort);
      })
    );
});
