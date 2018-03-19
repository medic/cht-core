const config = require('./config'),
      logger = require('./lib/logger'),
      loglevel = process.argv[2];

if (loglevel === 'debug') {
  logger.info('setting loglevel to %s.', loglevel);
  logger.transports.Console.level = loglevel;
}

if (process.env.TEST_ENV) {
  logger.info('TEST_ENV is set, server does not run in test mode.');
  return;
}

const MIN_MAJOR = 8;
const nodeVersionCheck = () => {
  try {
    const [major, minor, patch] = process.versions.node.split('.').map(Number);
    if (major < MIN_MAJOR) {
      // TODO: re-enable this before releasing 3.0
      // throw new Error(`Node version ${major}.${minor}.${patch} is not supported, minimum is ${MIN_MAJOR}.0.0`);
      console.warn(`Node version ${major}.${minor}.${patch} is not supported, minimum is ${MIN_MAJOR}.0.0`);
    }
    console.log(`Node Version: ${major}.${minor}.${patch}`);
  } catch (err) {
    console.error('Fatal error intialising medic-sentinel');
    console.log(err);
    process.exit(1);
  }
};

nodeVersionCheck();

config.init()
  .then(() => {
    if (!loglevel) {
      logger.transports.Console.level = config.get('loglevel');
      logger.debug('loglevel is %s.', logger.transports.Console.level);
    }
    require('./schedule').checkSchedule();
    logger.info('startup complete.');
  })
  .catch(err => {
    console.error('Fatal error intialising medic-sentinel');
    console.log(err);
    process.exit(1);
  });
