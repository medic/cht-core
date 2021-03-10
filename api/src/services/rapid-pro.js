const _ = require('lodash');
const request = require('request-promise-native');
const secureSettings = require('@medic/settings');
const logger = require('../logger');
const config = require('../config');
const db = require('../db');
const messagingUtils = require('./messaging-utils');

// https://github.com/rapidpro/rapidpro/blob/28d3215d57c152af0a71798a4ffe9351d10a3e95/temba/msgs/models.py#L57
const STATUS_MAP = {
  // success
  queued: { success: true, state: 'received-by-gateway', detail: 'Queued' },
  wired: { success: true, state: 'forwarded-by-gateway', detail: 'Wired' },
  sent: { success: true, state: 'sent', detail: 'Sent' },
  delivered: { success: true, state: 'delivered', detail: 'Delivered', final: true },
  resent: { success: true, state: 'sent', detail: 'Resent' },

  // failure
  errored: { success: false, state: 'received-by-gateway', detail: 'Errored' }, // sending will be retried
  failed: { success: false, state: 'failed', detail: 'Failed', final: true },
};
const BATCH_SIZE = 25;

const getApiToken = () => {
  return secureSettings
    .getCredentials('rapidpro:outgoing')
    .then(apiToken => {
      if (!apiToken) {
        return Promise.reject('No api key configured. Refer to the RapidPro configuration documentation.');
      }
      return apiToken;
    });
};

const getHost = () => {
  const settings = config.get('sms');
  const url = settings &&
                   settings.rapidPro &&
                   settings.rapidPro.url;
  const textitUrl = 'https://textit.in';
  return url || textitUrl;
};

const getHeaders = token => ({
  Authorization: `Token ${token}`,
  Accept: 'application/json',
});

const getBroadcastUrl = url => `${url}/api/v2/broadcasts.json`;
const getMessagesUrl = url => `${url}/api/v2/messages.json`;

const getStatus = (result) => result.status && STATUS_MAP[result.status];
const getStatusUpdate = (status, messageId, gatewayRef) => ({
  messageId: messageId,
  gatewayRef: gatewayRef,
  state: status.state,
  details: status.detail
});

const sendMessage = (token, host, message) => {
  return request
    .post({
      url: getBroadcastUrl(host),
      json: true,
      body: {
        urns: [`tel:${message.to}`],
        text: message.content,
      },
      headers: getHeaders(token),
    })
    .then(result => {
      if (!result) {
        logger.error(`Empty response received`);
        return; // retry later
      }

      return getStatusUpdate(getStatus(result), message.id, result.id);
    })
    .catch(err => {
      // unknown error - ignore it so the message will be retried again later
      logger.error(`Error thrown trying to send messages: %o`, err);
    });
};

const getStateUpdates = (apiToken, messages) => {
  const host = getHost();

  let promiseChain = Promise.resolve([]);
  messages.forEach(message => {
    promiseChain = promiseChain.then((statusUpdates) => {
      return getState(apiToken, host, message).then(result => {
        statusUpdates.push(result);
        return statusUpdates;
      });
    });
  });

  return promiseChain;
};

const getState = (apiToken, host, { gateway_ref: gatewayRef, id: messageId }) => {
  if (!gatewayRef) {
    return;
  }

  return request
    .get({
      url: getMessagesUrl(host),
      json: true,
      qs: { broadcast: gatewayRef },
      headers: getHeaders(apiToken),
    })
    .then(result => {
      if (!result || !result.results || !result.results.length) {
        logger.debug(`Could not get status for message with gateway_ref ${gatewayRef}`);
        return;
      }

      const status = getStatus(result.results[0]);
      return getStatusUpdate(status, messageId, gatewayRef);
    })
    .catch(err => {
      // unknown error - ignore it so the message will be retried again later
      logger.error(`Error thrown trying to retrieve status updates: %o`, err);
    });
};

/**
 * polls recursively, increasing the skip every time to jump over messages that were not processed
 * @param skip
 * @returns {Promise}
 */
const recursivePoll = (skip = 0) => {
  return poll(skip)
    .then(({ statusUpdates, more }) => {
      return messagingUtils
        .updateMessageTaskStates(statusUpdates)
        // only increase the skip with the number of messages that were *not updated*
        // the updated messages could have changed to be in a final state and will not be in this list at all
        .then(({ saved= 0 }={}) => more && recursivePoll(skip + BATCH_SIZE - saved));
    })
    .catch(err => {
      logger.error('Error while polling message states: %o', err);
    });
};

/**
 * @typedef {Object} PollingResult
 * @property {Array} statusUpdates - an array of message status updates
 * @property {boolean} more - whether there are more messages in the list
 */

/**
 * Queries `gateway_messages_by_state` for a batch of messages that are in non-final states.
 * Returns an Array of state change objects for the batch of messages and whether or not there is a next batch.
 * @param skip {number} Number of rows to skip
 * @returns {PollingResult}
 */
const poll = (skip = 0) => {
  const nonFinalStates = Object
    .values(STATUS_MAP)
    .filter(status => !status.final)
    .map(status => status.state);

  const viewOptions = { keys: _.uniq(nonFinalStates), limit: BATCH_SIZE, skip };

  return getApiToken().then(apiToken => {
    return db.medic
      .query('medic-sms/gateway_messages_by_state', viewOptions)
      .then(result => {
        if (!result || !result.rows || !result.rows.length) {
          return { statusUpdates: [], more: false };
        }

        const messages = result.rows.map(row => row.value);
        return getStateUpdates(apiToken, messages)
          .then(statusUpdates => ({ statusUpdates, more: true }));
      });
  });
};

let polling = false;

module.exports = {
  /**
   * Given an array of messages returns a promise which resolves an array
   * of responses.
   * @param messages An Array of objects with a `to` String and a `message` String.
   * @returns A Promise which resolves an Array of state change objects.
   */
  send: (messages) => {
    // get the credentials every call so changes can be made without restarting api
    return getApiToken()
      .then(apiToken => {
        const host = getHost();
        let promiseChain = Promise.resolve([]);
        messages.forEach(message => {
          promiseChain = promiseChain.then((statusUpdates) => {
            return sendMessage(apiToken, host, message).then(result => {
              statusUpdates.push(result);
              return statusUpdates;
            });
          });
        });

        return promiseChain;
      });
  },

  /**
   * Polls RapidPro `messages` endpoint to check for status updates of every outgoing message that
   * is in a non-final state.
   * Polling is done in batches of 25, recursively, until the whole list is iterated over.
   * Will return current polling "instance" if already polling.
   * @returns {Promise} that resolves when the whole list has been iterated over.
   */
  poll: () => {
    if (polling) {
      return polling;
    }

    polling = recursivePoll().then(() => polling = false);
    return polling;
  },
};
