//if passed in a timestamp as part of running it, set it on process.env
var argv = require('optimist').argv,
    timestamp = argv._[0],
    ts,
    start_ts;

if (timestamp) {
  var matches =  String(timestamp).match(/(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?/);
  if (matches) {
      var fullmatch = matches[0],
          year = matches[1],
          month = matches[2],
          day = matches[3],
          // default hours to noon so catches send window
          hours = matches[4] || 12,
          minutes = matches[5] || 0,
          start_ts = new Date().valueOf();
      ts = new Date(start_ts);
      ts.setFullYear(year, month -1, day);
      ts.setHours(hours, minutes, 0, 0);
  }
}

// allows us to apply a delta to a timestamp when we run sentinel in synthetic
// time mode
function getTimestamp() {
    var now = new Date().valueOf();
    if (isSynthetic())
        return (now - start_ts) + ts.valueOf();
    return now;
};
function isSynthetic() {
    if (ts)
        return true;
    return false;
}
function getDate() {
    if (ts)
        return new Date(ts.getTime());
    return new Date();
}
module.exports = {
    getDate: getDate,
    getTimestamp: getTimestamp,
    isSynthetic: isSynthetic
};
