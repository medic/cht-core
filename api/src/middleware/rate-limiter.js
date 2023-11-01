const auth = require('../auth');
const rateLimitService = require('../services/rate-limit');
const serverUtils = require('../server-utils');

const getBasicAuthUsername = (req) => auth.basicAuthCredentials(req);

const consume = (req, res) => {
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 429) {
      rateLimitService.consume(getKeys(req));
    }
  });
};

const getKeys = (req) => {
  const keys = [
    req.ip,
    req.body?.user,
    req.body?.password
  ];

  const basicAuth = getBasicAuthUsername(req);
  if (basicAuth) {
    keys.push(basicAuth.username);
    keys.push(basicAuth.password);
  }

  return keys;
};

const rateLimiterMiddleware = (req, res, next) => {
  rateLimitService.isLimited(getKeys(req))
    .then(isLimited => {
      if (isLimited) {
        return serverUtils.rateLimited(req, res);
      }
      consume();
      next();
    });
};

module.exports = rateLimiterMiddleware;
