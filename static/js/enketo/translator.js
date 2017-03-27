function translate(key) {
  var angularServices = angular.element( document.body ).injector();
  var $translate = angularServices.get( '$translate' );
  return $translate.instant('enketo.' + key);
}

module.exports = {
  t: translate,
};
