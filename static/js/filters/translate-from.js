var _ = require('underscore');

(function () {

  'use strict';

  var module = angular.module('inboxFilters');

  module.filter('translateFrom', ['$translate',
    function($translate) {
      return function(labels, scope) {
        if (!labels) {
          return;
        }
        var label = labels[$translate.use()] || labels.en || _.values(labels)[0];
        if (!scope || label.indexOf('{{') === -1) {
          return label;
        }
        return _.template(label)(scope);
      };
    }
  ]);

}());
