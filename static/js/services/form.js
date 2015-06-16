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
    'Language', 'Settings',
    function(Language, Settings) {
      return function(options, callback) {
        if (!callback) {
          callback = options;
          options = {};
        }
        Settings(function(err, res) {
          if (err) {
            return callback(err);
          }
          Language(options, function(err, language) {
            if (err) {
              return callback(err);
            }
            callback(null, formatResults(res.forms, language));
          });
        });
      };
    }
  ]);

}());