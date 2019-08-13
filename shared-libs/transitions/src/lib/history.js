/**
 * @module transitions/history
 * @description Utility to track duplicate keys in a certain period of time (periodMins).
 * Removes expired keys after threshold is reached (purgeThreshold).
 **/
const moment = require('moment');

let records = {};

const now = () => {
  // Passing date to make it testable with fake timers
  return moment(new Date());
};

const purgeIfExpired = (key, value) => {
  if(value && value.timestamp) {
    // Checks difference with history duration in minutes
    const hasExpired = (now().diff(value.timestamp))/60000 >= module.exports._periodMins;
    if(hasExpired) {
      delete records[key];
    }
    return hasExpired;
  }
  return true;
};

const size = () => {
  return Object.keys(records).length;
};

const purge = (force=false) => {
  if(force || size() >= module.exports._purgeThreshold) {
    for (const key of Object.keys(records)) {
      purgeIfExpired(key, records[key]);
    }
    return true;
  }
  return false;
};

const formatkey = (to, msg) => {
  return `${to}-${msg}`;
};

module.exports = {

  check: (to, msg) => { //key to track. returns true for duplicates
    purge();
    const alreadyExists = module.exports._get(to, msg) !== null;
    records[formatkey(to, msg)] = {timestamp: now()};
    return alreadyExists;
  },

  // Exposed for testing purposes
  _get: (to, msg) => { // returns last timestamp for given key
    const key = formatkey(to, msg);
    const value = records[key];
    if(value && !purgeIfExpired(key, value)) {
      return value;
    }
    return null;
  },
  _size: () => size(), // returns number of expired + non-expired keys
  _clear: () => { records = {}; },// clears history
  _periodMins: 30, //Number of minutes to track
  _purgeThreshold: 100 //Number of keys to keep in memory
};
