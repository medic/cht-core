import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';

import { Selectors } from '@mm-selectors/index';
import { AuthService } from '@mm-services/auth.service';
import { GlobalActions } from '@mm-actions/global';
import { ResponsiveService } from '@mm-services/responsive.service';

@Component({
  selector: 'mm-reports-more-menu',
  templateUrl: './reports-more-menu.component.html'
})
export class ReportsMoreMenuComponent implements OnInit, OnDestroy {
  @Output() exportReports: EventEmitter<any> = new EventEmitter();

  private globalActions: GlobalActions;
  private hasExportPermission = false;
  private hasEditPermission = false;
  private hasDeletePermission = false;
  private hasUpdatePermission = false;
  private selectMode = false;
  private loadingContent;
  private snapshotData;
  private isOnlineOnly;

  subscription: Subscription = new Subscription();
  reportsList;
  selectedReportDoc;

  constructor(
    private store:Store,
    private route:ActivatedRoute,
    private router:Router,
    private authService:AuthService,
    private responsiveService: ResponsiveService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit(): void {
    this.subscribeToStore();
    this.checkPermissions();
    this.isOnlineOnly = this.authService.online(true);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private subscribeToStore() {
    const storeSubscription = combineLatest(
      this.store.select(Selectors.getReportsList),
      this.store.select(Selectors.getSnapshotData),
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getSelectedReportDoc),
      this.store.select(Selectors.getSelectMode),
    ).subscribe(([
      reportsList,
      snapshotData,
      loadingContent,
      selectedReportDoc,
      selectMode,
    ]) => {
      this.reportsList = reportsList;
      this.snapshotData = snapshotData;
      this.loadingContent = loadingContent;
      this.selectedReportDoc = selectedReportDoc;
      this.selectMode = selectMode;
    });
    this.subscription.add(storeSubscription);
  }

  private async checkPermissions() {
    this.hasEditPermission = await this.authService.has('can_edit');
    this.hasUpdatePermission = await this.authService.has('can_update_reports');
    this.hasDeletePermission = await this.authService.has('can_delete_reports');
    this.hasExportPermission = await this.authService.any([[ 'can_export_all' ], [ 'can_export_messages' ]]);
  }

  deleteReport() {
    this.globalActions.deleteDocConfirm(this.selectedReportDoc);
  }

  displayDeleteOption() {
    return this.selectedReportDoc
      && !this.selectMode
      && !this.loadingContent
      && this.hasEditPermission
      && this.hasDeletePermission
      && this.snapshotData?.name === 'reports.detail';
  }

  displayEditOption() {
    return this.selectedReportDoc
      && !this.selectMode
      && !this.loadingContent
      && this.hasEditPermission
      && this.hasUpdatePermission
      && this.snapshotData?.name === 'reports.detail'
      && this.selectedReportDoc?.content_type === 'xml';
  }

  displayExportOption() {
    return !this.selectMode && this.isOnlineOnly && this.hasExportPermission && !this.responsiveService.isMobile();
  }
}
