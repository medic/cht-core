angular.module('inboxServices').factory('JsonForms',
  function(Settings) {

    'ngInject';
    'use strict';

    var formatResults = function(forms) {
      if (!forms) {
        return [];
      }
      return Object.keys(forms).map(function(key) {
        var form = forms[key];
        return {
          code: form.meta.code,
          name: form.meta.label,
          icon: form.meta.icon
        };
      });
    };

    return function() {
      return Settings().then(function(settings) {
        return formatResults(settings.forms);
      });
    };

  }
);
