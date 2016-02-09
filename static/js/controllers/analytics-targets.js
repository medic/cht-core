(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('AnalyticsTargetsCtrl',
    ['$scope', '$log', 'Search',
    function ($scope, $log, Search) {
      $scope.targets = [];
      var searchScope = {
        filterModel: {
          type: 'contacts',
          contactTypes: [ 'clinic' ]
        },
        filterQuery: ''
      };
      Search(searchScope, { limit: 10000 }, function(err, data) {
        if (err) {
          $log.error('Error fetching number of registrations', err);
          return;
        }
        $scope.targets.push({
          name: 'analytics.targets.registrations',
          value: data.length
        });
      });
    }
  ]);

}());