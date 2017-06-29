function(key, values) {
  var latest = { date: 0 };
  values.forEach(function(value) {
    if (value.date > latest.date) {
      latest = value;
    }
  });
  if (latest.message) {
    var code = latest.message.charCodeAt(99);
    var endPoint = 100;
    if (0xD800 <= code && code <= 0xDBFF) {
      // trim off the first half of the unicode character to avoid corruption
      endPoint = 99;
    }
    latest.message = latest.message.substr(0, endPoint);
  }
  return latest;
}
