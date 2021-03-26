const logger = require('../logger');
const messaging = require('../services/messaging');
const serverUtils = require('../server-utils');
const secureSettings = require('@medic/settings');
const rapidPro = require('../services/rapid-pro');

const getIncomingToken = () => {
  return secureSettings.getCredentials('rapidpro:incoming').then(token => {
    if (!token) {
      logger.warn('No incoming key configured. Refer to the RapidPro configuration documentation.');
      return Promise.reject({ code: 403, message: 'No incoming key configured' });
    }
    return token;
  });
};

const validateRequest = req => {
  if (!req.body) {
    return Promise.reject({ code: 400, message: 'Request body is required' });
  }

  const outgoingMessageService = messaging.getOutgoingMessageService();
  if (!outgoingMessageService || outgoingMessageService.name !== rapidPro.name) {
    return Promise.reject({ code: 400, message: 'Service not enabled' });
  }

  return getIncomingToken().then(expected => {
    // todo Reviewer: should we mimic the RapidPro authorization header, and include "Token" prefix?
    // or use a query key like africas-talking?
    // Consistent with our other APIs or consistent with the api integrating with?
    const given = req.headers.authorization;
    if (expected !== given) {
      logger.warn(`Attempt to access RapidPro endpoint without the correct incoming token`);
      return Promise.reject({ code: 403, message: `Incorrect token: "${given}"` });
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
