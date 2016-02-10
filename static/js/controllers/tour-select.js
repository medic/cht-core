var modal = require('../modules/modal'),
    tour = require('../modules/tour');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('TourSelectCtrl',
    ['$scope', '$state', '$translate',
    function ($scope, $state, $translate) {

      var start = function(name) {
        var route = tour.getRoute(name);
        if ($state.is(route)) {
          // already on required page - show tour
          $translate.onReady().then(function() {
            tour.start(name, $translate.instant);
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