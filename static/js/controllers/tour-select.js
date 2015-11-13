var modal = require('../modules/modal'),
    tour = require('../modules/tour');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('TourSelectCtrl',
    ['$scope', '$rootScope', '$state', '$timeout', 'translateFilter', 'Settings',
    function ($scope, $rootScope, $state, $timeout, translateFilter, Settings) {

      var start = function(name) {
        var route = tour.getRoute(name);
        if ($state.is(route)) {
          // already on required page - show tour
          // load settings to ensure translations are available
          Settings()
            .then(function(settings) {
              tour.start(name, translateFilter);
            })
            .catch(function(err) {
              console.log('Error loading settings', err);
            });
        } else {
          // navigate to the correct page
          $state.go(route, { tour: name });
        }
      };

      // called when invoked explicitely in the tour select modal
      $scope.start = function(name) {
        modal.start($('#tour-select')).done();
        start(name);
      };

      // fired when 'tour' query param in URL
      $scope.$on('TourStart', function(e, name) {
        start(name);
      });

    }
  ]);

}());