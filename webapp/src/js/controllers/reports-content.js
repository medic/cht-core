const _ = require('underscore');

(function () {

  'use strict';

  angular.module('inboxControllers').controller('ReportsContentCtrl',
    function (
      $log,
      $ngRedux,
      $scope,
      $state,
      $stateParams,
      $timeout,
      Changes,
      GlobalActions,
      MessageState,
      Modal,
      ReportsActions,
      Selectors
    ) {

      'ngInject';

      const ctrl = this;
      const mapStateToTarget = function(state) {
        return {
          forms: Selectors.getForms(state),
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
          unsetSelected: globalActions.unsetSelected,
          clearCancelCallback: globalActions.clearCancelCallback,
          removeSelectedReport: reportsActions.removeSelectedReport,
          selectReport: reportsActions.selectReport,
          setFirstSelectedReportFormattedProperty: reportsActions.setFirstSelectedReportFormattedProperty,
          setSelectedReports: reportsActions.setSelectedReports,
          setRightActionBarVerified: globalActions.setRightActionBarVerified,
          updateSelectedReportItem: reportsActions.updateSelectedReportItem
        };
      };
      const unsubscribe = $ngRedux.connect(mapStateToTarget, mapDispatchToTarget)(ctrl);

      if ($stateParams.id) {
        ctrl.selectReport($stateParams.id);
        ctrl.clearCancelCallback();
        $('.tooltip').remove();
      } else {
        ctrl.unsetSelected();
      }

      ctrl.canMute = function(group) {
        return MessageState.any(group, 'scheduled');
      };

      ctrl.canSchedule = function(group) {
        return MessageState.any(group, 'muted');
      };

      const setMessageState = function(report, group, from, to) {
        group.loading = true;
        const id = report._id;
        const groupNumber = group.rows[0].group;
        MessageState.set(id, groupNumber, from, to).catch(function(err) {
          group.loading = false;
          $log.error('Error setting message state', err);
        });
      };

      ctrl.mute = function(report, group) {
        setMessageState(report, group, 'scheduled', 'muted');
      };

      ctrl.schedule = function(report, group) {
        setMessageState(report, group, 'muted', 'scheduled');
      };

      ctrl.toggleExpand = function(selection) {
        if (!ctrl.selectMode) {
          return;
        }

        const id = selection._id;
        if (selection.report || selection.expanded) {
          ctrl.updateSelectedReportItem(id, { expanded: !selection.expanded });
        } else {
          ctrl.updateSelectedReportItem(id, { loading: true });
          ctrl.selectReport(id, { silent: true })
            .then(function() {
              ctrl.updateSelectedReportItem(id, { loading: false, expanded: true });
            })
            .catch(function(err) {
              ctrl.updateSelectedReportItem(id, { loading: false });
              $log.error('Error fetching doc for expansion', err);
            });
        }
      };

      ctrl.deselect = function(report, $event) {
        if (ctrl.selectMode) {
          $event.stopPropagation();
          ctrl.removeSelectedReport(report._id);
        }
      };

      ctrl.edit = (report, group) => {
        Modal({
          templateUrl: 'templates/modals/edit_message_group.html',
          controller: 'EditMessageGroupCtrl',
          controllerAs: 'editMessageGroupCtrl',
          model: {
            report: report,
            group: angular.copy(group),
          },
        }).catch(() => {}); // dismissed
      };

      const changeListener = Changes({
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
            if (ctrl.selectMode) {
              ctrl.removeSelectedReport(change.id);
            } else {
              ctrl.unsetSelected();
              $state.go($state.current.name, { id: null });
            }
          } else {
            const selectedReports = ctrl.selectedReports;
            ctrl.selectReport(change.id, { silent: true })
              .then(function() {
                if((change.doc && selectedReports[0].formatted.verified !== change.doc.verified) ||
                   (change.doc && ('oldVerified' in selectedReports[0].formatted &&
                    selectedReports[0].formatted.oldVerified !== change.doc.verified))) {
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
    }
  );

}());
