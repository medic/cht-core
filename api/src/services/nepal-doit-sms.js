const request = require('@medic/couch-request');
const secureSettings = require('@medic/settings');
const logger = require('@medic/logger');
const config = require('../config');

const STATUS_MAP = {
  // success - based on API response status field
  1: { success: true, state: 'sent', detail: 'Processed' },
  
  // HTTP error status codes (from error object in catch block)
  401: { success: false, state: 'failed', detail: 'InvalidCredentials' },
  422: { success: false, state: 'failed', detail: 'UnprocessableContent' },
  500: { success: false, state: 'failed', detail: 'InternalServerError', retry: true },
};

const getUrl = () => {
  const settings = config.get('sms');

  const url = settings?.nepal_doit_sms?.url;
  if (!url) {
  // invalid configuration - return null so callers can handle retry behavior
  logger.error('No URL configured. Refer to the Nepal DoIT SMS configuration documentation.');
  return null;
  }
  return url;
};

const getCredentials = () => {
  return secureSettings.getCredentials('nepal_doit_sms:outgoing')
    .then(apiKey => {
      if (!apiKey) {
  // no API key configured - return null so callers can handle retry behavior
  logger.error('No API key configured. Refer to the Nepal DoIT SMS configuration documentation.');
  return null;
      }
      return { apiKey };
    });
};

const getStatus = response => {
  // For API success response, check the status field
  if (response && response.status !== undefined) {
    return STATUS_MAP[response.status];
  }
  // For HTTP error status codes (in catch block)
  if (response && response.statusCode !== undefined) {
    return STATUS_MAP[response.statusCode];
  }
  return null;
};

const generateStateChange = (message, res) => {
  if (!res) {
    return;
  }
  const status = getStatus(res);
  if (!status || status.retry) {
    return;
  }
  return {
    messageId: message.id,
    state: status.state,
    details: status.detail
  };
};

const sendMessage = async (credentials, message) => {
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
        logger.error(`No response received: %o`, result);
        return; // retry later
      }
      
      logger.debug(`SMS API Response: %o`, result);
      
      // Use the API's own status field for validation
      const validResponse = getStatus(result);
      if (!validResponse) {
        logger.error(`SMS API returned status ${result.status}: %o`, result);
        return; // retry later - explicit return undefined
      }
      
      return generateStateChange(message, result);
    })
    .catch(err => {
      // Handle HTTP errors (401, 422, 500, etc.)
      logger.error(`SMS API error: ${err.message}`);
      
      const errorStatus = getStatus(err);
      if (errorStatus) {
        // Known error status - generate appropriate state change
        return generateStateChange(message, err);
      }
      
      // Unknown error - retry later
      logger.error(`Unknown error sending SMS: %o`, err);
    });
};

const processMessage = (credentials, message, changes) => {
  return sendMessage(credentials, message).then(change => {
    if (change) {
      changes.push(change);
    }
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
      if (!credentials) {
        // No credentials configured - nothing to send, preserve retry semantics
        return [];
      }
      const changes = [];
      let promise = Promise.resolve();
      
      messages.forEach(message => {
        promise = promise.then(() => processMessage(credentials, message, changes));
      });
      
      return promise.then(() => changes);
    });
  }

};
