/**
 * Utility to track duplicate keys in a certain period of time (periodMins).
 * Removes expired keys after threshold is reached (purgeThreshold).
 **/
const moment = require('moment');

let records = {};

const now = () => {
  return moment(new Date());
};

const expired = (key) => {
  const value = records[key];
  if(value && value.timestamp) {
    // Checks difference with history duration in minutes
    return (now().diff(value.timestamp))/60000 >= module.exports.periodMins;
  }
  return true;
};

const size = () => {
  return Object.keys(records).length;
};

const purge = (force=false) => {
  if(force || size() >= module.exports.purgeThreshold) {
    for (const key of Object.keys(records)) {
      if(expired(key)) {
        delete records[key];
      }
    }
    return true;
  }
  return false;
};

module.exports = {

  periodMins: 30, //Number of minutes to track

  purgeThreshold: 100, //Number of keys to keep in memory

  track: (key) => { //key to track. returns true for duplicates
    purge();
    const alreadyExists = module.exports.get(key) !== null;
    records[key] = {timestamp: now()};
    return alreadyExists;
  },

  get: (key) => { // returns last timestamp for given key
    const value = records[key];
    if(value && !expired(key)) {
      return value;
    }
    return null;
  },

  size: () => size(), // returns number of expired + non-expired keys

  purge: () => purge(true), // purges expired keys regardless of threshold

  clear: () => { // clears history
    records = {};
  }
};
