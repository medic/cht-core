const logger = require('../logger');
const messaging = require('../services/messaging');
const serverUtils = require('../server-utils');
const secureSettings = require('@medic/settings');

const getIncomingToken = () => {
  return secureSettings.getCredentials('rapidpro:incoming').then(token => {
    if (!token) {
      logger.warn('No incoming key configured. Refer to the RapidPro configuration documentation.');
      return Promise.reject({ code: 403, message: 'No incoming key configured' });
    }
    return token;
  });
};

const validateToken = req => {
  return getIncomingToken().then(expected => {
    const given = req.headers.authorization;
    if (expected !== given) {
      logger.warn(`Attempt to access RapidPro endpoint without the correct incoming token`);
      return Promise.reject({ code: 403, message: `Incorrect token: "${given}"` });
    }
  });
};

module.exports = {
  incomingMessages: (req, res) => {
    return validateToken(req)
      .then(() => {
        if (!req.body) {
          return Promise.reject({ code: 400, message: 'Request body is required' });
        }
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
