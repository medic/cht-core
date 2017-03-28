const async = require('async'),
      config = require('./config'),
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


const nodeVersionCheck = callback => {
  try {
    const [major, minor, patch] = process.versions.node.split('.').map(Number);

    console.log(`Node Version: ${major}.${minor}.${patch}`);

    if (major < 5) {
      // 5 seems to be where the majority of ES6 was added without flags.
      // Seems safeist to not allow api to run
      callback(new Error(`Node version ${major}.${minor}.${patch} is not supported`));
    }

    if (major < 6 || ( major === 6 && minor < 10)) {
      console.error('This node version may not be supported');
    }

    callback();
  } catch (error) {
    callback(error);
  }
};

const asyncLog = message => async.asyncify(() => console.log(message));

async.series([
  nodeVersionCheck,
  config.init,
  asyncLog('loaded config')
], err => {
  if (err) {
    console.error('Fatal error intialising medic-sentinel', err);
    process.exit(1);
  }

  if (!loglevel) {
    logger.transports.Console.level = config.get('loglevel');
    logger.debug('loglevel is %s.', logger.transports.Console.level);
  }
  logger.info('attaching transitions...');
  require('./transitions').attach();
  require('./schedule').checkSchedule();
  logger.info('startup complete.');
});
