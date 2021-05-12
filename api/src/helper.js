const logger = require('./logger');

const environment = require('./environment');
const serverChecks = require('@medic/server-checks');

const migrations = require('./migrations');
const ddocExtraction = require('./ddoc-extraction');
const generateXform = require('./services/generate-xform');
const resourceExtraction = require('./resource-extraction');
const translations = require('./translations');
const uploadDefaultDocs = require('./upload-default-docs');

const runAPIHelper = async () => {
  try
  {
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

    logger.info('Merging translations…');
    await translations.run();
    logger.info('Translations merged successfully');

    logger.info('Running db migrations…');
    await migrations.run();
    logger.info('Database migrations completed successfully');

    logger.info('Updating xforms…');
    await generateXform.updateAll();
    logger.info('xforms updated successfully');
  
  } catch (err) {
    logger.error('Fatal error initialising medic-api');
    logger.error('%o',err);
    process.exit(1);
  }
};

module.exports = runAPIHelper;
