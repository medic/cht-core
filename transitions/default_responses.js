var _ = require('underscore'),
    config = require('../config'),
    utils = require('../lib/utils'),
    logger = require('../lib/logger'),
    messages = require('../lib/messages');

module.exports = {
    filter: function(doc) {
        return doc
            && doc.type === 'data_record';
    },
    isMessageEmpty: function(doc) {
        return Boolean(_.find(doc.errors, function(err) {
            return err.code === 'sys.empty';
        }));
    },
    isFormNotFound: function(doc) {
        return Boolean(_.find(doc.errors, function(err) {
            return err.code === 'sys.form_not_found';
        }));
    },
    addMessage: function(doc, msg) {
        messages.addMessage({
            doc: doc,
            phone: doc.from,
            message: msg
        });
    },
    onMatch: function(change, db, audit, callback) {

        var self = module.exports,
            doc = change.doc,
            locale = utils.getLocale(doc);

        if (self.isMessageEmpty(doc)) {
            addMessage(doc, utils.translate('empty', locale));
        } else if (config.get('forms_only_mode') && self.isFormNotFound(doc)) {
            addMessage(doc, utils.translate('form_not_found', locale));
        } else if (self.isFormNotFound(doc)) {
            addMessage(doc, utils.translate('sms_recieved', locale));
        }

        callback(null, true);
    }
};
