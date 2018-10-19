angular
  .module('inboxServices')
  .service('Form2Sms', function(
    $log
  ) {
    'use strict';
    'ngInject';

    return function() {
      $log.error('Welcome to Form2Sms');
      return 'utternonsenseutternonsenseutternonsenseutternonsenseutternonsenseutternonsenseutternonsense';
    };
  });
