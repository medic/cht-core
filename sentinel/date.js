var start_ts, synth_start_ts;

function refresh() {
    var DATE_RE = /(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?/,
        sd = require('./config').get('synthetic_date');
    if (sd) {
      var matches =  String(sd).match(DATE_RE);
      if (matches) {
          var fullmatch = matches[0],
              year = matches[1],
              month = matches[2],
              day = matches[3],
              // default hours to noon so catches send window
              hours = matches[4] || 12,
              minutes = matches[5] || 0;
          start_ts = new Date();
          synth_start_ts = new Date(start_ts.valueOf());
          synth_start_ts.setFullYear(year, month -1, day);
          synth_start_ts.setHours(hours, minutes, 0, 0);
      }
    }
}
// allows us to apply a delta to a timestamp when we run sentinel in synthetic
// time mode
function getTimestamp() {
    var now = new Date().valueOf();
    if (isSynthetic())
        return (now - start_ts.valueOf()) + synth_start_ts.valueOf();
    return now;
};
function isSynthetic() {
    if (synth_start_ts)
        return true;
    return false;
}
function getDate() {
    console.log('getDate()');
    console.log('start_ts is', start_ts);
    console.log('synth_start_ts is',synth_start_ts);
    if (synth_start_ts)
        return new Date(synth_start_ts.valueOf());
    return new Date();
}
module.exports = {
    getDate: getDate,
    getTimestamp: getTimestamp,
    isSynthetic: isSynthetic,
    refresh: refresh
};
refresh();
