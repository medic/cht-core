angular
  .module('inboxServices')
  .service('Form2Sms', function(
    $log,
    DB
  ) {
    'use strict';
    'ngInject';

    return function(doc) {
      $log.error('Welcome to Form2Sms', Array.prototype.slice.call(arguments));
      return DB()
        .get('form:' + doc.form)
        .then(function(form) {
          $log.error('Form2Sms', doc, form);
          return 'utternonsenseutternonsenseutternonsenseutternonsenseutternonsenseutternonsenseutternonsense';
        })
        .catch(function(err) {
          $log.error('Form2Sms failed: ' + err);
        });
    };
  });
