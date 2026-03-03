angular.module('filters').filter('bytes', function() {
  return function(bytes, precision) {
    if (Number.isNaN(Number.parseFloat(bytes)) || !Number.isFinite(bytes) || bytes === 0) {
      return '< 1 kB';
    }
    if (!precision) {
      precision = 1;
    }
    const units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'];
    const number = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
  };
});
