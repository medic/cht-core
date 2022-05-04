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
  try {
    logger.info('Running server checks…');
    await serverChecks.check(environment.couchUrl);
    logger.info('Checks passed successfully');
  } catch (err) {
    logger.error('Fatal error initialising medic-api');
    logger.error('%o',err);
    process.exit(1);
  }

  const serverUtils = require('./src/server-utils');
  const apiPort = process.env.API_PORT || 5988;

  try
  {
    logger.info('Running installation checks…');
    const checkInstall = require('./src/services/setup/check-install');
    await checkInstall.run();
    logger.info('Installation checks passed');

    logger.info('Extracting initial documents…');
    const uploadDefaultDocs = require('./src/upload-default-docs');
    await uploadDefaultDocs.run();
    logger.info('Extracting initial documents completed successfully');

    logger.info('Loading configuration…');
    const configWatcher = require('./src/services/config-watcher');
    await configWatcher.load();
    logger.info('Configuration loaded successfully');
    configWatcher.listen();

    logger.info('Merging translations…');
    const translations = require('./src/translations');
    await translations.run();
    logger.info('Translations merged successfully');

    logger.info('Running db migrations…');
    const migrations = require('./src/migrations');
    await migrations.run();
    logger.info('Database migrations completed successfully');

    logger.info('Generating service worker');
    const generateServiceWorker = require('./src/generate-service-worker');
    await generateServiceWorker.run(true);
    logger.info('Service worker generated successfully');

    logger.info('Updating xforms…');
    const generateXform = require('./src/services/generate-xform');
    await generateXform.updateAll();
    logger.info('xforms updated successfully');

  } catch (err) {
    logger.error('Fatal error initialising medic-api');
    logger.error('%o',err);
    process.exit(1);
  }

  // Define error-handling middleware last.
  // http://expressjs.com/guide/error-handling.html
  const app = require('./src/routing');
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
