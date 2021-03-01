const logger = require('./logger');

const environment = require('./environment');
const serverChecks = require('@medic/server-checks');

const config = require('./config');
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
    await serverChecks.check(environment.serverUrl); //Should be in API
    logger.info('Checks passed successfully');

    logger.info('Extracting ddoc…');
    await ddocExtraction.run();
    logger.info('DDoc extraction completed successfully');

    logger.info('Cleaning resources directory…');
    resourceExtraction.removeDirectory(); //Init only. Actually, this won't be needed with arch v3 because there would be no directory to clean up or remove.
    logger.info('Cleaning resources directory completed successfully');

    logger.info('Extracting resources…');
    await resourceExtraction.run();//Not needed with arch v3? default-docs (containing the default config) are saved here so it is needed. Static files are accessed from the api server and therefore, there won't be a need for extracting it from the ddoc.
    logger.info('Extracting resources completed successfully');

    logger.info('Extracting initial documents…');
    await uploadDefaultDocs.run();//ONE time only. Because this uses the ddoc extraction and resource extraction, they are needed in the one time code as well.
    logger.info('Extracting initial documents completed successfully');

    logger.info('Loading configuration…');
    await config.load();//Can this run with more than one API instances? Does it makes sense to do so?
    logger.info('Configuration loaded successfully');
    await config.listen(); //Not in init.

    logger.info('Merging translations…'); //Take translations saved in the ddoc and save them to the db. I think this is because another tool is used to add translations.
    await translations.run();//Merging translations seems like it should still happen with archv3. Init only
    logger.info('Translations merged successfully');

    logger.info('Running db migrations…');
    await migrations.run();//Init only
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
