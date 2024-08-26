import { Component, OnDestroy, OnInit, ViewChild, Input } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { LocationService } from '@mm-services/location.service';
import { DBSyncService } from '@mm-services/db-sync.service';
import { ModalService } from '@mm-services/modal.service';
import { LogoutConfirmComponent } from '@mm-modals/logout/logout-confirm.component';
import { FeedbackComponent } from '@mm-modals/feedback/feedback.component';

@Component({
  selector: 'mm-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
})
export class SidebarMenuComponent implements OnInit, OnDestroy {
  @Input() canLogOut: boolean = false;
  @ViewChild('sidebar') sidebar!: MatSidenav;
  private subscriptions: Subscription = new Subscription();
  private globalActions: GlobalActions;
  replicationStatus;
  moduleOptions: MenuOptions[] = [];
  secondaryOptions: MenuOptions[] = [];
  adminAppPath: string = '';

  constructor(
    private store: Store,
    private locationService: LocationService,
    private dbSyncService: DBSyncService,
    private modalService: ModalService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    this.adminAppPath = this.locationService.adminPath;
    this.setModuleOptions();
    this.setSecondaryOptions();
    this.subscribeToStore();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  close() {
    return this.globalActions.closeSidebarMenu();
  }

  replicate() {
    if (this.replicationStatus?.current?.disableSyncButton) {
      return;
    }
    return this.dbSyncService.sync(true);
  }

  logout() {
    this.modalService.show(LogoutConfirmComponent);
  }

  private subscribeToStore() {
    const subscribeStore = combineLatest(
      this.store.select(Selectors.getReplicationStatus),
      this.store.select(Selectors.getSidebarMenu),
    ).subscribe(([ replicationStatus, sidebarMenu ]) => {
      this.replicationStatus = replicationStatus;
      this.toggleSidebarMenu(sidebarMenu);
    });
    this.subscriptions.add(subscribeStore);

    const subscribePrivacyPolicy = this.store
      .select(Selectors.getShowPrivacyPolicy)
      .subscribe(showPrivacyPolicy => {
        this.setSecondaryOptions(showPrivacyPolicy);
      });
    this.subscriptions.add(subscribePrivacyPolicy);
  }

  private openFeedback() {
    this.modalService.show(FeedbackComponent);
  }

  private toggleSidebarMenu(sidebarMenu: SidebarMenu) {
    if (sidebarMenu?.isOpen) {
      return this.sidebar?.open();
    }
    return this.sidebar?.close();
  }

  private setModuleOptions() {
    this.moduleOptions = [
      {
        routerLink: 'messages',
        icon: 'fa-envelope',
        translationKey: 'Messages',
        hasPermissions: 'can_view_messages,!can_view_messages_tab'
      },
      {
        routerLink: 'tasks',
        icon: 'fa-flag',
        translationKey: 'Tasks',
        hasPermissions: 'can_view_tasks,!can_view_tasks_tab'
      },
      {
        routerLink: 'reports',
        icon: 'fa-list-alt',
        translationKey: 'Reports',
        hasPermissions: 'can_view_reports,!can_view_reports_tab'
      },
      {
        routerLink: 'contacts',
        icon: 'fa-user',
        translationKey: 'Contacts',
        hasPermissions: 'can_view_contacts,!can_view_contacts_tab'
      },
      {
        routerLink: 'analytics',
        icon: 'fa-bar-chart-o',
        translationKey: 'Analytics',
        hasPermissions: 'can_view_analytics,!can_view_analytics_tab',
      },
    ];
  }

  private setSecondaryOptions(showPrivacyPolicy = false) {
    this.secondaryOptions = [
      {
        routerLink: 'about',
        icon: 'fa-question',
        translationKey: 'about',
        canDisplay: true,
      },
      {
        routerLink: 'user',
        icon: 'fa-user',
        translationKey: 'edit.user.settings',
        hasPermissions: 'can_edit_profile'
      },
      {
        routerLink: 'privacy-policy',
        icon: 'fa-lock',
        translationKey: 'privacy.policy',
        canDisplay: showPrivacyPolicy,
      },
      {
        icon: 'fa-bug',
        translationKey: 'Report Bug',
        canDisplay: true,
        click: () => this.openFeedback()
      },
    ];
  }
}

export interface SidebarMenu {
  isOpen: boolean;
}

export type MenuOptions = {
  icon: string;
  translationKey: string;
  routerLink?: string | undefined;
  hasPermissions?: string | undefined;
  canDisplay?: boolean;
  click?: () => void;
};
