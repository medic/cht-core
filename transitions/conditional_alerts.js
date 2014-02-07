var config = require('../config'),
    _ = require('underscore'),
    messages = require('../lib/messages'),
    vm = require('vm');

module.exports = {
    _getConfig: function() {
        return _.extend({}, config.get('alerts'));
    },
    filter: function(doc) {
        return Boolean(doc.form);
    },
    onMatch: function(change, db, callback) {
        var doc = change.doc,
            config = module.exports._getConfig();

        _.chain(config)
            .filter(function(alert) {
                // TODO build the context so conditions can query more data
                return alert.form === doc.form
                    && vm.runInNewContext(alert.condition, {doc: doc});
            })
            .each(function(alert) {
                messages.addMessage({
                    doc: doc,
                    phone: alert.recipient,
                    message: alert.message
                });
            });

        callback(null, true);
    }
};
