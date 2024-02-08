function (keys, values) {
  let latest = { date: '1970-01-01' };
  values.forEach(function (value) {
    // using Date.parse to compare dates because they're not well-formatted to compare them as raw strings
    // e.g. '2020-8-4' instead of '2020-08-04'
    if (value.date > latest.date) {
      latest = value;
    }
  });
  return latest;
}
