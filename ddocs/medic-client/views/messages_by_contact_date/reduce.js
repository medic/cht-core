function(key, values) {
  var latest = { date: 0 };
  values.forEach(function(value) {
    if (value.date > latest.date) {
      latest = value;
    }
  });
  if (latest.message) {
    var code = latest.message.charCodeAt(99);
    if (0xD800 <= code && code <= 0xDBFF) {
      latest.message = latest.message.substr(0, 99);
    } else {
      latest.message = latest.message.substr(0, 100);
    }
  }
  return latest;
}
