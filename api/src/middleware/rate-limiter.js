const { RateLimiterMemory } = require('rate-limiter-flexible');


const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'middleware',
  points: 10, // 10 requests
  duration: 10, // per 1 second by IP
});

const rateLimiterMiddleware = (req, res, next) => {
  rateLimiter.get(req.ip)
    .then((limit) => {
      if (limit?.remainingPoints === 0) {
        console.log('blocked!!')
        return res.status(429).send('Too Many Requests');
      }
      console.log('limit', limit);
      next();
    });

  res.on("finish", function() {
    if (res.statusCode === 401) {
      // TODO: also consume given username
      console.log('consuming', req.ip);

      rateLimiter.consume(req.ip)
        .catch(() => {
          // ignore - cannot set headers as they're already set
        });
    }
  });

};

module.exports = rateLimiterMiddleware;
