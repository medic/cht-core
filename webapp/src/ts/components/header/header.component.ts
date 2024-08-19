import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { SettingsService } from '@mm-services/settings.service';
import { HeaderTab, HeaderTabsService } from '@mm-services/header-tabs.service';
import { AuthService } from '@mm-services/auth.service';
import { GlobalActions } from '@mm-actions/global';
import { ModalService } from '@mm-services/modal.service';
import { SessionService } from '@mm-services/session.service';
import { LogoutConfirmComponent } from '@mm-modals/logout/logout-confirm.component';
import { FeedbackComponent } from '@mm-modals/feedback/feedback.component';
import { DBSyncService } from '@mm-services/db-sync.service';

export const OLD_NAV_PERMISSION = 'can_view_old_navigation';

@Component({
  selector: 'mm-header',
  templateUrl: './header.component.html'
})
export class HeaderComponent implements OnInit, OnDestroy {
  private subscription: Subscription = new Subscription();

  @Input() adminUrl;
  @Input() canLogOut;

  showPrivacyPolicy = false;
  replicationStatus;
  currentTab;
  hasOldNav;
  unreadCount = {};
  permittedTabs: HeaderTab[] = [];

  private globalActions;

  constructor(
    private store: Store,
    private settingsService: SettingsService,
    private headerTabsService: HeaderTabsService,
    private authService: AuthService,
    private modalService: ModalService,
    private sessionService: SessionService,
    private dbSyncService: DBSyncService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit(): void {
    this.enableOldNav();
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

  private async enableOldNav() {
    this.hasOldNav = !this.sessionService.isAdmin() && await this.authService.has(OLD_NAV_PERMISSION);
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
