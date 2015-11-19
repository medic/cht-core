var moment = require('moment');

/**
 * Wrapper function for moment.localeData() so it can be mocked
 */
(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('MomentLocaleData', [
    function() {
      return moment.localeData;
    }
  ]);
  
}()); 
