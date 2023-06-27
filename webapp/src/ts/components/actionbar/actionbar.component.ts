import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { ReportsActions } from '@mm-actions/reports';
import { Selectors } from '@mm-selectors/index';

export const OLD_ACTION_BAR_PERMISSION:string = 'can_view_old_action_bar';

@Component({
  selector: 'mm-actionbar',
  templateUrl: './actionbar.component.html'
})
export class ActionbarComponent implements OnInit, OnDestroy {
  @Input() reportForms = [];
  private subscription: Subscription = new Subscription();
  private globalActions;
  private reportsActions;

  currentTab;
  snapshotData;
  selectMode;
  selectedReportDoc;
  actionBar;
  showActionBar;
  loadingContent;
  loadingSubActionBar;
  selectedContactDoc;
  sidebarFilter;

  constructor(private store: Store) {
    this.globalActions = new GlobalActions(store);
    this.reportsActions = new ReportsActions(store);
  }

  ngOnInit(): void {
    const subscription = combineLatest(
      this.store.select(Selectors.getActionBar),
      this.store.select(Selectors.getCurrentTab),
      this.store.select(Selectors.getSnapshotData),
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getLoadingSubActionBar),
      this.store.select(Selectors.getSelectMode),
      this.store.select(Selectors.getShowActionBar),
      this.store.select(Selectors.getSidebarFilter),
      this.store.select(Selectors.getSelectedReportDoc),
      this.store.select(Selectors.getSelectedContactDoc),
    ).subscribe(([
      actionBar,
      currentTab,
      snapshotData,
      loadingContent,
      loadingSubActionBar,
      selectMode,
      showActionBar,
      sidebarFilter,
      selectedReportDoc,
      selectedContactDoc
    ]) => {
      this.currentTab = currentTab;
      this.snapshotData = snapshotData;
      this.selectMode = selectMode;
      this.actionBar = actionBar;
      this.showActionBar = showActionBar;
      this.sidebarFilter = sidebarFilter;
      this.loadingContent = loadingContent;
      this.loadingSubActionBar = loadingSubActionBar;
      this.selectedReportDoc = selectedReportDoc;
      this.selectedContactDoc = selectedContactDoc;
    });
    this.subscription.add(subscription);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  verifyReport(reportIsVerified) {
    this.reportsActions.verifyReport(reportIsVerified);
  }

  toggleVerifyingReport() {
    this.reportsActions.toggleVerifyingReport();
  }

  launchEditFacilityDialog() {
    this.reportsActions.launchEditFacilityDialog();
  }

  deleteDoc(doc) {
    this.globalActions.deleteDocConfirm(doc);
  }

  trackById(idx, item) {
    return item.id;
  }
}
