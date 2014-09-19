(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('Form', ['$q', 'Language', 'Settings',
    function($q, Language, Settings) {

      var getLabel = function(form, language) {
        var label = form.meta.label;
        if (!label) {
          return form.meta.code;
        }
        if (angular.isString(label)) {
          return label;
        }
        if (!Object.keys(label).length) {
          return form.meta.code;
        }
        if (label[language]) {
          return label[language];
        }
        if (label.en) {
          return label.en;
        }
        return label[Object.keys(label)[0]];
      };

      return function() {
        var deferred = $q.defer();

        Settings(function(err, res) {
          if (err) {
            return deferred.reject(err);
          }

          Language().then(
            function(language) {

              var result = [];

              if (res.forms) {
                for (var key in res.forms) {
                  if (res.forms.hasOwnProperty(key)) {
                    var form = res.forms[key];
                    result.push({
                      name: getLabel(form, language),
                      code: form.meta.code
                    });
                  }
                }
              }

              result.sort(function(lhs, rhs) {
                var lhsName = lhs.name.toUpperCase();
                var rhsName = rhs.name.toUpperCase();
                return lhsName.localeCompare(rhsName);
              });

              deferred.resolve(result);
            }
          );

        });

        return deferred.promise;
      };
    }
  ]);

}());