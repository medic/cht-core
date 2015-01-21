var _ = require('underscore');

(function () {

  'use strict';

  var module = angular.module('inboxFilters');

  module.filter('translateFrom', ['$translate',
    function($translate) {
      return function(labels) {
        return labels[$translate.use()] || labels.en || _.values(labels)[0];
      };
    }
  ]);

}());
