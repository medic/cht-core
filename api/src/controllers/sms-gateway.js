/**
 * This module implements GET and POST to support medic-gateway's API
 * @see https://github.com/medic/medic-gateway
 */
const db = require('../db-pouch'),
      messageUtils = require('../message-utils'),
      recordUtils = require('./record-utils'),
      logger = require('../logger'),
      // map from the medic-gateway state to the medic-webapp state
      STATUS_MAP = {
        UNSENT: 'received-by-gateway',
        PENDING: 'forwarded-by-gateway',
        SENT: 'sent',
        DELIVERED: 'delivered',
        FAILED: 'failed',
      };

const mapStateFields = update => {
  const result = {
    messageId: update.id
  };
  result.state = STATUS_MAP[update.status];
  if (result.state) {
    if (update.reason) {
      result.details = { reason: update.reason };
    }
  } else {
    result.state = 'unrecognised';
    result.details = { gateway_status: update.status };
  }
  return result;
};

const markMessagesForwarded = messages => {
  const taskStateChanges = messages.map(message => ({
    messageId: message.id,
    state: 'forwarded-to-gateway'
  }));
  return new Promise((resolve, reject) => {
    messageUtils.updateMessageTaskStates(taskStateChanges, err => {
      if (err) {
        reject(err);
      } else {
        resolve(messages);
      }
    });
  });
};

const getOutgoing = () => {
  return new Promise((resolve, reject) => {
    messageUtils.getMessages({ states: ['pending', 'forwarded-to-gateway'] },
      (err, pendingMessages) => {
        if (err) {
          return reject(err);
        }
        resolve(pendingMessages.map(message => ({
          id: message.id,
          to: message.to,
          content: message.message,
        })));
    });
  });
};

// Process webapp-terminating messages
const addNewMessages = req => {
  let messages = req.body.messages;
  if (!messages || !messages.length) {
    return Promise.resolve();
  }

  messages = messages.filter(message => {
    if(message.from !== undefined && message.content !== undefined) {
      return true;
    }
    logger.info(`Message missing required field: ${JSON.stringify(message)}`);
  });

  const ids = messages.map(m => m.id);

  return db.medic.query('medic-sms/sms-messages', { keys:ids })
    .then(res => res.rows.map(r => r.key))
    .then(seenIds => messages.filter(m => {
      if (seenIds.includes(m.id)) {
        logger.info(`Ignoring message (ID already seen): ${m.id}`);
      } else {
        return true;
      }
    }))
    .then(messages => messages.map(message => recordUtils.createByForm({
      from: message.from,
      message: message.content,
      gateway_ref: message.id,
    })))
    .then(docs => db.medic.bulkDocs(docs))
    .then(results => {
      const allOk = results.every(result => result.ok);
      if (!allOk) {
        logger.error('Failed saving all the new docs: %o', results);
        throw new Error('Failed saving all the new docs');
      }
    });
};

// Process message status updates
const processTaskStateUpdates = req => {
  if (!req.body.updates) {
    return Promise.resolve();
  }
  const taskStateChanges = req.body.updates.map(mapStateFields);
  return new Promise((resolve, reject) => {
    messageUtils.updateMessageTaskStates(taskStateChanges, err => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
};

module.exports = {
  get: () => {
    return { 'medic-gateway': true };
  },
  post: req => {
    return Promise.resolve()
      .then(() => addNewMessages(req))
      .then(() => processTaskStateUpdates(req))
      .then(getOutgoing)
      .then(markMessagesForwarded)
      .then(outgoingMessages => ({ messages: outgoingMessages }));
  },
};
