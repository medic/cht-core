const logger = require('@medic/logger');
const messaging = require('../services/messaging');
const serverUtils = require('../server-utils');
const secureSettings = require('@medic/settings');

// Map from Africa's Talking status codes to ours
// https://build.at-labs.io/docs/sms%2Fnotifications
// https://docs.communityhealthtoolkit.org/apps/guides/messaging/sms-states/
const STATUS_CODES = {
  // Sent: The message has successfully been sent by our network.
  Sent: 'forwarded-by-gateway',

  // Submitted: The message has successfully been submitted to the MSP (Mobile Service Provider).
  Submitted: 'sent',

  // Buffered: The message has been queued by the MSP.
  Buffered: 'sent',

  // Rejected: The message has been rejected by the MSP. This is a final status.
  Rejected: 'failed',

  // Success: The message has successfully been delivered to the receiver's handset. This is a final status.
  Success: 'delivered',

  // Failed: The message could not be delivered to the receiver's handset. This is a final status.
  Failed: 'failed'
};

const getIncomingKey = () => {
  return secureSettings.getCredentials('africastalking.com:incoming').then(key => {
    if (!key) {
      logger.warn('No incoming key configured. Refer to the Africa\'s Talking configuration documentation.');
      return Promise.reject({ code: 403, message: 'No incoming key configured' });
    }
    return key;
  });
};

const validateKey = req => {
  return getIncomingKey().then(expected => {
    const given = req.query.key;
    if (expected !== given) {
      logger.warn(`Attempt to access Africa's Talking endpoint without the correct incoming key`);
      return Promise.reject({ code: 403, message: 'Incorrect token' });
    }
  });
};

/**
 * @openapi
 * tags:
 *   - name: SMS
 *     description: Operations for SMS messaging integrations
 */
module.exports = {
  /**
   * @openapi
   * /api/v1/sms/africastalking/incoming-messages:
   *   post:
   *     summary: Receive incoming SMS from Africa's Talking
   *     operationId: v1SmsAfricasTalkingIncomingMessagesPost
   *     description: >
   *       Webhook endpoint for receiving incoming SMS messages from the Africa's Talking gateway.
   *       Requires a valid incoming key passed as a query parameter. See the
   *       [documentation](/building/messaging/gateways/africas-talking/) for more details.
   *     tags: [SMS]
   *     parameters:
   *       - in: query
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *         description: The configured incoming key for authentication.
   *     requestBody:
   *       required: true
   *       content:
   *         application/x-www-form-urlencoded:
   *           schema:
   *             type: object
   *             properties:
   *               id:
   *                 type: string
   *                 description: The Africa's Talking message id.
   *               from:
   *                 type: string
   *                 description: The sender's phone number.
   *               text:
   *                 type: string
   *                 description: The message content.
   *             required: [id, from, text]
   *     responses:
   *       '200':
   *         description: Message processing results
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               additionalProperties: true
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  incomingMessages: (req, res) => {
    return validateKey(req)
      .then(() => {
        if (!req.body) {
          return Promise.reject({ code: 400, message: 'Request body is required' });
        }
        const message = {
          id: req.body.id,
          from: req.body.from,
          content: req.body.text
        };
        return messaging.processIncomingMessages([ message ]);
      })
      .then(results => res.json(results))
      .catch(err => serverUtils.error(err, req, res));
  },
  /**
   * @openapi
   * /api/v1/sms/africastalking/delivery-reports:
   *   post:
   *     summary: Receive delivery reports from Africa's Talking
   *     operationId: v1SmsAfricasTalkingDeliveryReportsPost
   *     description: >
   *       Webhook endpoint for receiving SMS delivery status reports from the Africa's Talking gateway.
   *       Requires a valid incoming key passed as a query parameter. See the
   *       [documentation](/building/messaging/gateways/africas-talking/) for more details.
   *     tags: [SMS]
   *     parameters:
   *       - in: query
   *         name: key
   *         required: true
   *         schema:
   *           type: string
   *         description: The configured incoming key for authentication.
   *     requestBody:
   *       required: true
   *       content:
   *         application/x-www-form-urlencoded:
   *           schema:
   *             type: object
   *             properties:
   *               id:
   *                 type: string
   *                 description: The gateway message reference.
   *               status:
   *                 enum: [Sent, Submitted, Buffered, Rejected, Success, Failed]
   *                 description: The delivery status from Africa's Talking.
   *               failureReason:
   *                 type: string
   *                 description: The reason for failure, if applicable.
   *             required: [id, status]
   *     responses:
   *       '200':
   *         description: Delivery report processing results
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               additionalProperties: true
   *       '400':
   *         $ref: '#/components/responses/BadRequest'
   *       '403':
   *         $ref: '#/components/responses/Forbidden'
   */
  deliveryReports: (req, res) => {
    return validateKey(req)
      .then(() => {
        const state = STATUS_CODES[req.body.status];
        if (!state) {
          return Promise.reject({
            code: 400,
            message: `Unknown status code: "${req.body.status}", gateway message reference: "${req.body.id}"`
          });
        }
        return messaging.updateMessageTaskStates([{
          state: state,
          details: req.body.failureReason,
          gatewayRef: req.body.id
        }]);
      })
      .then(results => res.json(results))
      .catch(err => serverUtils.error(err, req, res));
  },
};
