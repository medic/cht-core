const logger = require('@medic/logger');
const messaging = require('../services/messaging');
const serverUtils = require('../server-utils');
const secureSettings = require('@medic/settings');

// mimic Authorization method of RapidPro outgoing
const AUTHORIZATION_HEADER_REGEX = /^Token\s+(.*)$/;

const getConfiguredIncomingToken = () => {
  return secureSettings.getCredentials('rapidpro:incoming').then(token => {
    if (!token) {
      logger.warn('No incoming key configured. Refer to the RapidPro configuration documentation.');
      return Promise.reject({ code: 403, message: 'No incoming key configured' });
    }
    return token;
  });
};

const getRequestAuthToken = (req) => {
  if (!req || !req.headers || !req.headers.authorization) {
    return;
  }

  const match = req.headers.authorization.match(AUTHORIZATION_HEADER_REGEX);
  if (!match) {
    return;
  }

  return match[1];
};

const validateRequest = req => {
  if (!req.body) {
    return Promise.reject({ code: 400, message: 'Request body is required' });
  }

  const givenToken = getRequestAuthToken(req);
  if (!givenToken) {
    logger.warn(`Attempt to access RapidPro endpoint without the an incoming token`);
    return Promise.reject({ code: 403, message: `Missing authorization token` });
  }

  return getConfiguredIncomingToken().then(expected => {
    if (expected !== givenToken) {
      logger.warn(`Attempt to access RapidPro endpoint without the correct incoming token`);
      return Promise.reject({ code: 403, message: `Incorrect token` });
    }
  });
};

module.exports = {
  /**
   * @openapi
   * /api/v1/sms/radpidpro/incoming-messages:
   *   post:
   *     summary: Receive incoming SMS from RapidPro
   *     operationId: v1SmsRadpidproIncomingMessagesPost
   *     deprecated: true
   *     description: >
   *       Use [POST /api/v2/sms/rapidpro/incoming-messages](#/SMS/v2SmsRapidProIncomingMessagesPost) instead.
   *       Webhook endpoint for receiving incoming SMS messages from the RapidPro gateway.
   *       Authenticated via an `Authorization: Token <key>` header. See the
   *       [documentation](/building/messaging/gateways/rapidpro/) for more details.
   *     tags: [SMS]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               id:
   *                 type: string
   *                 description: The RapidPro message id.
   *               from:
   *                 type: string
   *                 description: The sender's phone number.
   *               content:
   *                 type: string
   *                 description: The message content.
   *             required: [id, from, content]
   *     responses:
   *       '200':
   *         description: Message processing results
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 saved:
   *                   type: number
   *                   description: The number of messages saved.
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   * /api/v2/sms/rapidpro/incoming-messages:
   *   post:
   *     summary: Receive incoming SMS from RapidPro
   *     operationId: v2SmsRapidProIncomingMessagesPost
   *     description: >
   *       Webhook endpoint for receiving incoming SMS messages from the RapidPro gateway.
   *       Authenticated via an `Authorization: Token <key>` header. See the
   *       [documentation](/building/messaging/gateways/rapidpro/) for more details.
   *     tags: [SMS]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               id:
   *                 type: string
   *                 description: The RapidPro message id.
   *               from:
   *                 type: string
   *                 description: The sender's phone number.
   *               content:
   *                 type: string
   *                 description: The message content.
   *             required: [id, from, content]
   *     responses:
   *       '200':
   *         description: Message processing results
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 saved:
   *                   type: number
   *                   description: The number of messages saved.
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  incomingMessages: (req, res) => {
    return validateRequest(req)
      .then(() => {
        const message = {
          id: req.body.id,
          from: req.body.from,
          content: req.body.content,
        };
        return messaging.processIncomingMessages([ message ]);
      })
      .then(({ saved }) => {
        if (!saved) {
          return Promise.reject({ code: 400, message: 'Message was not saved' });
        }

        res.json({ saved });
      })
      .catch(err => serverUtils.error(err, req, res));
  },
};
