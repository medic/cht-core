function(key, values) {
  var code, endPoint, latest = { date: 0 };
  values.forEach(function(value) {
    if (value.date > latest.date) {
      latest = value;
    }
  });
  if (latest.message) {
    // trim off earlier parts of combined characters to avoid corruption
    for(endPoint = 50; endPoint > 0; --endPoint) {
      code = latest.message.charCodeAt(endPoint - 1);
      if (0xD800 < code || code > 0xDBFF) {
        break;
      }
    }
    latest.message = latest.message.substr(0, endPoint);
  }
  return latest;
}
