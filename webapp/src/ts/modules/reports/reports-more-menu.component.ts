import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Data, NavigationStart, Router } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';

import { Selectors } from '@mm-selectors/index';
import { AuthService } from '@mm-services/auth.service';
import { GlobalActions } from '@mm-actions/global';
import { ResponsiveService } from '@mm-services/responsive.service';
import { SessionService } from '@mm-services/session.service';
import { OLD_ACTION_BAR_PERMISSION } from '@mm-components/actionbar/actionbar.component';
import { ReportsActions } from '@mm-actions/reports';


@Component({
  selector: 'mm-reports-more-menu',
  templateUrl: './reports-more-menu.component.html'
})
export class ReportsMoreMenuComponent implements OnInit, OnDestroy {
  @Output() exportReports: EventEmitter<any> = new EventEmitter();
  @ViewChild('verifyReportWrapper') verifyReportWrapper;

  private reportsActions: ReportsActions;
  private globalActions: GlobalActions;
  private hasExportPermission = false;
  private hasEditPermission = false;
  private hasDeletePermission = false;
  private hasVerifyPermission = false;
  private hasEditVerifyPermission = false;
  private hasUpdatePermission = false;
  private selectMode = false;
  private loadingContent: boolean;
  private snapshotData: Data | undefined;
  private isOnlineOnly: boolean;

  subscription: Subscription = new Subscription();
  reportsList;
  selectedReportDoc;
  useOldActionBar = false;
  verifyingReport = false;
  processingReportVerification = false;

  constructor(
    private store: Store,
    private router: Router,
    private authService: AuthService,
    private responsiveService: ResponsiveService,
    private sessionService: SessionService,
    private matBottomSheet: MatBottomSheet,
    private matDialog: MatDialog,
  ) {
    this.globalActions = new GlobalActions(store);
    this.reportsActions = new ReportsActions(store);
  }

  ngOnInit(): void {
    this.subscribeToStore();
    this.checkPermissions();
    this.subscribeToRouter();
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
      this.store.select(Selectors.getVerifyingReport),
      this.store.select(Selectors.getLoadingSubActionBar),
    ).subscribe(([
      reportsList,
      snapshotData,
      loadingContent,
      selectedReportDoc,
      selectMode,
      verifyingReport,
      loadingSubActionBar,
    ]) => {
      this.reportsList = reportsList;
      this.snapshotData = snapshotData;
      this.loadingContent = loadingContent;
      this.selectedReportDoc = selectedReportDoc;
      this.selectMode = selectMode;
      this.verifyingReport = verifyingReport;
      this.processingReportVerification = loadingSubActionBar;
    });
    this.subscription.add(storeSubscription);
  }

  private subscribeToRouter() {
    const routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationStart))
      .subscribe(() => this.closeVerifyReportComponents());
    this.subscription.add(routerSubscription);
  }

  private async checkPermissions() {
    this.hasEditPermission = await this.authService.has('can_edit');
    this.hasUpdatePermission = await this.authService.has('can_update_reports');
    this.hasDeletePermission = await this.authService.has('can_delete_reports');
    this.hasExportPermission = await this.authService.any([[ 'can_export_all' ], [ 'can_export_messages' ]]);
    this.hasVerifyPermission = await this.authService.has('can_verify_reports');
    this.hasEditVerifyPermission = await this.authService.has('can_edit_verification');
    this.useOldActionBar = !this.sessionService.isDbAdmin() && await this.authService.has(OLD_ACTION_BAR_PERMISSION);
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

  displayVerifyReportOption() {
    const hasFullPermissions = this.hasEditVerifyPermission && this.hasVerifyPermission;
    const hasPartialPermissions = this.selectedReportDoc?.verified === undefined && this.hasVerifyPermission;

    return this.selectedReportDoc
      && !this.selectMode
      && !this.loadingContent
      && this.snapshotData?.name === 'reports.detail'
      && this.hasEditPermission
      && (hasFullPermissions || hasPartialPermissions);
  }

  isReportCorrect(isCorrect: boolean) {
    this.reportsActions.verifyReport(isCorrect);
    this.closeVerifyReportComponents();
  }

  openVerifyReportOptions() {
    this.closeVerifyReportComponents();

    if (this.responsiveService.isMobile()) {
      this.matBottomSheet.open(this.verifyReportWrapper);
      return;
    }

    this.matDialog.open(this.verifyReportWrapper, {
      autoFocus: false,
      minWidth: 300,
      minHeight: 150,
    });
  }

  closeVerifyReportComponents() {
    this.matBottomSheet.dismiss();
    this.matDialog.closeAll();
  }
}
