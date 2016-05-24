var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ReportsContentCtrl',
    function (
      $log,
      $scope,
      $stateParams,
      Changes,
      MessageState
    ) {

      'ngInject';

      $scope.selectReport($stateParams.id);
      $scope.clearCancelTarget();
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
          $log.error('Error setting message state', err);
        });
      };

      $scope.mute = function(group) {
        setMessageState(group, 'scheduled', 'muted');
      };

      $scope.schedule = function(group) {
        setMessageState(group, 'muted', 'scheduled');
      };

      $scope.toggleExpand = function(selection) {
        if ($scope.selectMode) {
          selection.expanded = !selection.expanded;
        }
      };

      $scope.deselect = function(selection, $event) {
        if ($scope.selectMode) {
          $event.stopPropagation();
          for (var i = 0; i < $scope.selected.length; i++) {
            if ($scope.selected[i].report._id === selection._id) {
              $scope.selected.splice(i, 1);
              $('#reports-list li[data-record-id="' + selection._id + '"] input[type="checkbox"]')
                .prop('checked', false);
              return;
            }
          }
        }
      };

      Changes({
        key: 'reports-content',
        filter: function(change) {
          return $scope.selected &&
            $scope.selected.length &&
            _.some($scope.selected, function(item) {
              return item.report._id === change.id;
            });
        },
        callback: function(change) {
          if (change.deleted) {
            $scope.$apply(function() {
              $scope.unselectReport(change.doc);
            });
          } else {
            $scope.refreshReportSilently(change.doc);
          }
        }
      });
    }
  );

}());
