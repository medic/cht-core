function (keys, values) {
  let latest = { date: '0000-00-00' };
  values.forEach(function (value) {
    if (value.date > latest.date) {
      latest = value;
    }
  });
  return latest;
}
