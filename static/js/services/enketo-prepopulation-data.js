var _ = require('underscore');

angular.module('inboxServices').service('EnketoPrepopulationData',
  function(
    $q,
    $window,
    EnketoTranslation,
    UserSettings
  ) {
    'use strict';
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

          if (data) {
            EnketoTranslation.bindJsonToXml(bindRoot, data, function(name) {
              // Either a direct child or a direct child of inputs
              return '>%, >inputs>%'.replace(/%/g, name);
            });
          }

          if (userRoot.length) {
            EnketoTranslation.bindJsonToXml(userRoot, user);
          }

          return new XMLSerializer().serializeToString(bindRoot[0]);
        });
    };
  }
);
