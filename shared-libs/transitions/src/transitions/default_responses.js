const _ = require('lodash');
const moment = require('moment');
const config = require('../config');
const logger = require('../lib/logger');
const messages = require('../lib/messages');
const transitionUtils = require('./utils');
const NAME = 'default_responses';

module.exports = {
  name: NAME,
  filter: function(doc, info = {}) {
    const self = module.exports;
    return Boolean(
      doc &&
        doc.from &&
        doc.type === 'data_record' &&
        !doc.kujua_message &&
        self._isReportedAfterStartDate(doc) &&
        !transitionUtils.hasRun(info, NAME) &&
        !self._isMessageFromGateway(doc)
    );
  },
  /*
     * Avoid infinite loops of auto-reply messages between gateway and itself.
     */
  _isMessageFromGateway: function(doc) {
    const from = doc.sms_message && doc.sms_message.from;
    if (typeof from === 'string') {
      return messages.isMessageFromGateway(from);
    }
    return false;
  },
  _isReportedAfterStartDate: function(doc) {
    const self = module.exports;
    const config = self._getConfig(NAME);
    let start_date;

    const isEmpty = () => {
      return !(config && config.start_date && config.start_date.trim());
    };

    if (!isEmpty()) {
      start_date = moment(config.start_date, 'YYYY-MM-DD');
      if (start_date.isValid() && doc.reported_date) {
        return moment(doc.reported_date).isAfter(start_date);
      } else {
        logger.error(`Invalid default_responses start date: ${start_date}`);
      }
    }

    return false;
  },
  _isMessageEmpty: function(doc) {
    return Boolean(
      _.find(doc.errors, function(err) {
        return err.code === 'sys.empty';
      })
    );
  },
  _isFormNotFound: function(doc) {
    return Boolean(
      _.find(doc.errors, function(err) {
        return err.code === 'sys.form_not_found';
      })
    );
  },
  _isValidUnstructuredMessage: function(doc) {
    return Boolean(typeof doc.form !== 'string');
  },
  _isConfigFormsOnlyMode: function() {
    return module.exports._getConfig('forms_only_mode');
  },
  _getConfig: function(key) {
    return config.get(key);
  },
  onMatch: change => {
    const self = module.exports;
    const doc = change.doc;
    let key;

    if (self._isMessageEmpty(doc)) {
      key = 'empty';
    } else if (self._isConfigFormsOnlyMode() && self._isFormNotFound(doc)) {
      key = 'form_not_found';
    } else if (
      self._isFormNotFound(doc) ||
      self._isValidUnstructuredMessage(doc)
    ) {
      key = 'sms_received';
    }

    if (key) {
      messages.addMessage(doc, { translation_key: key });
    }

    return Promise.resolve(true);
  },
};
