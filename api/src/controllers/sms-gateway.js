/**
 * This module implements GET and POST to support medic-gateway's API
 * @see https://github.com/medic/medic-gateway
 */
const db = require('../db');
const auth = require('../auth');
const messaging = require('../services/messaging');
const records = require('../services/records');
const logger = require('../logger');
const config = require('../config');
const serverUtils = require('../server-utils');

// map from the medic-gateway state to the medic app's state
const STATUS_MAP = {
  UNSENT:    'received-by-gateway',
  PENDING:   'forwarded-by-gateway',
  SENT:      'sent',
  DELIVERED: 'delivered',
  FAILED:    'failed',
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
  return messaging.updateMessageTaskStates(taskStateChanges);
};

const getOutgoing = () => {
  if (!messaging.isMedicGatewayEnabled()) {
    return [];
  }
  return messaging.getOutgoingMessages().then(messages => {
    return markMessagesForwarded(messages).then(() => messages);
  });
};

const runTransitions = docs => {
  return config.getTransitionsLib().processDocs(docs);
};

// Process webapp-terminating messages
const addNewMessages = req => {
  let messages = req.body.messages;
  if (!messages || !messages.length) {
    return Promise.resolve();
  }

  messages = messages.filter(message => {
    if (message.from !== undefined && message.content !== undefined) {
      return true;
    }
    logger.info(`Message missing required field: ${JSON.stringify(message)}`);
  });

  const keys = messages.map(m => m.id);
  // TODO most of this should be in the service so AT can use it!
  return db.medic.query('medic-sms/messages_by_gateway_ref', { keys })
    .then(res => res.rows.map(r => r.key))
    .then(seenIds => messages.filter(m => {
      if (seenIds.includes(m.id)) {
        logger.info(`Ignoring message (ID already seen): ${m.id}`);
      } else {
        return true;
      }
    }))
    .then(messages => messages.map(message => records.createByForm({
      from: message.from,
      message: message.content,
      gateway_ref: message.id,
    })))
    .then(docs => runTransitions(docs))
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
  return messaging.updateMessageTaskStates(taskStateChanges);
};

const checkAuth = req => auth.check(req, 'can_access_gateway_api');

module.exports = {
  get: (req, res) => {
    return checkAuth(req)
      .then(() => res.json({ 'medic-gateway': true }))
      .catch(err => serverUtils.error(err, req, res));
  },
  post: (req, res) => {
    return checkAuth(req)
      .then(() => addNewMessages(req))
      .then(() => processTaskStateUpdates(req))
      .then(() => getOutgoing())
      .then(messages => res.json({ messages }))
      .catch(err => serverUtils.error(err, req, res));
  },
};
