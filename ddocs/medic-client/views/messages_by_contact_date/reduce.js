function(key, values) {
  var max = { date: 0 };
  var read;
  values.forEach(function(value) {
    if (!read || !value.read) {
      read = value.read || [];
    } else {
      read = read.filter(function(user) {
        return value.read.indexOf(user) !== -1;
      });
    }
    if (value.date > max.date) {
      max = value;
    }
  });
  max.read = read;

  // needed to reduce object size
  max.facility = undefined;

  if (max.message) {
    var code = max.message.charCodeAt(99);
    if (0xD800 <= code && code <= 0xDBFF) {
      max.message = max.message.substr(0, 99);
    } else {
      max.message = max.message.substr(0, 100);
    }
  }

  return max;
}