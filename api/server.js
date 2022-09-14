const environment = require('./src/environment');
const serverChecks = require('@medic/server-checks');
const logger = require('./src/logger');
const express = require('express');
const apiPort = process.env.API_PORT || 5988;

let router;

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

    const uploadDefaultDocs = require('./src/upload-default-docs');
    logger.info('Extracting initial documents…');
    await uploadDefaultDocs.run();
    logger.info('Extracting initial documents completed successfully');

    logger.info('Merging translations…');
    const translations = require('./src/translations');
    await translations.run();
    logger.info('Translations merged successfully');

    logger.info('Loading translations…');
    const configWatcher = require('./src/services/config-watcher');
    await configWatcher.loadTranslations();
    logger.info('Translations loaded successfully');
  } catch (err) {
    logger.error('Fatal error initialising medic-api');
    logger.error('%o', err);
    process.exit(1);
  }

  const app = express();
  app.set('strict routing', true);
  app.set('trust proxy', true);
  app.use((req, res, next) => router(req, res, next));

  const setupRouter = require('./src/services/setup/router');
  router = setupRouter.router;

  const server = app.listen(apiPort, () => {
    logger.info('Medic API listening on port ' + apiPort);
  });
  server.setTimeout(0);

  const checkInstall = require('./src/services/setup/check-install');
  const configWatcher = require('./src/services/config-watcher');
  const migrations = require('./src/migrations');
  const generateXform = require('./src/services/generate-xform');
  const serverUtils = require('./src/server-utils');
  const generateServiceWorker = require('./src/generate-service-worker');
  const manifest = require('./src/services/manifest');
  const startupLog = require('./src/services/setup/startup-log');

  try {
    startupLog.start('checks');
    logger.info('Running installation checks…');
    await checkInstall.run();
    logger.info('Installation checks passed');

    startupLog.start('config');
    logger.info('Loading configuration…');
    await configWatcher.load();
    logger.info('Configuration loaded successfully');
    configWatcher.listen();

    startupLog.start('migrate');
    logger.info('Running db migrations…');
    await migrations.run();
    logger.info('Database migrations completed successfully');

    startupLog.start('forms');
    logger.info('Generating manifest');
    await manifest.generate();
    logger.info('Manifest generated successfully');

    logger.info('Generating service worker');
    await generateServiceWorker.run(true);
    logger.info('Service worker generated successfully');

    logger.info('Updating xforms…');
    await generateXform.updateAll();
    logger.info('xforms updated successfully');

  } catch (err) {
    logger.error('Fatal error initialising medic-api');
    logger.error('%o', err);
    process.exit(1);
  }

  startupLog.complete();
  router = require('./src/routing');
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
})();
