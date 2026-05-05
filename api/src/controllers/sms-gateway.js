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
   * @openapi
   * /api/sms:
   *   get:
   *     summary: Check SMS gateway connectivity
   *     operationId: smsGet
   *     description: >
   *       Returns a simple response to verify that the cht-gateway SMS endpoint is available.
   *       See the [cht-gateway documentation](https://github.com/medic/cht-gateway) for more details.
   *     tags: [SMS]
   *     x-permissions:
   *       hasAll: [can_access_gateway_api]
   *     responses:
   *       '200':
   *         description: Gateway endpoint is available
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 medic-gateway:
   *                   type: boolean
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  get: (req, res) => {
    return checkAuth(req)
      .then(() => res.json({ 'medic-gateway': true }))
      .catch(err => serverUtils.error(err, req, res));
  },
  /**
   * @openapi
   * /api/sms:
   *   post:
   *     summary: Exchange SMS messages with cht-gateway
   *     operationId: smsPost
   *     description: >
   *       Processes incoming messages and delivery status updates from cht-gateway, and returns
   *       outgoing messages that are ready to be sent.
   *       See the [cht-gateway documentation](https://github.com/medic/cht-gateway) for more details.
   *     tags: [SMS]
   *     x-permissions:
   *       hasAll: [can_access_gateway_api]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               messages:
   *                 type: array
   *                 description: Incoming messages to process.
   *                 items:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       description: The message id.
   *                     from:
   *                       type: string
   *                       description: The sender's phone number.
   *                     content:
   *                       type: string
   *                       description: The message content.
   *                   required: [id, from, content]
   *               updates:
   *                 type: array
   *                 description: Delivery status updates for previously sent messages.
   *                 items:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       description: The message id.
   *                     status:
   *                       enum: [UNSENT, PENDING, SENT, DELIVERED, FAILED]
   *                       description: The delivery status from the gateway.
   *                     reason:
   *                       type: string
   *                       description: The reason for failure, if applicable.
   *                   required: [id, status]
   *             required: [messages]
   *     responses:
   *       '200':
   *         description: Outgoing messages ready to be sent
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 messages:
   *                   type: array
   *                   description: Outgoing messages for the gateway to send.
   *                   items:
   *                     type: object
   *                     additionalProperties: true
   *       '401':
   *         $ref: '#/components/responses/Unauthorized'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
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
