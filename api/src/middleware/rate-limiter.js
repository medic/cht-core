const { RateLimiterMemory } = require('rate-limiter-flexible');

const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'middleware',
  points: 10, // 10 requests
  duration: 10, // per 1 second by IP
});

const rateLimiterMiddleware = (req, res, next) => {
  // TODO: also consume given username
  rateLimiter.consume(req.ip)
    .then(() => next())
    .catch(() => res.status(429).send('Too Many Requests'));

  res.on('finish', () => {
    if (res.statusCode !== 401 && res.statusCode !== 429 && !res.unauthorized) {
      rateLimiter.reward(req.ip);
    }
  });

};

module.exports = rateLimiterMiddleware;
