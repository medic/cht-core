var _ = require('underscore'),
    db = require('./db'),
    config = require('./config'),
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

function completeSetup(err) {
    if (err) {
        console.error(JSON.stringify(err));
        process.exit(1);
    } else {
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
    }
}

db.request({ db: 'medic', doc: '_design/kujua-sentinel' }, function(err, doc) {
    var base = require('./designs/base.json'),
        matches;

    if (err) {
        if (err.error === 'not_found') {
            db.medic.insert(base, '_design/kujua-sentinel', function(err) {
                completeSetup(err, base);
            });
        } else {
            logger.error(
                'failed to create design document: %s',
                JSON.stringify(err)
            );
        }
    } else {
        logger.debug('found sentinel design doc.');
        matches = _.all(_.keys(base), function(key) {
            return key.substring(0, 1) === '_' || JSON.stringify(base[key]) === JSON.stringify(doc[key]);
        });
        if (matches) {
            completeSetup(null, doc);
        } else {
            _.extend(doc, base);
            db.medic.insert(doc, function(err) {
                completeSetup(err, doc);
            });
        }
    }
});
