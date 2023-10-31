const auth = require('../auth');
const rateLimitService = require('../services/rate-limit');
const serverUtils = require('../server-utils');

const getBasicAuthUsername = (req) => auth.basicAuthCredentials(req);

const rateLimiterMiddleware = (req, res, next) => {
  const basicAuth = getBasicAuthUsername(req);

  const keys = [ req.ip ];
  if (basicAuth) {
    keys.push(basicAuth.username);
    keys.push(basicAuth.password);
  }

  rateLimitService.isLimited(keys)
    .then(isLimited => {
      if (isLimited) {
        return serverUtils.rateLimited(req, res);
      }
      next();
    });

  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 429) {
      keys.push(req.body?.user);
      keys.push(req.body?.password);
      rateLimitService.consume(keys);
    }
  });

};

module.exports = rateLimiterMiddleware;
