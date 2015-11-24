var _ = require('underscore');

angular.module('inboxServices').service('EnketoPrepopulationData', [
  '$q', '$window', 'EnketoTranslation', 'UserSettings',
  function($q, $window, EnketoTranslation, UserSettings) {
    return function(model, data) {
      if (data && _.isString(data)) {
        return $q.resolve(data);
      }
      data = data || {};
      data.inputs = data.inputs || {};
      var deferred = $q.defer();
      if ($window.medicmobile_android) {
        data.inputs.location = JSON.parse($window.medicmobile_android.getLocation());
      }
      UserSettings(function(err, settings) {
        if (err) {
          return deferred.reject(err);
        }
        data.inputs.user = settings;
        var xml = $($.parseXML(model));
        var instanceRoot = xml.find('model instance');
        EnketoTranslation.bindJsonToXml(instanceRoot, data);
        var bindRoot = instanceRoot.children()[0];
        var serialized = new XMLSerializer().serializeToString(bindRoot);
        deferred.resolve(serialized);
      });
      return deferred.promise;
    };
  }
]);
