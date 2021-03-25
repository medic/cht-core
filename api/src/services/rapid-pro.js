const _ = require('lodash');
const request = require('request-promise-native');
const secureSettings = require('@medic/settings');
const logger = require('../logger');
const config = require('../config');
const db = require('../db');

/**
 * Mapping of RapidPro message/broadcast statuses to CHT-Core message states
 * Keys represent RapidPro statuses, `state` fields represent CHT-Core states
 * https://github.com/rapidpro/rapidpro/blob/28d3215d57c152af0a71798a4ffe9351d10a3e95/temba/msgs/models.py#L57
 */
const STATUS_MAP = {
  // success
  queued: { success: true, state: 'received-by-gateway', detail: 'Queued' },
  wired: { success: true, state: 'forwarded-by-gateway', detail: 'Wired' },
  sent: { success: true, state: 'sent', detail: 'Sent' }, // todo Reviewer: should this be a final state?????
  delivered: { success: true, state: 'delivered', detail: 'Delivered', final: true },
  resent: { success: true, state: 'sent', detail: 'Resent' },

  // failure
  errored: { success: false, state: 'received-by-gateway', detail: 'Errored' }, // sending will be retried
  failed: { success: false, state: 'failed', detail: 'Failed', final: true },
};
const BATCH_SIZE = 25;

const nonFinalStates = Object
  .values(STATUS_MAP)
  .filter(status => !status.final)
  .map(status => status.state);

const getCredentials = () => {
  // Supports self-hosted RapidPro instances, but defaults to textit.in
  const settings = config.get('sms');
  const url = settings &&
              settings.rapidPro &&
              settings.rapidPro.url;
  const textitUrl = 'https://textit.in';
  const host =  url || textitUrl;

  return secureSettings.getCredentials('rapidpro:outgoing').then(apiToken => {
    if (!apiToken) {
      return Promise.reject('No api key configured. Refer to the RapidPro configuration documentation.');
    }
    return { apiToken, host };
  });
};

const getRequestOptions = ({ apiToken, host }={}) => ({
  baseUrl: host,
  json: true,
  headers: {
    Authorization: `Token ${apiToken}`,
    Accept: 'application/json',
  },
});

const remoteStatusToLocalState = (result) => result.status && STATUS_MAP[result.status];

/**
 * @typedef {Object} stateUpdate
 * @property {string} messageId - message uuid
 * @property {string} gatewayRef - RapidPro broadcast id
 * @property {string} state - message state
 * @property {string} details
 */
/**
 * @returns {stateUpdate}
 */
const getStateUpdate = (status, messageId, gatewayRef) => ({
  messageId: messageId,
  gatewayRef: gatewayRef,
  state: status.state,
  details: status.detail
});

/**
 * Creates a broadcast for the provided message in RapidPro.
 * Returns a state update, setting the gateway_ref to the returned broadcast id
 * @param {object} credentials
 * @param {object} message
 * @returns {Promise<stateUpdate>}
 */
const sendMessage = (credentials, message) => {
  const requestOptions = getRequestOptions(credentials);
  requestOptions.uri = '/api/v2/broadcasts.json';
  requestOptions.body = {
    urns: [`tel:${message.to}`],
    text: message.content,
  };

  return request
    .post(requestOptions)
    .then(result => {
      if (!result) {
        logger.error('Empty response received when sending message');
        return; // sending the message will be retried later
      }

      const state = remoteStatusToLocalState(result);
      return getStateUpdate(state, message.id, result.id);
    })
    .catch(err => {
      // ignore error, sending the message will be retried later
      logger.error(`Error thrown when trying to send message: %o`, err);
    });
};

/**
 * Queries RapidPro messages endpoint with the provided broadcast id.
 * Returns state update of first returned result.
 * @param {Object} credentials - RapidPro API authorization token and host
 * @param {string} gatewayRef - the RapidPro broadcast id
 * @param {string} messageId - message uuid
 * @returns {Promise<void|stateUpdate>}
 */
