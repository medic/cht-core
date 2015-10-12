(function () {

  'use strict';

  var module = angular.module('inboxFilters');

  module.filter('translateFrom', ['TranslateFrom',
    function(TranslateFrom) {
      return TranslateFrom;
    }
  ]);

}());
