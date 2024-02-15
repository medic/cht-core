function (keys, values) {
  let latest = { date: '1970-01-01' };
  values.forEach(function (value) {
    if (value.date > latest.date) {
      latest = value;
    }
  });
  return latest;
}
