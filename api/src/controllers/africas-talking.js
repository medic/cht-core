const logger = require('../logger');
const config = require('../config');
const messaging = require('../services/messaging');
const serverUtils = require('../server-utils');

// Map from Africa's Talking status codes to ours
// https://build.at-labs.io/docs/sms%2Fnotifications
// https://github.com/medic/medic-docs/blob/master/user/message-states.md
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

// Stolen from: https://github.com/expressjs/express/issues/2518#issuecomment-455775771
const isLocal = req => req.connection.localAddress === req.connection.remoteAddress;

const validateSource = req => {
  // allow "http" requests only from localhost
  if (isLocal(req)) {
    return;
  }
  if (req.protocol !== 'https') {
    // this should be blocked by our stack but adding here to double
    // check and prevent IP spoofing
    logger.warn(`Attempt to access Africa's Talking endpoint with protocol: "${req.protocol}", ${req.ip}`);
    return { code: 403, message: 'https is required' };
  }
  const settings = config.get('sms');
  const ips = settings &&
              settings.africas_talking &&
              settings.africas_talking.allowed_ips;
  if (!ips || !Array.isArray(ips) || !ips.includes(req.ip)) {
    logger.warn(`Attempt to access Africa's Talking endpoint by IP address not on allowed list: "${req.ip}"`);
    return { code: 403, message: 'Unknown IP address' };
  }
};

const checkAuth = (req, res) => {
  const err = validateSource(req);
  if (err) {
    serverUtils.error(err, req, res);
    return false;
  }
  return true;
};

module.exports = {
  incomingMessages: (req, res) => {
    if (!checkAuth(req, res)) {
      return;
    }
    if (!req.body) {
      serverUtils.error({ code: 400, message: 'Request body is required' }, req, res);
      return;
    }
    const message = {
      id: req.body.id,
      from: req.body.from,
      content: req.body.text
    };
    return messaging.processIncomingMessages([ message ])
      .then(results => res.json(results))
      .catch(err => serverUtils.error(err, req, res));
  },
  deliveryReports: (req, res) => {
    if (!checkAuth(req, res)) {
      return;
    }
    const state = STATUS_CODES[req.body.status];
    if (!state) {
      return serverUtils.error({
        code: 400,
        message: `Unknown status code: "${req.body.status}", gateway message reference: "${req.body.id}"`
      }, req, res);
    }
    return messaging.updateMessageTaskStates([{
      state: state,
      details: req.body.failureReason,
      gatewayRef: req.body.id
    }])
      .then(results => res.json(results))
      .catch(err => serverUtils.error(err, req, res));
  },
};
