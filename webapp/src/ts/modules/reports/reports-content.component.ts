import { Component, OnInit } from '@angular/core';
import * as _ from 'lodash-es';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { ReportsActions } from '@mm-actions/reports';
import { ChangesService } from '@mm-services/changes.service';


@Component({
  templateUrl: './reports-content.component.html'
})
export class ReportsContentComponent implements OnInit {
  private subscription: Subscription = new Subscription();
  private globalActions;
  private reportsActions;
  forms;
  loadingContent;
  selectedReports;
  selectMode = false; // todo

  validChecks = { }; // todo
  summaries = { }; // todo


  constructor(
    private changesService:ChangesService,
    private store:Store,
  ) {
    this.globalActions = new GlobalActions(store);
    this.reportsActions = new ReportsActions(store);
  }

  ngOnInit() {
    const reduxSubscription = combineLatest(
      this.store.select(Selectors.getSelectedReports),
      this.store.select(Selectors.getForms),
      this.store.select(Selectors.getLoadingContent),
    ).subscribe(([
      selectedReports,
      forms,
      loadingContent,
    ]) => {
      this.selectedReports = selectedReports;
      this.loadingContent = loadingContent;
      this.forms = forms;
    });
    this.subscription.add(reduxSubscription);

    const changesSubscription = this.changesService.subscribe({
      key: 'reports-content',
      filter: (change) => {
        return this.selectedReports &&
          this.selectedReports.length &&
          _.some(this.selectedReports, (item) => item._id === change.id);
      },
      callback: function(change) {
        if (change.deleted) {
          // everything here is todo
          if (this.selectMode) {
            //this.removeSelectedReport(change.id); todo
          } else {
            //this.unsetSelected();
            //$state.go($state.current.name, { id: null });
          }
        } else {
          // everything here is todo
          const selectedReports = this.selectedReports;
          /*ctrl.selectReport(change.id, { silent: true })
            .then(function() {
              if((change.doc && selectedReports[0].formatted.verified !== change.doc.verified) ||
                (change.doc && ('oldVerified' in selectedReports[0].formatted &&
                  selectedReports[0].formatted.oldVerified !== change.doc.verified))) {
                ctrl.setSelectedReports(selectedReports);
                $timeout(function() {
                  ctrl.setFirstSelectedReportFormattedProperty({ verified: change.doc.verified });
                });
              }
            });*/
        }
      }
    });
    this.subscription.add(changesSubscription);
  }

  trackByFn(index, item) {
    return item._id;
  }

  toggleExpand(report) {

  }

  deselect(item, event) {

  }


}

/*const _ = require('lodash/core');

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
      SearchFilters,
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

      ctrl.search = function(query) {
        SearchFilters.freetextSearch(query);
      };

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



      $scope.$on('$destroy', function() {
        unsubscribe();
        changeListener.unsubscribe();
      });
    }
  );

}());*/
