angular.module('inboxServices').factory('JsonForms',
  function(Settings) {

    'ngInject';
    'use strict';

    const formatResults = function(forms) {
      if (!forms) {
        return [];
      }
      return Object.keys(forms).map(function(key) {
        const form = forms[key];
        return {
          code: form.meta.code,
          name: form.meta.label,
          translation_key: form.meta.translation_key,
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
