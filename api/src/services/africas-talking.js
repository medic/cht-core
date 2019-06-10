const request = require('request-promise-native');
const africasTalking = require('africastalking');
const environment = require('../environment');
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

// TODO Pull this function out as a service once this is merged: https://github.com/medic/medic/pull/5686/
const fetchApiKey = () => {
  return request.get(`${environment.serverUrl}/_node/${process.env.COUCH_NODE_NAME}/_config/medic-credentials/africastalking.com`)
    // This API gives weird psuedo-JSON results:
    //   "password"\n
    // Should be just `password`
    .then(result => result.match(/^"(.+)"\n?$/)[1])
    .catch(err => {
      if (err.statusCode === 404) {
        throw new Error(`CouchDB config key 'medic-credentials/africastalking.com' has not been populated. Refer to the Africa's Talking configuration documentation.`);
      }

      // Throw it regardless so the process gets halted, we just error above for higher specificity
      throw err;
    });
};

const getSettings = () => {
  const settings = config.get('sms');
  const username = settings &&
                   settings.africas_talking &&
                   settings.africas_talking.username;
  if (!username) {
    // invalid configuration
    return Promise.reject('No username configured. Refer to the Africa\'s Talking configuration documentation.');
  }
  return fetchApiKey().then(apiKey => ({ apiKey, username, from: settings.reply_to }));
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

const sendMessage = (lib, from, message) => {
  return lib.SMS
    .send({
      to: [ message.to ],
      from: from,
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
    // get the settings every call so changes can be made without restarting api
    return getSettings().then(settings => {
      const lib = module.exports._getLib(settings);
      return messages.reduce((promise, message) => {
        return promise.then(changes => {
          return sendMessage(lib, settings.from, message).then(change => {
            if (change) {
              changes.push(change);
            }
            return changes;
          });
        });
      }, Promise.resolve([]));
    });
  },

  _getLib: ({ apiKey, username }) => africasTalking({ apiKey, username })

};
