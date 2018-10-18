const db = require('./src/db-pouch'),
      serverChecks = require('@shared-libs/server-checks');

process.on('unhandledRejection', reason => {
  console.error('Unhandled Rejection:');
  console.error(reason);
  console.error(reason.stack);
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
  .then(() => console.log('Extracting ddoc…'))
  .then(ddocExtraction.run)
  .then(() => console.log('DDoc extraction completed successfully'))

  .then(() => console.log('Loading configuration…'))
  .then(config.load)
  .then(() => console.log('Configuration loaded successfully'))
  .then(() => console.log('Uploading forms'))
  .then(config.uploadStandardForms)
  .then(() => console.log('Uploading forms completed successfully'))
  .then(config.listen)

  .then(() => console.log('Merging translations…'))
  .then(translations.run)
  .then(() => console.log('Translations merged successfully'))

  .then(() => console.log('Running db migrations…'))
  .then(migrations.run)
  .then(() => console.log('Database migrations completed successfully'))

  .catch(err => {
    console.error('Fatal error initialising medic-api');
    console.error(err);
    process.exit(1);
  })

  .then(() => {
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
  })

  .then(() => app.listen(apiPort, () => {
    console.log('Medic API listening on port ' + apiPort);
  }));
});
