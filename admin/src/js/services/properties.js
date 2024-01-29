const properties = require('properties');

angular.module('services').factory('ImportProperties',
  function(
    $q,
    DB
  ) {
    'use strict';
    'ngInject';

    const mergeTranslations = function(parsed, doc) {
      if (!parsed) {
        return;
      }
      let updated = false;
      const generic = doc.generic || {};
      const custom = doc.custom || {};
      Object.keys(parsed).forEach(function(key) {
        if (generic[key]) {
          if (generic[key] === parsed[key]) {
            if (custom[key]) {
              delete doc.custom[key];
              updated = true;
            }
          } else if (custom[key]) {
            if (custom[key] !== parsed[key]) {
              doc.custom[key] = parsed[key];
              updated = true;
            }
          }  else {
            if (!doc.custom) {
              doc.custom = {};
            }
            doc.custom[key] = parsed[key];
            updated = true;
          }
        } else if (custom[key]) {
          if (custom[key] !== parsed[key]) {
            doc.custom[key] = parsed[key];
            updated = true;
          }
        } else {
          if (!doc.custom) {
            doc.custom = {};
          }
          doc.custom[key] = parsed[key];
          updated = true;
        }
      });
      if (!updated) {
        return;
      }
      return DB().put(doc);
    };

    const parse = function(contents) {
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
  });

angular.module('services').factory('ExportProperties',
  function() {
    'use strict';
    return function (locale) {
      const stringifier = properties.createStringifier();
      const values = Object.assign({}, locale.generic, locale.custom || {});
      Object.keys(values).forEach(function(key) {
        stringifier.property({ key: key, value: values[key] });
      });
      return properties.stringify(stringifier);
    };
  });
