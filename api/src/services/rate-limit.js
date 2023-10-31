const { RateLimiterMemory } = require('rate-limiter-flexible');

const failedLoginLimit = new RateLimiterMemory({
  keyPrefix: 'failed-login',
  points: 10, // 10 requests
  duration: 10, // per 10 seconds
});

module.exports = {
  isLimited: async keys => {
    if (!keys || !keys.length) {
      return false;
    }
    for (const key of keys) {
      if (key) {
        const limit = await failedLoginLimit.get(key);
        if (limit && limit.remainingPoints <= 0) {
          return true;
        }
      }
    }
    return false;
  },
  consume: async keys => {
    if (!keys || !keys.length) {
      return;
    }
    try {
      for (const key of keys) {
        if (key) {
          await failedLoginLimit.consume(key);
        }
      }
    } catch (e) {
      // ignore - cannot set headers as they're already set
    }
  }
};
