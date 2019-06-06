const logger = require('../logger');
let africasTalking = require('africastalking')({
  apiKey: '9892f0a4fa88c9ce03ed6b5500e820afa99090caa6eb74e8351bccd961215140',
  username: 'sandbox'
});

// Map of sending statuses to Medic statuses
// https://build.at-labs.io/docs/sms%2Fsending
const STATUS_MAP = {
  // success
  100: { success: true, state: 'forwarded-by-gateway', detail: 'Processed' },
  101: { success: true, state: 'sent', detail: 'Sent' },
  102: { success: true, state: 'received-by-gateway', detail: 'Queued' },

  // failure
  401: { success: false, state: 'failed', detail: 'RiskHold' },
  402: { success: false, state: 'failed', detail: 'InvalidSenderId', retry: true },
  403: { success: false, state: 'failed', detail: 'InvalidPhoneNumber' },
  404: { success: false, state: 'failed', detail: 'UnsupportedNumberType' },
  405: { success: false, state: 'failed', detail: 'InsufficientBalance', retry: true },
  406: { success: false, state: 'denied', detail: 'UserInBlacklist' },
  407: { success: false, state: 'failed', detail: 'CouldNotRoute' },
  500: { success: false, state: 'failed', detail: 'InternalServerError', retry: true },
  501: { success: false, state: 'failed', detail: 'GatewayError', retry: true },
  502: { success: false, state: 'failed', detail: 'RejectedByGateway', retry: true },
};

const getRecipient = res => {
  return res &&
         res.SMSMessageData &&
         res.SMSMessageData.Recipients &&
         res.SMSMessageData.Recipients.length &&
         res.SMSMessageData.Recipients[0];
};

const getStatus = recipient => recipient && STATUS_MAP[recipient.statusCode];

const generateStateChange = (message, res) => {
  const recipient = getRecipient(res);
  if (!recipient) {
    return;
  }
  const status = getStatus(recipient);
  if (!status || status.retry) {
    return;
  }
  return {
    messageId: message.uuid,
    gatewayRef: recipient.messageId,
    state: status.state,
    details: status.detail
  };
};

const sendMessage = message => {
  return africasTalking.SMS
    .send({
      to: [ message.to ],
      message: message.content
    })
    .catch(res => {
      // The AT lib sometimes throws responses and sometimes errors...
      const validResponse = getStatus(getRecipient(res));
      if (!validResponse) {
        logger.error(`Error thrown trying to send messages: %o`, res);
        return; // unknown error
      }
      return res;
    })
    .then(res => generateStateChange(message, res));
};

module.exports = {
  /**
   * Given an array of messages returns a promise which resolves an array
   * of responses.
   * @param messages An Array of objects with a `to` String and a `message` String.
   * @return A Promise which resolves an Array of state change objects.
   */
  send: messages => {
    return messages.reduce((promise, message) => {
      return promise.then(changes => {
        return sendMessage(message).then(change => {
          if (change) {
            changes.push(change);
          }
          return changes;
        });
      });
    }, Promise.resolve([]));
  }
};

if (process.env.UNIT_TEST_ENV) {
  module.exports._resetLib = lib => africasTalking = lib;
}
