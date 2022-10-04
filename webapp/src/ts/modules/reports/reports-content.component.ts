import { Component, OnDestroy, OnInit } from '@angular/core';
import * as _ from 'lodash-es';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { ReportsActions } from '@mm-actions/reports';
import { ChangesService } from '@mm-services/changes.service';
import { SearchFiltersService } from '@mm-services/search-filters.service';
import { MessageStateService } from '@mm-services/message-state.service';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { EditMessageGroupComponent } from '@mm-modals/edit-message-group/edit-message-group.component';

@Component({
  templateUrl: './reports-content.component.html'
})
export class ReportsContentComponent implements OnInit, OnDestroy {
  subscription: Subscription = new Subscription();
  private globalActions;
  private reportsActions;
  forms;
  loadingContent;
  selectedReports;
  selectModeActive;
  validChecks;
  summaries;

  constructor(
    private changesService:ChangesService,
    private store:Store,
    private route:ActivatedRoute,
    private router:Router,
    private searchFiltersService:SearchFiltersService,
    private messageStateService:MessageStateService,
    private modalService:ModalService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.reportsActions = new ReportsActions(store);
  }

  ngOnInit() {
    const reduxSubscription = combineLatest(
      this.store.select(Selectors.getSelectedReports),
      this.store.select(Selectors.getSelectedReportsSummaries),
      this.store.select(Selectors.getSelectedReportsValidChecks),
      this.store.select(Selectors.getForms),
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getSelectMode),
    ).subscribe(([
      selectedReports,
      summaries,
      validChecks,
      forms,
      loadingContent,
      selectMode,
    ]) => {
      this.selectedReports = selectedReports;
      this.summaries = summaries;
      this.validChecks = validChecks;
      this.loadingContent = loadingContent;
      this.forms = forms;
      this.selectModeActive = selectMode?.active;
    });
    this.subscription.add(reduxSubscription);

    const isMatchingRouteParam = (change) => this.route.snapshot.params?.id === change.id;

    const changesSubscription = this.changesService.subscribe({
      key: 'reports-content',
      filter: (change) => {
        const isSelected = this.selectedReports &&
          this.selectedReports.length &&
          _.some(this.selectedReports, (item) => item._id === change.id);
        // When submitting new report that gets updated immediately by Sentinel,
        // we might be in a situation where we receive the change before the report was fully selected
        return isSelected || isMatchingRouteParam(change);
      },
      callback: (change) => {
        if (change.deleted) {
          if (this.selectModeActive) {
            this.reportsActions.removeSelectedReport(change.id);
          } else {
            return this.router.navigate([this.route.snapshot.parent.routeConfig.path]);
          }
        } else if (!this.route.snapshot.params?.id || isMatchingRouteParam(change)) {
          // Avoid selecting this report if a different report is already being routed to
          this.reportsActions.selectReport(change.id, { silent: true });
        }
      }
    });
    this.subscription.add(changesSubscription);

    const routeSubscription =  this.route.params.subscribe((params) => {
      if (params.id) {
        this.reportsActions.selectReport(this.route.snapshot.params.id);
        this.globalActions.clearNavigation();

        $('.tooltip').remove();
      } else {
        this.globalActions.unsetSelected();
      }
    });
    this.subscription.add(routeSubscription);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.reportsActions.setSelectedReports([]);
  }

  trackByFn(index, item) {
    return item.doc?._id + item.doc?._rev;
  }

  toggleExpand(report) {
    if (!this.selectModeActive || !report?._id) {
      return;
    }

    const id = report._id;
    if (report.doc || report.expanded) {
      this.reportsActions.updateSelectedReportItem(id, { expanded: !report.expanded });
    } else {
      this.reportsActions.updateSelectedReportItem(id, { loading: true, expanded: true });
      this.reportsActions.selectReport(id, { silent: true });
    }
  }

  deselect(report, event) {
    if (this.selectModeActive) {
      event.stopPropagation();
      this.reportsActions.removeSelectedReport(report);
    }
  }

  search(query) {
    this.searchFiltersService.freetextSearch(query);
  }

  canMute(group) {
    return this.messageStateService.any(group, 'scheduled');
  }

  canSchedule(group) {
    return this.messageStateService.any(group, 'muted');
  }

  private setMessageState(report, group, from, to, localContext:any={}) {
    localContext.loading = true;
    const id = report?._id;
    const groupNumber = group?.rows?.[0]?.group;
    return this.messageStateService
      .set(id, groupNumber, from, to)
      .catch((err) => {
        localContext.loading = false;
        console.error('Error setting message state', err);
      });
  }

  mute(report, group, localContext) {
    this.setMessageState(report, group, 'scheduled', 'muted', localContext);
  }

  schedule(report, group, localContext) {
    this.setMessageState(report, group, 'muted', 'scheduled', localContext);
  }

  edit(report, group) {
    return this.modalService
      .show(
        EditMessageGroupComponent,
        { initialState: { model: { report, group: _.cloneDeep(group) } } },
      )
      .catch(() => {});
  }
}
