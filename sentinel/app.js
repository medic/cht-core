var _ = require('underscore'),
    db = require('./db'),
    config = require('./config'),
    transitions = require('./transitions');

function completeSetup(err, ok) {
    if (err) {
        console.error(JSON.stringify(err));
        process.exit(1);
    } else {
        config.load(function() {
            transitions.attach();
            require('./schedule');
            console.log('Kujua Sentinel startup complete.');
        });
    }
}

db.getDoc('_design/kujua-sentinel', function(err, doc) {
    var base = require('./designs/base.json'),
        matches;

    if (err) {
        if (err.error === 'not_found') {
            db.saveDesign('kujua-sentinel', base, completeSetup);
        } else {
            console.error("Could not find design document: " + err.reason);
        }
    } else {
        matches = _.all(_.keys(base), function(key) {
            return key.substring(0, 1) === '_' || JSON.stringify(base[key]) === JSON.stringify(doc[key]);
        });
        if (matches) {
            completeSetup();
        } else {
            _.extend(doc, base);
            db.saveDoc(doc, completeSetup);
        }
    }
});
