var config = require('../config'),
    _ = require('underscore'),
    mustache = require('mustache'),
    messages = require('../lib/messages'),
    utils = require('../lib/utils'),
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
                    return rows[rows.length - 1 - i];
                }
                module.exports._runCondition(alert.condition, context, callback);
            });
        }
    },
    filter: function(doc) {
        return Boolean(doc.form);
    },
    onMatch: function(change, db, callback) {
        var doc = change.doc,
            config = module.exports._getConfig();

        async.each(
            config, 
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
                            var message = mustache.to_html(alert.message, {
                                facility_name: utils.getClinicName(doc, true),
                                form: doc
                            });
                            messages.addMessage({
                                doc: doc,
                                phone: phone,
                                message: message
                            });
                        }
                        callback();
                    });
                } else {
                    callback();
                }
            }, 
            function(err) {
                if (err) {
                    callback(err, true);    
                } else {
                    db.saveDoc(doc, function(err) {
                        callback(err, true);
                    });
                }
            }
        );

    }
};
