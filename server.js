var _ = require('underscore'),
    db = require('./db'),
    config = require('./config'),
    logger = require('./lib/logger'),
    arg = process.argv[2];

if (arg === 'debug') {
    logger.info('setting loglevel to %s.', arg);
    logger.transports.console.level = arg;
}

function completeSetup(err, design) {
    if (err) {
        console.error(JSON.stringify(err));
        process.exit(1);
    } else {
        config.load(function(err) {
            if (err) {
                console.error('error loading config', err);
                process.exit(1);
            }
            logger.info('loaded config.');
            if (!arg) {
                logger.transports.console.level = config.get('loglevel');
                logger.debug('loglevel is %s.', logger.transports.console.level);
            }
            logger.info('attaching transitions...');
            require('./transitions').attach(design);
            require('./schedule').checkSchedule();
            config.listen();
            logger.info('startup complete.');
        });
    }
}

db.getDoc('_design/kujua-sentinel', function(err, doc) {
    var base = require('./designs/base.json'),
        matches;

    if (err) {
        if (err.error === 'not_found') {
            db.saveDesign('kujua-sentinel', base, function(err, ok) {
                completeSetup(err, base);
            });
        } else {
            logger.error("Failed to create design document: " + err);
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
            db.saveDoc(doc, function(err, ok) {
                completeSetup(err, doc);
            });
        }
    }
});
