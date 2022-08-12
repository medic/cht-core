import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';

import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { GlobalActions } from '@mm-actions/global';
import { ReportsActions } from '@mm-actions/reports';
import { Selectors } from '@mm-selectors/index';
import { BulkDeleteConfirmComponent } from '@mm-modals/bulk-delete-confirm/bulk-delete-confirm.component';

@Component({
  selector: 'mm-actionbar',
  templateUrl: './actionbar.component.html'
})
export class ActionbarComponent implements OnInit, OnDestroy {
  @Input() nonContactForms = [];
  private subscription: Subscription = new Subscription();
  private globalActions;
  private reportsActions;

  currentTab;
  snapshotData;
  selectMode;
  selectedReportsDocs = [];
  actionBar;
  showActionBar;
  loadingContent;
  loadingSubActionBar;
  selectedContactDoc;
  sidebarFilter;

  constructor(
    private store: Store,
    private modalService: ModalService,
  ) {
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
      this.store.select(Selectors.getSelectedReportsDocs),
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
      selectedReportsDocs,
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
      this.selectedReportsDocs = selectedReportsDocs;
      this.selectedContactDoc = selectedContactDoc;
    });
    this.subscription.add(subscription);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  setSelect(selectMode) {
    this.reportsActions.setSelectMode(selectMode);
  }

  selectAll() {
    this.reportsActions.selectAll();
  }

  deselectAll() {
    this.reportsActions.deselectAll();
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

  bulkDelete(docs) {
    if (!docs) {
      console.warn('Trying to delete empty object', docs);
      return;
    }

    if (!docs.length) {
      console.warn('Trying to delete empty array', docs);
      return;
    }

    this.modalService
      .show(BulkDeleteConfirmComponent, { initialState: { model: { docs } } })
      .catch(() => {});
  }

  trackById(idx, item) {
    return item.id;
  }
}
