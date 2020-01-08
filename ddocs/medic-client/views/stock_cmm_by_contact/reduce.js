function(key, values) {
  var sums = {};
  values.forEach(function(value) {
    if (sums[value.date]) {
      sums[value.date] += value.stock_delta;
    } else {
      sums[value.date] = value.stock_delta;
    }
  });
  var vals = Object.values(sums);
  return vals.length > 0 ? sum(vals)/vals.length : 0;
}
