function(key, values) {
  var latest = { date: 0 };
  values.forEach(function(value) {
    if (value.date > latest.date) {
      latest = value;
    }
  });
  if (latest.message) {
    latest.message = latest.message.replace(/\n+\t+/g, ' ');
    var code = latest.message.charCodeAt(49);
    var endPoint = 50;
    if (0xD800 <= code && code <= 0xDBFF) {
      // trim off the first half of the unicode character to avoid corruption
      endPoint = 49;
    }
    latest.message = latest.message.substr(0, endPoint);
  }
  return latest;
}
