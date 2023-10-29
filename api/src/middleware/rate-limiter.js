const { RateLimiterMemory } = require('rate-limiter-flexible');

const failedLoginLimit = new RateLimiterMemory({
  keyPrefix: 'failed-login',
  points: 10, // 10 requests
  duration: 10, // per 10 seconds
});

const requestLimit = new RateLimiterMemory({
  keyPrefix: 'request',
  points: 10, // 10 requests
  duration: 1, // per 1 second
});

const rateLimiterMiddleware = (req, res, next) => {

  requestLimit.consume(req.ip)
    .then(() => failedLoginLimit.get(req.ip))
    .then(limit => {
      if (limit && limit.remainingPoints <= 0) {
        throw new Error('Too many failed login attempts');
      }
      next();
    })
    .catch(() => {
      return res.status(429).send('Too Many Requests');
    });

  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 429 || res.unauthorized) {
      // TODO: also consume given username
      failedLoginLimit.consume(req.ip)
        .catch(() => {
          // ignore - cannot set headers as they're already set
        });
    }
  });

};

module.exports = rateLimiterMiddleware;
