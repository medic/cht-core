import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { SettingsService } from '@mm-services/settings.service';
import { HeaderTab, HeaderTabsService } from '@mm-services/header-tabs.service';
import { GlobalActions } from '@mm-actions/global';
import { ModalService } from '@mm-services/modal.service';
import { LogoutConfirmComponent } from '@mm-modals/logout/logout-confirm.component';
import { FeedbackComponent } from '@mm-modals/feedback/feedback.component';
import { DBSyncService } from '@mm-services/db-sync.service';
import { RouterLink } from '@angular/router';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { AuthDirective } from '@mm-directives/auth.directive';
import { NgIf, NgClass, NgFor } from '@angular/common';
import { MobileDetectionComponent } from '@mm-components/mobile-detection/mobile-detection.component';
import { TranslatePipe } from '@ngx-translate/core';
import { HeaderLogoPipe, ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';
import { RelativeDatePipe } from '@mm-pipes/date.pipe';
import { LocalizeNumberPipe } from '@mm-pipes/number.pipe';
import { StorageInfoService, StorageStatus } from '@mm-services/storage-info.service';

export const OLD_NAV_PERMISSION = 'can_view_old_navigation';

@Component({
  selector: 'mm-header',
  templateUrl: './header.component.html',
  imports: [
    RouterLink,
    BsDropdownModule,
    AuthDirective,
    NgIf,
    NgClass,
    NgFor,
    MobileDetectionComponent,
    TranslatePipe,
    HeaderLogoPipe,
    ResourceIconPipe,
    RelativeDatePipe,
    LocalizeNumberPipe
  ]
})
export class HeaderComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();

  @Input() adminUrl;
  @Input() canLogOut;

  showPrivacyPolicy = false;
  replicationStatus;
  currentTab;
  unreadCount = {};
  permittedTabs: HeaderTab[] = [];

  status: StorageStatus = StorageStatus.STARTUP;
  private availableSpace: number = 0;
  storageUsagePercentage: number = 0;

  private globalActions;

  constructor(
    private store: Store,
    private settingsService: SettingsService,
    private headerTabsService: HeaderTabsService,
    private modalService: ModalService,
    private dbSyncService: DBSyncService,
    private storageInfoService: StorageInfoService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit(): void {
    this.subscribeToStore();
    this.getHeaderTabs();
    this.subscribeToStorageInfo();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private subscribeToStorageInfo() {
    this.subscriptions.add(
      this.storageInfoService.storageInfo$.subscribe(info => {
        this.status = info.status;
        this.availableSpace = info.availableBytes ?? 0;
        this.storageUsagePercentage = info.storageUsagePercentage ?? 0;
      })
    );
  }

  private subscribeToStore() {
    const subscription = combineLatest(
      this.store.select(Selectors.getReplicationStatus),
      this.store.select(Selectors.getCurrentTab),
      this.store.select(Selectors.getShowPrivacyPolicy),
      this.store.select(Selectors.getUnreadCount),
    ).subscribe(([
      replicationStatus,
      currentTab,
      showPrivacyPolicy,
      unreadCount
    ]) => {
      this.replicationStatus = replicationStatus;
      this.currentTab = currentTab;
      this.showPrivacyPolicy = showPrivacyPolicy;
      this.unreadCount = unreadCount;
    });
    this.subscriptions.add(subscription);
  }

  private getHeaderTabs() {
    this.settingsService
      .get()
      .then(settings => this.headerTabsService.getAuthorizedTabs(settings))
      .then(permittedTabs => {
        this.permittedTabs = permittedTabs;
      });
  }

  openFeedback() {
    this.modalService.show(FeedbackComponent);
  }

  logout() {
    this.modalService.show(LogoutConfirmComponent);
  }

  replicate() {
    this.dbSyncService.sync(true);
  }

  get storagePressureClass(): string {
    if (this.storageUsagePercentage < 50) {
      return 'progress-bar-green';
    } else if (this.storageUsagePercentage < 75) {
      return 'progress-bar-yellow';
    }
    return 'progress-bar-red';
  }

  get availableStorageSpace(): string {
    switch (this.status) {
    case StorageStatus.NORMAL:
      return `${StorageInfoService.bytesToGB(this.availableSpace)} GB`;
    case StorageStatus.STARTUP:
      return 'Calculating...';
    default:
      return 'Error calculating available space';
    }
  }
}
