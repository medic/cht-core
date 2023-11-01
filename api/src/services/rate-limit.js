const { RateLimiterMemory } = require('rate-limiter-flexible');

const failedLoginLimit = new RateLimiterMemory({
  keyPrefix: 'failed-login',
  points: 10, // 10 requests
  duration: 10, // per 10 seconds
});

const isLimitedKey = async (key) => {
  if (!key) {
    return false;
  }
  const limit = await failedLoginLimit.get(key);
  return limit && limit.remainingPoints <= 0;
};

const consumeKey = async (key) => {
  if (!key) {
    return;
  }
  try {
    await failedLoginLimit.consume(key);
  } catch (e) {
    // ignore - cannot set headers as they're already set
  }
};

module.exports = {
  isLimited: async keys => {
    if (!keys?.length) {
      return false;
    }
    for (const key of keys) {
      if (await isLimitedKey(key)) {
        return true;
      }
    }
    return false;
  },
  consume: async keys => {
    if (!keys?.length) {
      return;
    }
    for (const key of keys) {
      await consumeKey(key);
    }
  }
};
