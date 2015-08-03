(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ReportsContentCtrl', 
    ['$scope', '$stateParams', 'MessageState', 'DB',
    function ($scope, $stateParams, MessageState, db) {

      $scope.selectMessage($stateParams.id);
      $('.tooltip').remove();

      $scope.canMute = function(group) {
        return MessageState.any(group, 'scheduled');
      };

      $scope.canSchedule = function(group) {
       return MessageState.any(group, 'muted');
      };

      var setMessageState = function(group, from, to) {
        group.loading = true;
        var id = $scope.selected._id;
        var groupNumber = group.rows[0].group;
        MessageState.set(id, groupNumber, from, to).catch(function(err) {
          group.loading = false;
          console.log('Error setting message state', err);
        });
      };

      $scope.mute = function(group) {
        setMessageState(group, 'scheduled', 'muted');
      };

      $scope.schedule = function(group) {
        setMessageState(group, 'muted', 'scheduled');
      };
    }
  ]);

}());
