angular.module('inboxServices').factory('TranslationNullInterpolation', function($translateSanitization) {
  return {
    setLocale: function () {},
    getInterpolationIdentifier: function () {
      return 'no-interpolation';
    },
    interpolate: function (string, interpolateParams, context, sanitizeStrategy) {
      return $translateSanitization.sanitize(string, 'text', sanitizeStrategy);
    }
  };
});
