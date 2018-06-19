function(key, values) {
  var latest = { date: 0 };
  values.forEach(function(value) {
    if (value.date > latest.date) {
      latest = value;
    }
  });
  return latest;
}
