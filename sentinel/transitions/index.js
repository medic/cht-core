var _ = require('underscore'),
    async = require('async'),
    fs = require('fs'),
    path = require('path'),
    db,
    transitions = {},
    queue;

_.each(fs.readdirSync(__dirname), function(file) {
    var transition,
        key = path.basename(file, path.extname(file));

    try {
        if (file !== 'index.js') {
            transition = require('./' + key);
            transitions[key] = transition;
        }
    } catch(e) {
        // only log exceptions
        console.error(e);
    }
});

module.exports = {
    attach: function() {
        db = db || require('../db');

        _.each(transitions, function(transition, key) {
            var queue,
                stream;

            queue = async.queue(function(change, callback) {
                transition.onMatch(change, function(err, complete) {
                    if (err) {
                        callback(err);
                    } else {
                        if (complete) {
                            finalize(key, change, callback);
                        } else {
                            callback();
                        }
                    }
                });
            }, 1);
            stream = db.changesStream({
                filter: 'kujua-sentinel/' + key,
                include_docs: true
            });
            stream.on('data', function(change) {
                queue.push(change);
            });
            console.log('Listening for changes for the ' + key + ' transition.');
        });
    }
}

function finalize(key, change, callback) {
    var doc = change.doc;

    doc.transitions = doc.transitions || [];
    doc.transitions.push(key);
    db.saveDoc(doc, function(err, result) {
        if (err) {
            console.log(JSON.stringify(err));
        }
        callback();
    });
}
