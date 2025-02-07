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
import { AuthDirective } from '../../directives/auth.directive';
import { NgIf, NgClass, NgFor } from '@angular/common';
import { MobileDetectionComponent } from '../mobile-detection/mobile-detection.component';
import { TranslatePipe } from '@ngx-translate/core';
import { HeaderLogoPipe, ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';
import { RelativeDatePipe } from '@mm-pipes/date.pipe';
import { LocalizeNumberPipe } from '@mm-pipes/number.pipe';

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
  private subscription: Subscription = new Subscription();

  @Input() adminUrl;
  @Input() canLogOut;

  showPrivacyPolicy = false;
  replicationStatus;
  currentTab;
  unreadCount = {};
  permittedTabs: HeaderTab[] = [];

  private globalActions;

  constructor(
    private store: Store,
    private settingsService: SettingsService,
    private headerTabsService: HeaderTabsService,
    private modalService: ModalService,
    private dbSyncService: DBSyncService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit(): void {
    this.subscribeToStore();
    this.getHeaderTabs();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
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
    this.subscription.add(subscription);
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
}
