const environment = require('./src/environment');
const serverChecks = require('@medic/server-checks');
const logger = require('./src/logger');

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

(async () => {

  const app = require('./src/routing');
  const configWatcher = require('./src/services/config-watcher');
  const migrations = require('./src/migrations');
  const ddocExtraction = require('./src/ddoc-extraction');
  const generateXform = require('./src/services/generate-xform');
  const resourceExtraction = require('./src/resource-extraction');
  const translations = require('./src/translations');
  const serverUtils = require('./src/server-utils');
  const uploadDefaultDocs = require('./src/upload-default-docs');
  const generateServiceWorker = require('./src/generate-service-worker');
  const apiPort = process.env.API_PORT || 5988;

  try {
    logger.info('Running server checks…');
    await serverChecks.check(environment.serverUrl);
    logger.info('Checks passed successfully');

    logger.info('Extracting ddoc…');
    await ddocExtraction.run();
    logger.info('DDoc extraction completed successfully');

    logger.info('Cleaning resources directory…');
    resourceExtraction.removeDirectory();
    logger.info('Cleaning resources directory completed successfully');

    logger.info('Extracting resources…');
    await resourceExtraction.run();
    logger.info('Extracting resources completed successfully');

    logger.info('Extracting initial documents…');
    await uploadDefaultDocs.run();
    logger.info('Extracting initial documents completed successfully');

    logger.info('Loading configuration…');
    await configWatcher.load();
    logger.info('Configuration loaded successfully');
    configWatcher.listen();

    logger.info('Merging translations…');
    await translations.run();
    logger.info('Translations merged successfully');

    logger.info('Running db migrations…');
    await migrations.run();
    logger.info('Database migrations completed successfully');

    logger.info('Generating service worker');
    await generateServiceWorker.run();
    logger.info('Service worker generated successfully');

    logger.info('Updating xforms…');
    await generateXform.updateAll();
    logger.info('xforms updated successfully');

  } catch (err) {
    logger.error('Fatal error initialising medic-api');
    logger.error('%o', err);
    process.exit(1);
  }

  // Define error-handling middleware last.
  // http://expressjs.com/guide/error-handling.html
  app.use((err, req, res, next) => {
    if (res.headersSent) {
      // If we've already started a response (eg streaming), pass on to express to abort it
      // rather than attempt to resend headers for a 5xx response
      return next(err);
    }
    serverUtils.serverError(err, req, res);
  });

  const server = app.listen(apiPort, () => {
    logger.info('Medic API listening on port ' + apiPort);
  });
  server.setTimeout(0);
})();
