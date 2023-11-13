const auth = require('../auth');
const rateLimitService = require('../services/rate-limit');
const serverUtils = require('../server-utils');

const registerReqFinishHandler = (req, res) => {
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 429) {
      // log in failed - punish user
      rateLimitService.consume(req);
    }
  });
};

const isLoggingIn = (req) => {
  const basicAuth = auth.basicAuthCredentials(req);
  return req.body?.user || basicAuth?.username;
};

const shouldLimit = async (req) => {
  if (isLoggingIn(req)) {
    return await rateLimitService.isLimited(req);
  }
  return false;
};

const rateLimiterMiddleware = async (req, res, next) => {
  if (await shouldLimit(req)) {
    return serverUtils.rateLimited(req, res);
  }
  registerReqFinishHandler(req, res);
  next();
};

module.exports = rateLimiterMiddleware;
