var config = require('../config'),
    _ = require('underscore'),
    messages = require('../lib/messages'),
    utils = require('../lib/utils'),
    async = require('async'),
    vm = require('vm'),
    transitionUtils = require('./utils'),
    NAME = 'conditional_alerts';

module.exports = {
    _getConfig: function() {
        return _.extend({}, config.get('alerts'));
    },
    _runCondition: function(condition, context, callback) {
        try {
            callback(null, vm.runInNewContext(condition, context));
        } catch(e) {
            callback(e.message);
        }
    },
    _evaluateCondition: function(doc, alert, callback) {
        var context = { doc: doc };
        if (alert.condition.indexOf(alert.form) === -1) {
            module.exports._runCondition(alert.condition, context, callback);
        } else {
            utils.getReportsWithSameClinicAndForm({
                doc: doc,
                formName: alert.form
            }, function(err, rows) {
                if (err) {
                    return callback(err);
                }
                rows = _.sortBy(rows, function(row) {
                    return row.reported_date;
                });
                context[alert.form] = function(i) {
                    var row = rows[rows.length - 1 - i];
                    return row ? row.doc : row;
                };
                module.exports._runCondition(alert.condition, context, callback);
            });
        }
    },
    filter: function(doc) {
        return Boolean(
            doc &&
            doc.form &&
            doc.type === 'data_record' &&
            !transitionUtils.hasRun(doc, NAME)
        );
    },
    onMatch: function(change, db, audit, cb) {
        var doc = change.doc,
            config = module.exports._getConfig(),
            updated = false;

        async.each(
            _.values(config),
            function(alert, callback) {
                if (alert.form === doc.form) {
                    module.exports._evaluateCondition(doc, alert, function(err, result) {
                        if (err) {
                            return callback(err);
                        }
                        if (result) {
                            messages.addMessage(doc, alert, alert.recipient);
                            updated = true;
                        }
                        callback();
                    });
                } else {
                    callback();
                }
            },
            function(err) {
                cb(err, updated);
            }
        );

    }
};
