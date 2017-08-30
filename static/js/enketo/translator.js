var moment = require('moment');

function translate(key) {
  if(key.indexOf('date.dayofweek.') === 0) {
      return moment().weekday(key.substring(15)).format('ddd');
  }
  if(key.indexOf('date.month.') === 0) {
      return moment().month(parseInt(key.substring(11)) - 1).format('MMM');
  }

  var angularServices = angular.element( document.body ).injector();
  var $translate = angularServices.get( '$translate' );
  return $translate.instant('enketo.' + key);
}

module.exports = {
  t: translate,
};
