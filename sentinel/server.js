const config = require('./config'),
      logger = require('./lib/logger');

if (process.env.DEBUG) {
  logger.info('setting loglevel to debug');
  logger.level = 'debug';
}

if (process.env.TEST_ENV) {
  logger.info('TEST_ENV is set, server does not run in test mode.');
  return;
}

const nodeVersionCheck = () => {
  try {
    const [major, minor, patch] = process.versions.node.split('.').map(Number);
    if (major < 5) {
      // 5 seems to be where the majority of ES6 was added without flags.
      // Seems safeist to not allow api to run
      throw new Error(`Node version ${major}.${minor}.${patch} is not supported`);
    }
    console.log(`Node Version: ${major}.${minor}.${patch}`);
    if (major < 6 || ( major === 6 && minor < 5)) {
      console.error('We recommend nodejs 6.5 or higher.');
    }
  } catch (err) {
    console.error('Fatal error intialising medic-sentinel');
    console.log(err);
    process.exit(1);
  }
};

nodeVersionCheck();

config.init()
  .then(() => {
    require('./schedule').checkSchedule();
    logger.info('startup complete.');
  })
  .catch(err => {
    console.error('Fatal error intialising medic-sentinel');
    console.log(err);
    process.exit(1);
  });
