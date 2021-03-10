const phoneNumber = require('@medic/phone-number');
const db = require('../db');
const logger = require('../logger');
const config = require('../config');
const africasTalking = require('./africas-talking');
const rapidPro = require('./rapid-pro');
const records = require('../services/records');
const messagingUtils = require('./messaging-utils');

const DB_CHECKING_INTERVAL = 1000 * 10; // Check DB for messages every minute
const SMS_SENDING_SERVICES = {
  'africas-talking': africasTalking,
  'rapid-pro': rapidPro,
  // medic-gateway -- ignored because it's a pull not a push service
};
const DEFAULT_CONFIG = { outgoing_service: 'medic-gateway' };

const getConfig = () => config.get('sms') || DEFAULT_CONFIG;

const getOutgoingMessageService = () => {
  const config = getConfig();
  return config.outgoing_service &&
         SMS_SENDING_SERVICES[config.outgoing_service];
};

const checkDbForMessagesToSend = () => {
  logger.debug('Checking for a configured outgoing message service');
  const service = getOutgoingMessageService();
  if (!service) {
    return Promise.resolve();
  }
  logger.debug('Checking for pending outgoing messages');
  return module.exports.getOutgoingMessages()
    .then(messages => {
      logger.info(`Sending ${messages.length} messages`);
      if (!messages.length) {
        return;
      }
      return sendMessages(service, messages);
    })
    .catch(err => logger.error('Error sending outgoing messages: %o', err));
};

const checkDbForMessagesToUpdate = () => {
  const service = getOutgoingMessageService();
  if (!service || !service.poll) {
    return Promise.resolve();
  }

  return service.poll();
};


const getPendingMessages = doc => {
  const tasks = [].concat(doc.tasks || [], doc.scheduled_tasks || []);
  return tasks.reduce((memo, task) => {
    if (task.messages) {
      task.messages.forEach(msg => {
        if (
          msg.uuid &&
          msg.to &&
          msg.message &&
          (task.state === 'pending' || task.state === 'forwarded-to-gateway')
        ) {
          memo.push({
            content: msg.message,
            to: msg.to,
            id: msg.uuid,
          });
        }
      });
    }
    return memo;
  }, []);
};

const sendMessages = (service, messages) => {
  if (!messages.length) {
    return;
  }
  return service
    .send(messages)
    .then(statusUpdates => module.exports.updateMessageTaskStates(statusUpdates));
};

const validateRequiredFields = messages => {
  const requiredFields = [ 'id', 'content', 'from' ];
  return messages.filter(message => {
    return requiredFields.every(field => {
      if (!message[field]) {
        logger.warn(`Message missing required field "${field}": ${JSON.stringify(message)}`);
      } else {
        return true;
      }
    });
  });
};

const removeDuplicateMessages = messages => {
  if (!messages.length) {
    return Promise.resolve([]);
  }
  const keys = messages.map(message => message.id);
  return db.medic.query('medic-sms/messages_by_gateway_ref', { keys })
    .then(res => res.rows.map(row => row.key))
    .then(seenIds => messages.filter(message => {
      if (seenIds.includes(message.id)) {
        logger.info(`Ignoring message (ID already seen): "${message.id}"`);
      } else {
        return true;
      }
    }));
};

const validateIncomingMessages = messages => {
  return removeDuplicateMessages(validateRequiredFields(messages));
};

const createDocs = messages => {
  if (!messages.length) {
    return [];
  }
  const docs = messages.map(message => records.createByForm({
    from: message.from,
    message: message.content,
    gateway_ref: message.id,
  }));
  return config.getTransitionsLib().processDocs(docs);
};

module.exports = {

  /**
   * Sends pending messages on the doc with the given ID using the
   * configured outgoing message service.
   */
  send: docId => {
    const service = getOutgoingMessageService();
    if (!service) {
      return Promise.resolve();
    }
    return db.medic.get(docId).then(doc => {
      return sendMessages(service, getPendingMessages(doc));
    });
  },

  /**
   * Stores incoming messages in the database.
   * @param messages an array of message objects with properties
   *    - id: unique gateway reference used to prevent double handling
   *    - from: the phone number of the original sender
   *    - content: the string message
   * Returns a Promise to resolve an object with the number of
   *    messages saved to the database.
   */
  processIncomingMessages: (messages=[]) => {
    return validateIncomingMessages(messages)
      .then(messages => createDocs(messages))
      .then(results => {
        const allOk = results.every(result => result.ok);
        if (!allOk) {
          logger.error('Failed saving all the new docs: %o', results);
          throw new Error('Failed saving all the new docs');
        }
        return { saved: results.length };
      });
  },

  /**
   * Returns a Promise which resolves the first 25 messages in either
   * "pending" or "forwarded-to-gateway" state.
   */
  getOutgoingMessages: () => {
    const viewOptions = {
      limit: 25,
      startkey: [ 'pending-or-forwarded', 0 ],
      endkey: [ 'pending-or-forwarded', '\ufff0' ],
    };
    return db.medic.query('medic/messages_by_state', viewOptions)
      .then(response => response.rows.map(row => {
        if (row.value.to) {
          const normalized = phoneNumber.normalize(config.get(), row.value.to);
          if (normalized) {
            row.value.to = normalized;
          }
        }
        return row.value;
      }));
  },
  /**
   * Returns true if the configured outgoing messaging service is set
   * to "medic-gateway". We don't want to get into the situation of
   * two services sending the same message.
   */
  isMedicGatewayEnabled: () => {
    return getConfig().outgoing_service === 'medic-gateway';
  },

  updateMessageTaskStates: messagingUtils.updateMessageTaskStates,

};

if (process.env.UNIT_TEST_ENV) {
  module.exports._checkDbForMessagesToSend = checkDbForMessagesToSend;
} else {
  setInterval(checkDbForMessagesToSend, DB_CHECKING_INTERVAL);
  setInterval(checkDbForMessagesToUpdate, DB_CHECKING_INTERVAL);
}
