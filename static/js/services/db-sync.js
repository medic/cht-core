var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var backOffFunction = function(prev) {
    if (prev <= 0) {
      // first run, backoff 1 second
      return 1000;
    }
    // double the backoff, maxing out at 1 minute
    return Math.min(prev * 2, 60000);
  };

  var authenticationIssue = function(errors) {
    return _.findWhere(errors, { status: 401 });
  };

  inboxServices.factory('DBSync',
    function(
      DB,
      Session
    ) {

      'ngInject';

      return function() {
        console.log('~~~~~~~~~~~~~ starting sync');
        // TODO add retry
        DB.get().replicate.from(DB.getRemote(), {
          live: true,
          timeout: false,
          heartbeat: 10000,
          back_off_function: backOffFunction
        })
          .on('change', function (info) {
            console.log('~~~~~~~~~~~~~ sync change', info);
          })
          .on('paused', function (err) {
            console.log('~~~~~~~~~~~~~ sync paused', err);
          })
          .on('active', function () {
            console.log('~~~~~~~~~~~~~ sync active');
          })
          .on('denied', function (err) {
            console.log('~~~~~~~~~~~~~ sync denied', err);
          })
          .on('complete', function (info) {
            console.log('~~~~~~~~~~~~~ sync complete', info);
            if (!info.ok && authenticationIssue(info.errors)) {
              Session.navigateToLogin();
            }
          })
          .on('error', function (err) {
            console.log('~~~~~~~~~~~~~ sync error', err);
          });
      };

    }
  );

}());
