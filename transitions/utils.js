const db = require('../db'),
      messages = require('../lib/messages'),
      utils = require('../lib/utils'),
      idGenerator = require('../lib/ids').generator(db);

const findFirstMatchingMessage = (config, errorKey) => {
  if (!config.messages || !config.messages.length) {
    return null;
  }
  const matches = config.messages.filter(msg => msg.event_type === errorKey);
  return matches && matches[0];
};

module.exports = {
  /*
    Adds a "message" and "error" of the configured key to the report. This
    indicates something went wrong, and the key indicates what went wrong.
  */
  addRejectionMessage: (doc, reportConfig, errorKey) => {
    const config = findFirstMatchingMessage(reportConfig, errorKey);
    let message;
    if (config) {
      message = messages.getMessage(config, utils.getLocale(doc));
    } else {
      message = 'messages.generic.' + errorKey;
    }
    const recipient = config && config.recipient || 'from';
    const phone = messages.getRecipientPhone(doc, recipient);

    // A "message" ends up being a doc.task, which is something that is sent to
    // the caller via SMS
    messages.addMessage({
      doc: doc,
      message: message,
      phone: phone
    });
    // An "error" ends up being a doc.error, which is something that is shown
    // on the screen when you view the error. We need both
    messages.addError(doc, {
      message: message,
      code: errorKey
    });
  },
  addRegistrationNotFoundError: (doc, reportConfig) => {
    module.exports.addRejectionMessage(doc, reportConfig, 'registration_not_found');
  },
  isIdUnique: (db, id, callback) => {
    db.medic.view('medic-client', 'contacts_by_reference', {
      key: [ 'shortcode', id ]
    }, (err, results) => {
      callback(err, !!(results && results.rows && results.rows.length));
    });
  },
  addUniqueId: (db, doc, callback) => {
    idGenerator.next().value.then(patientId => {
      doc.patient_id = patientId;
      callback();
    }).catch(callback);
  },
  hasRun: (doc, transition) => {
    return !!(doc.transitions && doc.transitions[transition]);
  }
};
