var _ = require('underscore'),
    config = require('../config'),
    utils = require('../lib/utils'),
    logger = require('../lib/logger'),
    messages = require('../lib/messages');

module.exports = {
    filter: function(doc) {
        return Boolean(
            doc
            && doc.from
            && doc.type === 'data_record'
        );
    },
    _isMessageEmpty: function(doc) {
        return Boolean(_.find(doc.errors, function(err) {
            return err.code === 'sys.empty';
        }));
    },
    _isFormNotFound: function(doc) {
        return Boolean(_.find(doc.errors, function(err) {
            return err.code === 'sys.form_not_found';
        }));
    },
    _isValidUnstructuredMessage: function(doc) {
        return Boolean(typeof doc.form !== 'string');
    },
    _isConfigFormsOnlyMode: function() {
        var self = module.exports;
        return self._getConfig('forms_only_mode');
    },
    _getConfig: function(key) {
        return config.get(key);
    },
    _getLocale: function(doc) {
        return utils.getLocale(doc);
    },
    _translate: function(key, locale) {
        return utils.translate(key, locale);
    },
    _addMessage: function(doc, msg) {
        messages.addMessage({
            doc: doc,
            phone: doc.from,
            message: msg
        });
    },
    onMatch: function(change, db, audit, callback) {

        var self = module.exports,
            doc = change.doc,
            locale = self._getLocale(doc);

        if (self._isMessageEmpty(doc)) {
            self._addMessage(doc, self._translate('empty', locale));
        } else if (self._isConfigFormsOnlyMode() && self._isFormNotFound(doc)) {
            self._addMessage(doc, self._translate('form_not_found', locale));
        } else if (self._isFormNotFound(doc) || self._isValidUnstructuredMessage(doc)) {
            self._addMessage(doc, self._translate('sms_received', locale));
        }

        callback(null, true);
    }
};
