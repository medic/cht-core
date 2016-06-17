var _ = require('underscore');

angular.module('inboxServices').service('EnketoPrepopulationData',
  function(
    $q,
    $window,
    EnketoTranslation,
    UserSettings
  ) {

    'ngInject';

    return function(model, data) {
      if (data && _.isString(data)) {
        return $q.resolve(data);
      }

      return UserSettings()
        .then(function(user) {
          var xml = $($.parseXML(model));
          var bindRoot = xml.find('model instance').children().first();

          var userRoot = bindRoot.find('>inputs>user');
          var locationRoot = bindRoot.find('>inputs>meta>location');

          if (data) {
            EnketoTranslation.bindJsonToXml(bindRoot, data, function(name) {
              // Either a direct child or a direct child of inputs
              return '>%, >inputs>%'.replace(/%/g, name);
            });
          }

          if (userRoot.length) {
            EnketoTranslation.bindJsonToXml(userRoot, user);
          }

          if (locationRoot.length && $window.medicmobile_android) {
            var location = JSON.parse($window.medicmobile_android.getLocation());
            EnketoTranslation.bindJsonToXml(bindRoot.find('inputs>meta>location'), location);
          }

          return new XMLSerializer().serializeToString(bindRoot[0]);
        });
    };
  }
);