const getRemoteState = (credentials, gatewayRef, messageId) => {
  if (!gatewayRef) {
    return Promise.resolve();
  }

  const requestOptions = getRequestOptions(credentials);
  requestOptions.uri = '/api/v2/messages.json';
  requestOptions.qs = { broadcast: gatewayRef };

  return request
    .get(requestOptions)
    .then(response => {
      if (!response || !response.results || !response.results.length || !response.results[0]) {
        logger.debug(`Could not get status for message with gateway_ref ${gatewayRef}`);
        return;
      }

      const state = remoteStatusToLocalState(response.results[0]);
      return getStateUpdate(state, messageId, gatewayRef);
    })
    .catch(err => {
      // ignore error, updating the state will be retried later
      logger.error(`Error thrown trying to retrieve status updates %o`, err);
    });
};

/**
 * Gets the current RapidPro states for a provided list of messages, converts to CHT-Core states
 * @param {object} credentials
 * @param {Array} messages - messages to check
 * @returns {Promise<[stateUpdate]>} list of state updates
 */
const getRemoteStates = (credentials, messages) => {
  let promiseChain = Promise.resolve([]);
  messages.forEach(message => {
    promiseChain = promiseChain.then((stateUpdates) => {
      return getRemoteState(credentials, message.gateway_ref, message.id).then(stateUpdate => {
        if (stateUpdate) {
          stateUpdates.push(stateUpdate);
        }
        return stateUpdates;
      });
    });
  });

  return promiseChain;
};

let skip = 0;
module.exports = {
  /**
   * Given an array of messages, returns a promise which resolves with an array of state updates
   * (which also update messages' gateway_ref properties), for each message that has been successfully relayed.
   * @param {Array} messages - Array of objects with a `to` (recipient) and a `message` field.
   * @returns {Promise<[stateUpdate]>} - array of state update objects.
   */
  send: (messages) => {
    // get the credentials every call so changes can be made without restarting api
    return getCredentials().then(credentials => {
      let promiseChain = Promise.resolve([]);
      messages.forEach(message => {
        promiseChain = promiseChain.then((statusUpdates) => {
          return sendMessage(credentials, message).then(result => {
            if (result) {
              statusUpdates.push(result);
            }

            return statusUpdates;
          });
        });
      });

      return promiseChain;
    });
  },

  /**
   * Polls RapidPro `messages` endpoint to check for state updates of outgoing messages that
   * are in non-final states. Queries `medic-sms/gateway_messages_by_state` for a batch of messages that are in
   * non-final states, `skip`ping rows that were already processed. Increases the global variable `skip` with the
   * number of rows that were not updated (their states have not changed) from this batch.
   * When there are no more rows to process, sets `skip` to 0 and will start over the queue on next iteration.
   */
  poll: () => {
    return getCredentials()
      .then(credentials => {
        const viewOptions = { keys: _.uniq(nonFinalStates), limit: BATCH_SIZE, skip };
        return db.medic
          .query('medic-sms/gateway_messages_by_state', viewOptions)
          .then(result => {
            if (!result || !result.rows || !result.rows.length) {
              skip = 0; // start from the beginning on the next poll call
              return;
            }

            // avoid circular dependency issues, the messaging service also requires this file
            // todo reviewer: I tried breaking up messaging, to expose the updateMessageTaskStates in a separate module,
            // but it didn't turn out quite right. a "proper" refactor would have ended up moving more code around.
            // Thoughts?
            const messaging = require('./messaging');

            const messages = result.rows.map(row => row.value);
            return getRemoteStates(credentials, messages)
              .then(statusUpdates => messaging.updateMessageTaskStates(statusUpdates))
              .then(({ saved = 0 }={}) => {
                /*
                 Only increase the skip with the number of messages that were *not updated*.
                 The messages that were updated could have changed to be in a final state
                 and will be excluded on the next query.
                 and will be excluded on the next query.
                 */
                const numberOfRowsProcessed = result.rows.length - saved;
                skip += numberOfRowsProcessed;
              });
          });
      })
      .catch(err => {
        logger.error('Error while polling message states: %o', err);
      });
  },
};
