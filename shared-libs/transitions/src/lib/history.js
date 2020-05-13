/**
 * @module transitions/history
 * @description Utility to track duplicate keys in a certain period of time (30 minutes).
 * Removes expired keys after threshold is reached (1000).
 **/
const config = require('../config');

const AUTO_PURGE_LENGTH = 1000;
const TIME_TO_LIVE = 30 * 60 * 1000; // 30 minutes
const MAXIMUM_DUPLICATES_LIMIT = 20;
const DEFAULT_DUPLICATES_LIMIT = 5;

const getAllowedDuplicatesLimit = () => {
  const smsConfig = config.get('sms') || {};
  const configuredLimit = parseInt(smsConfig.allowed_duplicates_limit);

  const allowedLimit =
    (configuredLimit && !isNaN(configuredLimit) && configuredLimit > 0) ? configuredLimit : DEFAULT_DUPLICATES_LIMIT;

  return Math.min(allowedLimit, MAXIMUM_DUPLICATES_LIMIT);
};
const records = {};

const purgeIfExpired = (key) => {
  const value = records[key];
  if (!value) {
    return;
  }

  const hasExpired = (new Date().getTime() - value.timestamp) >= TIME_TO_LIVE;
  if (hasExpired) {
    delete records[key];
  }
};

const purge = () => {
  if (Object.keys(records).length < AUTO_PURGE_LENGTH) {
    return;
  }

  Object.keys(records).forEach(purgeIfExpired);
};

const getKey = (to, msg) => `${to}-${msg}`;

const touch = (key) => {
  const value = records[key];

  records[key] = {
    timestamp: new Date().getTime(),
    count: (value && value.count + 1) || 1,
  };
};

module.exports = {
  /**
   * Returns whether the combination of message + recipient should be considered a duplicate
   * @param {String} to - recipient phone number
   * @param {String} msg - sms message content
   * @returns {boolean}
   */
  check: (to, msg) => {
    purge();

    const key = getKey(to, msg);
    purgeIfExpired(key);
    touch(key);
    return records[key].count > getAllowedDuplicatesLimit();
  },
};
