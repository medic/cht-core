const request = require('@medic/couch-request');
const secureSettings = require('@medic/settings');
const logger = require('@medic/logger');
const config = require('../config');

const STATUS_MAP = {
  // success
  queued: { success: true, state: 'forwarded-by-gateway', detail: 'Processed' },
  sent: { success: true, state: 'sent', detail: 'Sent' },

  // failure
  unauthenticated: { success: false, state: 'failed', detail: 'InvalidCredentials' },
  invalid_number: { success: false, state: 'failed', detail: 'InvalidPhoneNumber' }
};

const getUrl = () => {
  const settings = config.get('sms');

  const url = settings &&
    settings.nepal_doit_sms &&
    settings.nepal_doit_sms.url;
  if (!url) {
    // invalid configuration
    return Promise.reject('No URL configured. Refer to the Nepal DoIT SMS configuration documentation.');
  }
  return url;
};

const getCredentials = () => {
  return secureSettings.getCredentials('nepal_doit_sms:outgoing')
    .then(apiKey => {
      if (!apiKey) {
        return Promise.reject('No api key configured. Refer to the Nepal DoIT SMS configuration documentation.');
      }
      return { apiKey };
    });
};

const getResponseMessage = res => {
  return res &&
    res.message;
};

const getStatus = responseMessage => {
  // Response messages according to: https://sms.doit.gov.np/developer-guide
  if (typeof responseMessage === 'string') {
    if (responseMessage.toLowerCase().includes('queued')) {
      return STATUS_MAP.queued;
    }
    if (responseMessage.toLowerCase().includes('sent')) {
      return STATUS_MAP.sent;
    }
    if (responseMessage.toLowerCase().includes('unauthenticated')) {
      return STATUS_MAP.unauthenticated;
    }
    if (responseMessage.toLowerCase().includes('invalid number')) {
      return STATUS_MAP.invalid_number;
    }
  }
};

const generateStateChange = (message, res) => {
  const responseMessage = getResponseMessage(res);
  if (!responseMessage) {
    return;
  }
  const status = getStatus(responseMessage);
  return {
    messageId: message.id,
    // gatewayRef: recipient.messageId,
    state: status.state,
    details: status.message
  };
};


const sendMessage = (credentials, message) => {
  const url = getUrl();
  logger.debug(`Sending message to "${url}"`);

  // Strip the country code from recipient number
  const recipientNumber = message.to.replace(/^\+977/, '');

  return request
    .post({
      url: url,
      json: true,
      body: {
        mobile: recipientNumber,
        message: message.content
      },
      headers: {
        authorization: `Bearer ${credentials.apiKey}`,
        accept: 'application/json'
      }
    })
    .then(result => {
      if (!result) {
        logger.error(`Unable to JSON parse response: %o`, result);
        return; // retry later
      }
      const validResponse = getStatus(result.message);
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
