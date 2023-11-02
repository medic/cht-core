const auth = require('../auth');
const rateLimitService = require('../services/rate-limit');
const serverUtils = require('../server-utils');

const getKeys = (req, basicAuth) => {
  const keys = [
    req.ip,
    req.body?.user,
    req.body?.password
  ];

  if (basicAuth) {
    keys.push(basicAuth.username);
    keys.push(basicAuth.password);
  }

  return keys;
};

const consumeOnFinish = (req, res, basicAuth) => {
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 429) {
      // log in failed - punish user
      rateLimitService.consume(getKeys(req, basicAuth));
    }
  });
};

const shouldLimit = async (req, basicAuth) => {
  if (req.body?.user || basicAuth?.username) {
    // attempting to log in - check that the user isn't limited
    return await rateLimitService.isLimited(getKeys(req, basicAuth));
  }
  return false;
};

const rateLimiterMiddleware = async (req, res, next) => {
  const basicAuth = auth.basicAuthCredentials(req);
  if (await shouldLimit(req, basicAuth)) {
    return serverUtils.rateLimited(req, res);
  }
  consumeOnFinish(req, res, basicAuth);
  next();
};

module.exports = rateLimiterMiddleware;
