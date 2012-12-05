var _ = require('underscore'),
    async = require('async'),
    fs = require('fs'),
    path = require('path'),
    db,
    filters = {},
    transitions = {},
    queue;

_.each(fs.readdirSync(__dirname), function(file) {
    var transition,
        key = path.basename(file, path.extname(file));

    try {
        if (path.extname(file) === '.js' && file !== 'index.js') {
            transition = require('./' + key);
            filters[key] = generateFilter(key, transition);
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
    },
    filters: filters
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

function generateFilter(code, options) {
    return (function(doc) {
        var form = '__FORM__',
            fields = '__REQUIRED_FIELDS__';

        doc.transitions = doc.transitions || [];

        // if it's already gone through this transition, filter it out
        if (doc.transitions.indexOf('__CODE__') >= 0) {
            return false;
        // transition's form has to match, or be *
        } else if (form !== '*' && doc.form !== form) {
            return false;
        }

        // simple object truthiness test
        function test(obj, fields) {
            var field,
                result;

            if (!Array.isArray(fields)) {
                fields = fields.split('.')
            }
            field = fields.shift();
            if (obj && obj[field] && fields.length) {
                return test(obj[field], fields);
            } else {
                return !!(obj && obj[field]);
            }
        }

        if (fields === '') {
            fields = []
        } else {
            fields = fields.split(' ')
        }

        return fields.every(function(field) {
            var negate = field.indexOf('!') === 0,
                field = field.replace(/^!/, '');

            if (negate) {
                return !test(doc, field);
            } else {
                return test(doc, field);
            }
        });
    }).toString()
      .replace(/'__FORM__'/g, "'" + (options.form || '') + "'")
      .replace(/'__CODE__'/g, "'" + code + "'")
      .replace(/'__REQUIRED_FIELDS__'/g, "'" + options.requiredFields + "'")
}
