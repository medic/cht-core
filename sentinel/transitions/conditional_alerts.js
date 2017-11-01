var config = require('../config'),
    _ = require('underscore'),
    messages = require('../lib/messages'),
    utils = require('../lib/utils'),
    async = require('async'),
    transitionUtils = require('./utils'),
    NAME = 'conditional_alerts';

const runCondition = (condition, context, callback) => {
    try {
        callback(null, utils.evalExpression(context, condition));
    } catch(e) {
        callback(e.message);
    }
};

const evaluateCondition = (doc, alert, callback) => {
    var context = { doc: doc };
    if (alert.condition.indexOf(alert.form) === -1) {
        runCondition(alert.condition, context, callback);
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
            runCondition(alert.condition, context, callback);
        });
    }
};

module.exports = {
    _getConfig: function() {
        return _.extend({}, config.get('alerts'));
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
                    evaluateCondition(doc, alert, function(err, result) {
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
