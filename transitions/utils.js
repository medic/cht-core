var _ = require('underscore'),
    messages = require('../lib/messages'),
    utils = require('../lib/utils');

module.exports = {
  addRegistrationNotFoundMessage: function(document, reportConfig) {
    var not_found_msg,
      default_msg = {
        doc: document,
        message: 'sys.registration_not_found',
        phone: messages.getRecipientPhone(document, 'from')
      };
    _.each(reportConfig.messages, function(msg) {
      if (msg.event_type === 'registration_not_found') {
        not_found_msg = {
          doc: document,
          message: messages.getMessage(msg, utils.getLocale(document)),
          phone: messages.getRecipientPhone(document, msg.recipient)
        };
      }
    });
    if (not_found_msg) {
      messages.addMessage(not_found_msg);
      messages.addError(not_found_msg.doc, not_found_msg.message);
    } else {
      messages.addMessage(default_msg);
      messages.addError(default_msg.doc, default_msg.message);
    }
  }
};
