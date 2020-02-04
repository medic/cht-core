const _ = require('lodash');

angular.module('inboxServices').service('EnketoPrepopulationData',
  function(
    $q,
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
          const xml = $($.parseXML(model));
          const bindRoot = xml.find('model instance').children().first();

          const userRoot = bindRoot.find('>inputs>user');

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
