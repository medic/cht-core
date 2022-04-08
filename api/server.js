const environment = require('./src/environment');
const serverChecks = require('@medic/server-checks');
const logger = require('./src/logger');
const startupLog = require('./src/services/setup/startup-log');
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
  } catch (err) {
    logger.error('Fatal error initialising medic-api');
    logger.error('%o',err);
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
  const translations = require('./src/translations');
  const serverUtils = require('./src/server-utils');
  const uploadDefaultDocs = require('./src/upload-default-docs');
  const generateServiceWorker = require('./src/generate-service-worker');

  try
  {
    startupLog.logProgress('Running installation checks…');
    await checkInstall.run();
    startupLog.logProgress('Installation checks passed');

    startupLog.logProgress('Extracting initial documents…');
    await uploadDefaultDocs.run();
    startupLog.logProgress('Extracting initial documents completed successfully');

    startupLog.logProgress('Loading configuration…');
    await configWatcher.load();
    startupLog.logProgress('Configuration loaded successfully');
    configWatcher.listen();

    startupLog.logProgress('Merging translations…');
    await translations.run();
    startupLog.logProgress('Translations merged successfully');

    startupLog.logProgress('Running db migrations…');
    await migrations.run();
    startupLog.logProgress('Database migrations completed successfully');

    startupLog.logProgress('Generating service worker');
    await generateServiceWorker.run();
    startupLog.logProgress('Service worker generated successfully');

    startupLog.logProgress('Updating xforms…');
    await generateXform.updateAll();
    startupLog.logProgress('xforms updated successfully');

  } catch (err) {
    logger.error('Fatal error initialising medic-api');
    logger.error('%o',err);
    process.exit(1);
  }

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
