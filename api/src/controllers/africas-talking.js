const logger = require('../logger');
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

module.exports = {
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
