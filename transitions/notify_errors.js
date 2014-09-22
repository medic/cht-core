var _ = require('underscore'),
    config = require('../config'),
    messages = require('../lib/messages'),
    utils = require('../lib/utils');

var getMessage = function(doc) {
    var conf = _.findWhere(config.get('translations'), { key: 'sys.form_not_found' });
    var locale = utils.getLocale(doc);
    return messages.getMessage(conf.translations, locale);
};

module.exports = {
    filter: function(doc) {
        return doc.type === 'data_record' && doc.form && _.some(doc.errors, function(error) {
            return error.code === 'sys.form_not_found';
        });
    },
    onMatch: function(change, db, audit, callback) {
        var doc = change.doc;
        messages.addMessage({
            doc: doc,
            phone: messages.getRecipientPhone(doc),
            message: getMessage(doc),
            options: { form: doc.form }
        });
        callback(null, true);
    }
};
