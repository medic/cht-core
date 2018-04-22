var properties = require('properties');

angular.module('services').factory('ImportProperties',
  function(
    $q,
    DB
  ) {
    'use strict';
    'ngInject';

    var mergeTranslations = function(parsed, doc) {
      if (!parsed) {
        return;
      }
      var updated = false;
      Object.keys(parsed).forEach(function(key) {
        if (doc.values[key] !== parsed[key]) {
          doc.values[key] = parsed[key];
          updated = true;
        }
      });
      if (!updated) {
        return;
      }
      return DB().put(doc);
    };

    var parse = function(contents) {
      return $q(function(resolve, reject) {
        properties.parse(contents, function(err, parsed) {
          if (err) {
            return reject(err);
          }
          resolve(parsed);
        });
      });
    };

    return function(contents, doc) {
      return parse(contents)
        .then(function(parsed) {
          return mergeTranslations(parsed, doc);
        });
    };
  }
);

angular.module('services').factory('ExportProperties',
  function() {
    'use strict';
    return function(settings, locale) {
      var stringifier = properties.createStringifier();
      Object.keys(locale.values).forEach(function(key) {
        stringifier.property({ key: key, value: locale.values[key] });
      });
      return properties.stringify(stringifier);
    };
  }
);
