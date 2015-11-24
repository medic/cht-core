var _ = require('underscore');

angular.module('inboxServices').service('EnketoPrepopulationData', [
  '$q', 'EnketoTranslation', 'UserSettings',
  function($q, EnketoTranslation, UserSettings) {
    return function(model, data) {
      if (data && _.isString(data)) {
        return $q.resolve(data);
      }
      data = data || {};
      var deferred = $q.defer();
      if (window.medicmobile_android) {
        data.location = JSON.parse(window.medicmobile_android.getLocation());
      }
      UserSettings(function(err, settings) {
        if (err) {
          return deferred.reject(err);
        }
        data.user = settings;
        var xml = $($.parseXML(model));
        var instanceRoot = xml.find('model instance');
        var bindRoot = instanceRoot.find('inputs');
        var serializeRoot;
        if (bindRoot.length) {
          serializeRoot = bindRoot.parent();
        } else {
          // used for the default contact schema forms
          bindRoot = instanceRoot.find('data');
          if (!bindRoot.length) {
            // used for forms defining a primary object with a tag name
            // other than `data`
            bindRoot = instanceRoot.children().eq(0);
          }
          serializeRoot = bindRoot;
        }
        EnketoTranslation.bindJsonToXml(bindRoot, data);

        var serialized = new XMLSerializer().serializeToString(serializeRoot[0]);
        deferred.resolve(serialized);
      });
      return deferred.promise;
    };
  }
]);
