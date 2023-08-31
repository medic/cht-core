/**
 * This module implements GET and POST to support medic-gateway's API
 * @module sms-gateway
 * @see https://github.com/medic/medic-gateway
 */
const auth = require('../auth');
const messaging = require('../services/messaging');
const serverUtils = require('../server-utils');

// map from the medic-gateway state to the medic app's state
const STATUS_MAP = {
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

// Process message status updates
const processTaskStateUpdates = req => {
  if (!req.body.updates) {
    return Promise.resolve();
  }
  const taskStateChanges = req.body.updates.map(mapStateFields);
  return messaging.updateMessageTaskStates(taskStateChanges);
};

// Process webapp-terminating messages
const addNewMessages = req => {
  const messages = req.body.messages;
  return messaging.processIncomingMessages(messages);
};

const checkAuth = req => auth.check(req, 'can_access_gateway_api');

module.exports = {
  /**
   * Check that the endpoint exists
   * @param {Object} req The request
   * @param {Object} res The response
   */
  get: (req, res) => {
    return checkAuth(req)
      .then(() => res.json({ 'medic-gateway': true }))
      .catch(err => serverUtils.error(err, req, res));
  },
  /**
   * Stores new incoming messages, outgoing message status updates,
   * and returns outgoing messages that are ready to be sent. 
   * @param {Object} req The request
   * @param {Object} res The response
   */
  post: (req, res) => {
    return checkAuth(req)
      .then(() => addNewMessages(req))
      .then(() => processTaskStateUpdates(req))
      .then(() => getOutgoing())
      .then(messages => res.json({ messages }))
      .catch(err => serverUtils.error(err, req, res));
  },
};
