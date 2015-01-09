(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('Form', ['$q', 'Language', 'Settings',
    function($q, Language, Settings) {

      var getLabel = function(form, language) {
        var test = false;
        if (language === 'test') {
          language = 'en';
          test = true;
        }
        var label = form.meta.label;
        if (!label) {
          return;
        }
        if (angular.isString(label)) {
          return label;
        }
        if (!Object.keys(label).length) {
          return form.meta.code;
        }
        var value = label[language] ||
                    label.en ||
                    label[Object.keys(label)[0]];
        if (test) {
          value = '-' + value + '-';
        }
        return value;
      };

      return function() {
        var deferred = $q.defer();

        Settings(function(err, res) {
          if (err) {
            return deferred.reject(err);
          }

          Language(function(err, language) {
            if (err) {
              return console.log('Error loading language', err);
            }

            var result = [];

            if (res.forms) {
              for (var key in res.forms) {
                if (res.forms.hasOwnProperty(key)) {
                  var form = res.forms[key];
                  var r = { code: form.meta.code };
                  var name = getLabel(form, language);
                  if (name) {
                    r.name = name;
                  }
                  result.push(r);
                }
              }
            }

            deferred.resolve(result);
          });

        });

        return deferred.promise;
      };
    }
  ]);

}());