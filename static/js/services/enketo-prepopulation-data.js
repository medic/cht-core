var _ = require('underscore');

angular.module('inboxServices').service('EnketoPrepopulationData', [
  '$q', '$window', 'EnketoTranslation', 'UserSettings',
  function($q, $window, EnketoTranslation, UserSettings) {
    return function(model, data) {
      if (data && _.isString(data)) {
        return $q.resolve(data);
      }

      var deferred = $q.defer();
      UserSettings(function(err, user) {
        if (err) {
          return deferred.reject(err);
        }

        var xml = $($.parseXML(model));
        var bindRoot = xml.find('model instance').children().first();

        var userRoot = bindRoot.find('>inputs>user');
        var locationRoot = bindRoot.find('>inputs>meta>location');

        if (data) {
          EnketoTranslation.bindJsonToXml(bindRoot, data, function(name) {
            return ['>', name, ', ', '>inputs>', name].join('');
          });
        }

        if (userRoot.length) {
          EnketoTranslation.bindJsonToXml(userRoot, user);
        }

        if (locationRoot.length && $window.medicmobile_android) {
          var location = JSON.parse($window.medicmobile_android.getLocation());
          EnketoTranslation.bindJsonToXml(bindRoot.find('inputs>meta>location'), location);
        }

        var serialized = new XMLSerializer().serializeToString(bindRoot[0]);
        deferred.resolve(serialized);
      });
      return deferred.promise;
    };
  }
]);
