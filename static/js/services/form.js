var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var formatResults = function(forms) {
    if (!forms) {
      return [];
    }
    return _.map(_.values(forms), function(form) {
      return {
        code: form.meta.code,
        name: form.meta.label
      };
    });
  };

  inboxServices.factory('Form', [
    'Settings',
    function(Settings) {
      return function() {
        return Settings().then(function(settings) {
          return formatResults(settings.forms);
        });
      };
    }
  ]);

}());