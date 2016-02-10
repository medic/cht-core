(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

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

  var formatResults = function(forms, language) {
    var result = [];
    if (forms) {
      for (var key in forms) {
        if (forms.hasOwnProperty(key)) {
          var form = forms[key];
          var r = { code: form.meta.code };
          var name = getLabel(form, language);
          if (name) {
            r.name = name;
          }
          result.push(r);
        }
      }
    }
    return result;
  };

  inboxServices.factory('Form', [
    '$q', 'Language', 'Settings',
    function($q, Language, Settings) {
      return function() {
        return $q.all([ Settings(), Language() ])
          .then(function(results) {
            return $q.resolve(formatResults(results[0].forms, results[1]));
          });
      };
    }
  ]);

}());