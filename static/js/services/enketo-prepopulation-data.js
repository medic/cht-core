var _ = require('underscore');

angular.module('inboxServices').service('EnketoPrepopulationData', [
  '$q', '$window', 'EnketoTranslation', 'UserSettings',
  function($q, $window, EnketoTranslation, UserSettings) {
    return function(model, data) {
      if (data && _.isString(data)) {
        return $q.resolve(data);
      }
      data = data || {};
      var inputs = {};
      var deferred = $q.defer();
      if ($window.medicmobile_android) {
        inputs.location = JSON.parse($window.medicmobile_android.getLocation());
      }
      UserSettings(function(err, settings) {
        if (err) {
          return deferred.reject(err);
        }
        inputs.user = settings;
        var xml = $($.parseXML(model));
        var bindRoot = xml.find('model instance').children().first();
        EnketoTranslation.bindJsonToXml(bindRoot, data);
        EnketoTranslation.bindJsonToXml(bindRoot.find('inputs'), inputs);
        var serialized = new XMLSerializer().serializeToString(bindRoot[0]);
        deferred.resolve(serialized);
      });
      return deferred.promise;
    };
  }
]);
