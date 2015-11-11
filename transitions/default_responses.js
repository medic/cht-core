var _ = require('underscore'),
    moment = require('moment'),
    config = require('../config'),
    utils = require('../lib/utils'),
    logger = require('../lib/logger'),
    messages = require('../lib/messages');

module.exports = {
    filter: function(doc) {
        var self = module.exports;
        return Boolean(
            doc
            && doc.from
            && doc.type === 'data_record'
            && !doc.kujua_message
            && self._isReportedAfterStartDate(doc)
        );
    },
    _isReportedAfterStartDate: function(doc) {
        var self = module.exports,
            config = self._getConfig('default_responses'),
            start_date = moment(config.start_date, 'YYYY-MM-DD');

        function isEmpty() {
            return !Boolean(
                config.start_date
                && config.start_date.trim()
            );
        }

        if (!isEmpty()) {
            if (start_date.isValid() && doc.reported_date) {
                return moment(doc.reported_date).isAfter(start_date);
            } else {
                logger.error('Invalid default_responses start date: ' + start_date);
            }
        }

        return false;
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
        module.exports._getConfig('forms_only_mode');
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
        var self = module.exports,
            opts = {
                doc: doc,
                phone: doc.from,
                message: msg
            };
        messages.addMessage(opts);
    },
    onMatch: function(change, db, audit, callback) {

        var self = module.exports,
            doc = change.doc,
            locale = self._getLocale(doc);

        if (self._isMessageEmpty(doc)) {
            self._addMessage(doc, self._translate('empty', locale));
        } else if (self._isConfigFormsOnlyMode() && self._isFormNotFound(doc)) {
            self._addMessage(doc, self._translate('form_not_found', locale));
        } else if (self._isFormNotFound(doc)) {
            self._addMessage(doc, self._translate('sms_received', locale));
        } else if (self._isValidUnstructuredMessage(doc)) {
            self._addMessage(doc, self._translate('sms_received', locale));
        }

        callback(null, true);
    }
};
