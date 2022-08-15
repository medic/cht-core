const DATE_RE = /(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?/;
const sd = require('./config').get('synthetic_date');
const start_date = new Date();
const moment = require('moment');
const logger = require('./lib/logger');
let synth_start_date;

const load = () => {
  if (sd) {
    const matches = String(sd).match(DATE_RE);
    if (matches) {
      const year = matches[1];
      const month = matches[2];
      const day = matches[3];
      // default hours to noon so catches send window
      const hours = matches[4] || 12;
      const minutes = matches[5] || 0;
      synth_start_date = new Date(start_date.valueOf());
      synth_start_date.setFullYear(year, month - 1, day);
      synth_start_date.setHours(hours, minutes, 0, 0);
      logger.info(`synthetic_date is: ${synth_start_date}`);
      return;
    }
  }
};

// allows us to apply a delta to a timestamp when we run sentinel in synthetic
// time mode
const getTimestamp = () => {
  const now = new Date().valueOf();
  if (isSynthetic()) {
    return now - start_date.valueOf() + synth_start_date.valueOf();
  }
  return now;
};
const isSynthetic = () => {
  if (synth_start_date) {
    return true;
  }
  return false;
};
const getDate = () => {
  if (synth_start_date) {
    return new Date(synth_start_date.valueOf());
  }
  return new Date();
};
module.exports = {
  getDate: getDate,
  getTimestamp: getTimestamp,
  isSynthetic: isSynthetic,
  getDuration: function(s) {
    const tokens = (s || '').split(' ');
    const value = tokens[0];
    const unit = tokens[1];

    if (
      /\d+/.test(value) &&
      /(second|minute|hour|day|week|month|year)s?/.test(unit)
    ) {
      return moment.duration(Number(value), unit);
    } else {
      return null;
    }
  },
};
load();
