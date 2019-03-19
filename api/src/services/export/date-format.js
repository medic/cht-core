const moment = require('moment');

module.exports = {
  format: (date, human_readable) => {
    if (human_readable) {
      return moment(date).toISOString();
    } else {
      return moment(date).valueOf();
    }
  }
};
