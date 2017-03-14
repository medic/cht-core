var _ = require('underscore'),
    ids = require('../lib/ids'),
    logger = require('../lib/logger'),
    messages = require('../lib/messages'),
    utils = require('../lib/utils');

var DEFAULT_ID_LENGTH = 5;
var IDS_TO_GENERATE = 5;
var currentIdLength = DEFAULT_ID_LENGTH;

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
  },
  addUniqueId: function(db, doc, callback) {
    var potentialIds = _.map(Array(IDS_TO_GENERATE), _.partial(ids.generate, currentIdLength));

    utils.getRegistrations({
        db: db,
        ids: potentialIds
    }, function(err, registrations) {
        if (err) {
            return callback(err);
        }

        var uniqueIds = _.reject(potentialIds, function(id) {
          return _.find(registrations, function(registration) {
            return registration.key === id;
          });
        });

        if (!uniqueIds.length) { // id collision, retry
            logger.warn('Could not create a unique id of length ' + currentIdLength + ', increasing by one');
            currentIdLength += 1;
            module.exports.addUniqueId(db, doc, callback);
        } else {
            doc.patient_id = uniqueIds[0];
            callback();
        }
    });
  }
};
