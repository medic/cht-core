/**
 * Module to intercept and ignore certain interpolation errors
 * @see https://github.com/medic/medic/issues/5863
 */
angular.module('inboxServices').factory('TranslationMessageFormatInterpolation', function(
  $log,
  $translateMessageFormatInterpolation
) {
  return {
    setLocale: $translateMessageFormatInterpolation.setLocale,
    getInterpolationIdentifier: $translateMessageFormatInterpolation.getInterpolationIdentifier,
    interpolate: function (string, interpolationParams, context, sanitizeStrategy) {
      try {
        return $translateMessageFormatInterpolation.interpolate(string, interpolationParams, context, sanitizeStrategy);
      } catch (e) {
        if (e.name === 'SyntaxError') {
          // indicates a poorly configured translation value, should not be fatal
          $log.warn(`Error interpolating "${string}"`, e);
        } else {
          $log.error(e);
        }
      }
    }
  };
});
