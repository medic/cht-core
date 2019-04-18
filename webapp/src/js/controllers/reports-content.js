var _ = require('underscore');

(function () {

  'use strict';

  angular.module('inboxControllers').controller('ReportsContentCtrl',
    function (
      $log,
      $ngRedux,
      $scope,
      $stateParams,
      $timeout,
      Changes,
      GlobalActions,
      MessageState,
      ReportsActions,
      Selectors
    ) {

      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          loadingContent: Selectors.getLoadingContent(state),
          selectMode: Selectors.getSelectMode(state),
          selectedReports: Selectors.getSelectedReports(state),
          summaries: Selectors.getSelectedReportsSummaries(state),
          validChecks: Selectors.getSelectedReportsValidChecks(state)
        };
      };
      const mapDispatchToTarget = function(dispatch) {
        const globalActions = GlobalActions(dispatch);
        const reportsActions = ReportsActions(dispatch);
        return {
          clearCancelCallback: globalActions.clearCancelCallback,
          setFirstSelectedReportFormattedProperty: reportsActions.setFirstSelectedReportFormattedProperty,
          setSelectedReports: reportsActions.setSelectedReports,
          setRightActionBarVerified: globalActions.setRightActionBarVerified,
          updateSelectedReportItem: reportsActions.updateSelectedReportItem
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

      $scope.selectReport($stateParams.id);
      ctrl.clearCancelCallback();
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
        if (!ctrl.selectMode) {
          return;
        }

        var id = selection._id;
        if (selection.report || selection.expanded) {
          ctrl.updateSelectedItem(id, { expanded: !selection.expanded });
        } else {
          ctrl.updateSelectedItem(id, { loading: true });
          $scope.refreshReportSilently(id)
            .then(function() {
              ctrl.updateSelectedItem(id, { loading: false, expanded: true });
            })
            .catch(function(err) {
              ctrl.updateSelectedItem(id, { loading: false });
              $log.error('Error fetching doc for expansion', err);
            });
        }
      };

      $scope.deselect = function(report, $event) {
        if (ctrl.selectMode) {
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
          return ctrl.selectedReports &&
            ctrl.selectedReports.length &&
            _.some(ctrl.selectedReports, function(item) {
              return item._id === change.id;
            });
        },
        callback: function(change) {
          if (change.deleted) {
            $scope.$apply(function() {
              $scope.deselectReport(change.doc);
            });
          } else {
            var selectedReports = ctrl.selectedReports;
            $scope.refreshReportSilently(change.doc)
              .then(function() {
                if(selectedReports[0].formatted.verified !== change.doc.verified ||
                   ('oldVerified' in selectedReports[0].formatted &&
                    selectedReports[0].formatted.oldVerified !== change.doc.verified)) {
                  ctrl.setSelectedReports(selectedReports);
                  $timeout(function() {
                    ctrl.setFirstSelectedReportFormattedProperty({ verified: change.doc.verified });
                  });
                }
              });
          }
        }
      });

      $scope.$on('$destroy', function() {
        unsubscribe();
        changeListener.unsubscribe();
      });

      $scope.$on('VerifiedReport', function(e, valid) {
        var oldVerified = ctrl.selectedReports[0].formatted.verified;
        var newVerified = oldVerified === valid ? undefined : valid;

        ctrl.setFirstSelectedReportFormattedProperty({ verified: newVerified, oldVerified: oldVerified });

        ctrl.setRightActionBarVerified(newVerified);
      });
    }
  );

}());
