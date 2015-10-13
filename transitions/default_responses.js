var _ = require('underscore'),
    moment = require('moment'),
    libphonenumber = require('libphonenumber'),
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
    /*
     * Avoid infinite loops of auto-reply messages between gateway and itself.
     */
    _isMessageFromGateway: function(doc) {
        var self = module.exports,
            gw = self._getConfig('gateway_number');
        if (typeof gw === 'string' && typeof doc.from === 'string') {
            return libphonenumber.phoneUtil.isNumberMatch(gw, doc.from) >= 3;
        }
        return false;
    },
    /*
     * Return false when the recipient phone matches the denied list.
     *
     * outgoing_deny_list is a comma separated list of strings. If a string in
     * that list matches the beginning of the phone then we set up a response
     * with a denied state. The pending message process will ignore these
     * messages and those reports will be left without an auto-reply. The
     * denied messages still show up in the messages export.
     */
    _isResponseAllowed: function(doc) {
        var self = module.exports,
            conf = self._getConfig('outgoing_deny_list') || '';
        if (self._isMessageFromGateway(doc)) {
            return false;
        }
        return _.every(conf.split(','), function(s) {
            // ignore falsey inputs
            if (!s || !doc.from) {
                return true;
            }
            return !doc.from.match(
                new RegExp('^' + utils.escapeRegex(s.trim()), 'i')
            );
        });
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
        if (!self._isResponseAllowed(doc)) {
            opts.state = 'denied';
        }
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
