var config = require('../config'),
    _ = require('underscore'),
    mustache = require('mustache'),
    messages = require('../lib/messages'),
    utils = require('../lib/utils'),
    logger = require('../lib/logger'),
    async = require('async'),
    vm = require('vm');

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
        if (alert.condition.indexOf(alert.form) == -1) {
            module.exports._runCondition(alert.condition, context, callback);
        } else {
            utils.getRecentForm({
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
                }
                module.exports._runCondition(alert.condition, context, callback);
            });
        }
    },
    filter: function(doc) {
        return Boolean(
            doc &&
            doc.form &&
            doc.type === 'data_record'
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
                        } else if(result) {
                            var phone = messages.getRecipientPhone(
                                doc, 
                                alert.recipient, 
                                alert.recipient
                            );
                            messages.addMessage({
                                doc: doc,
                                phone: phone,
                                message: alert.message
                            });
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
