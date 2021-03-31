const logger = require('../logger');
const messaging = require('../services/messaging');
const serverUtils = require('../server-utils');
const secureSettings = require('@medic/settings');

// mimic Authorization method of RapidPro outgoing
const AUTHORIZATION_HEADER_REGEX = /^Token\s+(.*)$/;

const getConfiguredIncomingToken = () => {
  return secureSettings.getCredentials('rapidpro:incoming').then(token => {
    if (!token) {
      logger.warn('No incoming key configured. Refer to the RapidPro configuration documentation.');
      return Promise.reject({ code: 403, message: 'No incoming key configured' });
    }
    return token;
  });
};

const getRequestAuthToken = (req) => {
  if (!req || !req.headers || !req.headers.authorization) {
    return;
  }

  const match = req.headers.authorization.match(AUTHORIZATION_HEADER_REGEX);
  if (!match) {
    return;
  }

  return match[1];
};

const validateRequest = req => {
  if (!req.body) {
    return Promise.reject({ code: 400, message: 'Request body is required' });
  }

  const givenToken = getRequestAuthToken(req);
  if (!givenToken) {
    logger.warn(`Attempt to access RapidPro endpoint without the an incoming token`);
    return Promise.reject({ code: 403, message: `Missing authorization token` });
  }

  return getConfiguredIncomingToken().then(expected => {
    if (expected !== givenToken) {
      logger.warn(`Attempt to access RapidPro endpoint without the correct incoming token`);
      return Promise.reject({ code: 403, message: `Incorrect token: "${givenToken}"` });
    }
  });
};

module.exports = {
  incomingMessages: (req, res) => {
    return validateRequest(req)
      .then(() => {
        const message = {
          id: req.body.id,
          from: req.body.from,
          content: req.body.content,
        };
        return messaging.processIncomingMessages([ message ]);
      })
      .then(results => res.json(results))
      .catch(err => serverUtils.error(err, req, res));
  },
};
