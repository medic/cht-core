var _ = require('underscore');

(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ReportsContentCtrl',
    function (
      $log,
      $scope,
      $stateParams,
      $timeout,
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

      var setMessageState = function(report, group, from, to) {
        group.loading = true;
        var id = report._id;
        var groupNumber = group.rows[0].group;
        MessageState.set(id, groupNumber, from, to).catch(function(err) {
          group.loading = false;
          $log.error('Error setting message state', err);
        });
      };

      $scope.mute = function(report, group) {
        setMessageState(report, group, 'scheduled', 'muted');
      };

      $scope.schedule = function(report, group) {
        setMessageState(report, group, 'muted', 'scheduled');
      };

      $scope.toggleExpand = function(selection) {
        if (!$scope.selectMode) {
          return;
        }
        if (selection.report || selection.expanded) {
          selection.expanded = !selection.expanded;
        } else {
          selection.loading = true;
          $scope.refreshReportSilently(selection._id)
            .then(function() {
              selection.loading = false;
              selection.expanded = true;
            })
            .catch(function(err) {
              selection.loading = false;
              $log.error('Error fetching doc for expansion', err);
            });
        }
      };

      $scope.deselect = function(report, $event) {
        if ($scope.selectMode) {
          $event.stopPropagation();
          $scope.deselectReport(report);
        }
      };

      $scope.labelIsIDorName = (label) => {
        return label.endsWith('.patient_id') || label.endsWith('.patient_uuid') || label.endsWith('.patient_name');
      };

      var changeListener = Changes({
        key: 'reports-content',
        filter: function(change) {
          return $scope.selected &&
            $scope.selected.length &&
            _.some($scope.selected, function(item) {
              return item._id === change.id;
            });
        },
        callback: function(change) {
          if (change.deleted) {
            $scope.$apply(function() {
              $scope.deselectReport(change.doc);
            });
          } else {
            var selected = $scope.selected;
            $scope.refreshReportSilently(change.doc)
              .then(function() {
                if(selected[0].formatted.verified !== change.doc.verified) {
                  $scope.selected = selected;
                  $timeout(function() {
                    $scope.selected[0].formatted.verified = change.doc.verified;
                  });
                }
              });
          }
        }
      });

      $scope.$on('$destroy', changeListener.unsubscribe);
    }
  );

}());
