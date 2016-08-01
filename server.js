var config = require('./config'),
    logger = require('./lib/logger'),
    arg = process.argv[2];

if (arg === 'debug') {
    logger.info('setting loglevel to %s.', arg);
    logger.transports.console.level = arg;
}

if (process.env.TEST_ENV) {
    logger.info('TEST_ENV is set, server does not run in test mode.');
    return;
}


config.init(function(err) {
    if (err) {
        logger.error('Error loading config: ', err);
        process.exit(1);
    }
    logger.info('loaded config.');
    if (!arg) {
        logger.transports.console.level = config.get('loglevel');
        logger.debug('loglevel is %s.', logger.transports.console.level);
    }
    logger.info('attaching transitions...');
    require('./transitions').attach();
    require('./schedule').checkSchedule();
    logger.info('startup complete.');
});
