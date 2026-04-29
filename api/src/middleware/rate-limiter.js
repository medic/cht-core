const auth = require('../auth');
const rateLimitService = require('../services/rate-limit');
const serverUtils = require('../server-utils');

const registerReqFinishHandler = (req, res) => {
  res.on('finish', () => {
    // Only authentication failures (401) increment the failed-login counter.
    // 429 is the rate-limiter's own response, so consuming on it would
    // re-punish callers who happen to share a key (e.g. a proxy IP) with a
    // genuinely failing client and lock out their otherwise-valid
    // credentials. See #10705.
    if (res.statusCode === 401) {
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
