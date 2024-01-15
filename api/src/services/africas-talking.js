const request = require('request-promise-native');
const secureSettings = require('@medic/settings');
const logger = require('../logger');
const config = require('../config');

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

const getCredentials = () => {
  const settings = config.get('sms');
  const username = settings &&
                   settings.africas_talking &&
                   settings.africas_talking.username;
  if (!username) {
    // invalid configuration
    return Promise.reject('No username configured. Refer to the Africa\'s Talking configuration documentation.');
  }
  return secureSettings.getCredentials('africastalking.com:outgoing')
    .then(apiKey => {
      if (!apiKey) {
        return Promise.reject('No api key configured. Refer to the Africa\'s Talking configuration documentation.');
      }
      return { apiKey, username, from: settings.reply_to };
    });
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
    messageId: message.id,
    gatewayRef: recipient.messageId,
    state: status.state,
    details: status.detail
  };
};

const getUrl = sandbox => {
  const prefix = sandbox ? 'sandbox.' : '';
  return `https://api.${prefix}africastalking.com/version1/messaging`;
};

const parseResponseBody = body => {
  try {
    return JSON.parse(body);
  } catch (e) {
    return;
  }
};

const sendMessage = (credentials, message) => {
  const url = getUrl(credentials.username === 'sandbox');
  logger.debug(`Sending message to "${url}"`);
  return request.post({
    url: url,
    simple: false,
    form: {
      username: credentials.username,
      from: credentials.from,
      to: message.to,
      message: message.content
    },
    headers: {
      apikey: credentials.apiKey,
      Accept: 'application/json'
    }
  })
    .then(body => {
      const result = parseResponseBody(body);
      if (!result) {
        logger.error(`Unable to JSON parse response: %o`, body);
        return; // retry later
      }
      const validResponse = getStatus(getRecipient(result));
      if (!validResponse) {
        logger.error(`Invalid response when trying to send messages: %o`, result);
        return; // retry later
      }
      return generateStateChange(message, result);
    })
    .catch(err => {
      // unknown error - ignore it so the message will be retried again later
      logger.error(`Error thrown trying to send messages: %o`, err);
    });
};

module.exports = {
  /**
   * Given an array of messages returns a promise which resolves an array
   * of responses.
   * @param messages An Array of objects with a `to` String and a `message` String.
   * @return A Promise which resolves an Array of state change objects.
   */
  send: messages => {
    // get the credentials every call so changes can be made without restarting api
    return getCredentials().then(credentials => {
      return messages.reduce((promise, message) => {
        return promise.then(changes => {
          return sendMessage(credentials, message).then(change => {
            if (change) {
              changes.push(change);
            }
            return changes;
          });
        });
      }, Promise.resolve([]));
    });
  }

};
