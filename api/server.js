const db = require('./src/db-pouch'),
      config = require('./src/config'),
      ddocExtraction = require('./src/ddoc-extraction'),
      translations = require('./src/translations'),
      serverUtils = require('./src/server-utils'),
      serverChecks = require('@shared-libs/server-checks'),
      apiPort = process.env.API_PORT || 5988;

const app = require('./src/routing');

process.on('unhandledRejection', reason => {
  console.error('Unhandled Rejection:');
  console.error(reason);
});

Promise.resolve()
  .then(serverChecks.check(db.serverUrl))
  .then(() => console.log('Extracting ddoc…'))
  .then(ddocExtraction.run)
  .then(() => console.log('DDoc extraction completed successfully'))

  .then(() => console.log('Loading configuration…'))
  .then(config.load)
  .then(() => console.log('Configuration loaded successfully'))
  .then(config.listen)

  .then(() => console.log('Merging translations…'))
  .then(translations.run)
  .then(() => console.log('Translations merged successfully'))

  .then(() => console.log('Running db migrations…'))
  .then(() => require('./src/migrations').run())
  .then(() => console.log('Database migrations completed successfully'))

  .catch(err => {
    console.error('Fatal error initialising medic-api');
    console.error(err);
    process.exit(1);
  })

  .then(() => app.listen(apiPort, () => {
    console.log('Medic API listening on port ' + apiPort);
  }));

// Define error-handling middleware last.
// http://expressjs.com/guide/error-handling.html
app.use((err, req, res, next) => { // jshint ignore:line
  if (res.headersSent) {
    // If we've already started a response (eg streaming), pass on to express to abort it
    // rather than attempt to resend headers for a 5xx response
    return next(err);
  }
  serverUtils.serverError(err, req, res);
});
