const { RateLimiterMemory } = require('rate-limiter-flexible');
const auth = require('../auth');

const failedLoginLimit = new RateLimiterMemory({
  keyPrefix: 'failed-login',
  points: 10, // 10 requests
  duration: 10, // per 10 seconds
});

const isLimitedKey = async (key) => {
  const limit = await failedLoginLimit.get(key);
  return limit && limit.remainingPoints <= 0;
};

const consumeKey = async (key) => {
  try {
    await failedLoginLimit.consume(key);
  } catch (e) {
    // ignore - the limit has already been reached
  }
};

const getKeys = (req) => {
  const keys = [ req.ip ];

  if (req.body?.user) {
    keys.push(req.body.user);
  }
  if (req.body?.password) {
    keys.push(req.body.password);
  }
  const basicAuth = auth.basicAuthCredentials(req);
  if (basicAuth?.username) {
    keys.push(basicAuth.username);
  }
  if (basicAuth?.password) {
    keys.push(basicAuth.password);
  }
  return keys;
};

module.exports = {
  isLimited: async req => {
    const keys = getKeys(req);
    for (const key of keys) {
      if (await isLimitedKey(key)) {
        return true;
      }
    }
    return false;
  },
  consume: async req => {
    const keys = getKeys(req);
    for (const key of keys) {
      await consumeKey(key);
    }
  }
};
