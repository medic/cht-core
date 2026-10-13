const request = require('@medic/couch-request');
const secureSettings = require('@medic/settings');
const logger = require('@medic/logger');
const config = require('../config');

const BATCH_CONCURRENCY = 5;
const STATUS_MAP = {
  // HTTP error status codes (from error object in catch block)
  401: { success: false, state: 'failed', detail: 'InvalidCredentials' },
  422: { success: false, state: 'failed', detail: 'UnprocessableContent' },
  500: { success: false, state: 'failed', detail: 'InternalServerError', retry: true },
};
const MAX_ERROR_LENGTH = 255;
// Account-level errors that clear on their own, e.g. Balance not enough; only string errors are classified.
const RETRYABLE_ERROR = /balance/i;
// The cut can split a surrogate pair, and CouchDB rejects the whole batch write for a lone surrogate.
const bound = text => text.slice(0, MAX_ERROR_LENGTH).toWellFormed();

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
  // HTTP errors may expose either status or statusCode.
  if (response && response.status !== undefined) {
    return STATUS_MAP[response.status];
  }
  // For HTTP error status codes (in catch block)
  if (response && response.statusCode !== undefined) {
    return STATUS_MAP[response.statusCode];
  }
  return null;
};

const isPlainObject = body => body && typeof body === 'object' && !Array.isArray(body);

const parseJsonObject = text => {
  try {
    const parsed = JSON.parse(text);
    return isPlainObject(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const getErrorBody = err => {
  const body = err?.body;
  if (isPlainObject(body)) {
    return body;
  }
  if (typeof body === 'string') {
    return parseJsonObject(body);
  }
};

const isRetryableError = body => {
  return !!body && typeof body.errors === 'string' && RETRYABLE_ERROR.test(body.errors);
};

const selectErrorText = body => {
  if (typeof body.errors === 'string') {
    return body.errors;
  } else if (body.errors && typeof body.errors === 'object') {
    return JSON.stringify(body.errors);
  } else if (typeof body.message === 'string') {
    return body.message;
  }
};

const getGatewayError = body => {
  if (!body) {
    return;
  }
  const error = selectErrorText(body);
  return error === undefined ? undefined : bound(error);
};

const describeBody = body => {
  if (body === undefined || body === null || body === '') {
    return 'No response body';
  }
  return bound(typeof body === 'string' ? body : JSON.stringify(body));
};

const generateStateChange = (message, res, gatewayError) => {
  if (!res) {
    return;
  }
  const status = getStatus(res);
  if (!status || status.retry) {
    return;
  }
  const details = { code: res.statusCode, reason: status.detail };
  if (gatewayError !== undefined) {
    details.error = gatewayError;
  }
  return {
    messageId: message.id,
    state: status.state,
    details
  };
};

const classifyResponse = (message, body) => {
  logger.debug('SMS API Response: %o', body);

  if (body && typeof body === 'object' && !Array.isArray(body) &&
      body.status === 1 && Array.isArray(body.invalid_number)) {
    if (body.invalid_number.length === 0) {
      return { messageId: message.id, state: 'sent', details: 'Processed' };
    }
    logger.error(`Invalid numbers in SMS API response for message ${message.id}: %o`, body.invalid_number);
    return {
      messageId: message.id,
      state: 'failed',
      details: { reason: 'InvalidNumber', error: bound(JSON.stringify(body.invalid_number)) }
    };
  }

  logger.error(`Invalid SMS API response for message ${message.id}: %o`, body);
  return {
    messageId: message.id,
    state: 'failed',
    details: { reason: 'InvalidResponse', error: describeBody(body) }
  };
};

const handleRequestError = (message, err) => {
  // Handle HTTP errors (401, 422, 500, etc.)
  logger.error(`SMS API error for message ${message.id}: ${err.message}`);

  const errorStatus = getStatus(err);
  const body = getErrorBody(err);
  if (errorStatus && err.statusCode === 422 && isRetryableError(body)) {
    logger.warn(`Account-level SMS gateway error for message ${message.id}, will retry: ${getGatewayError(body)}`);
    return;
  }
  if (!errorStatus) {
    // Unknown error - retry later
    logger.error(`Unknown error sending SMS for message ${message.id}: %o`, err);
    return;
  }

  // Known error status - generate appropriate state change
  let error = getGatewayError(body);
  if (error === undefined && err.statusCode === 422) {
    error = describeBody(err.body);
  }
  return generateStateChange(message, err, error);
};

const sendMessage = async (credentials, message) => {
  const url = getUrl();
  if (!url) {
    logger.error('No URL configured');
    return; // retry later
  }

  logger.debug(`Sending message to "${url}"`);

  // Strip the country code from recipient number
  const recipientNumber = message.to.replace(/^\+977/, '');

  try {
    const result = await request.post({
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
    });

    return classifyResponse(message, result);
  } catch (err) {
    return handleRequestError(message, err);
  }
};

const processMessage = (credentials, message) => {
  return sendMessage(credentials, message);
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
    return getCredentials().then(async credentials => {
      if (!credentials) {
        // No credentials configured - nothing to send, preserve retry semantics
        return [];
      }
      const changes = [];
      // Process messages in batches to limit concurrency
      for (let i = 0; i < messages.length; i += BATCH_CONCURRENCY) {
        const batch = messages.slice(i, i + BATCH_CONCURRENCY);

        // Start batch in parallel
        const results = await Promise.allSettled(
          batch.map(message => processMessage(credentials, message))
        );

        // Collect successful state changes
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            changes.push(result.value);
          } else if (result.status === 'rejected') {
            logger.error('Error sending message in parallel batch: %o', result.reason);
            // Rejected messages will be retried later (no state change)
          }
        });
      }

      return changes;
    });
  }

};
