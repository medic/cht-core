import { Component, OnDestroy, OnInit, ViewChild, Input } from '@angular/core';
import { BaseMenuComponent } from '@mm-components/base-menu/base-menu.component';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { PanelHeaderComponent } from '@mm-components/panel-header/panel-header.component';
import { NgClass } from '@angular/common';
import { RouterLink, NavigationStart, Router } from '@angular/router';
import { AuthDirective } from '@mm-directives/auth.directive';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { RelativeDatePipe } from '@mm-pipes/date.pipe';

import { GlobalActions } from '@mm-actions/global';

import { Store } from '@ngrx/store';
import { LocationService } from '@mm-services/location.service';
import { DBSyncService } from '@mm-services/db-sync.service';
import { ModalService } from '@mm-services/modal.service';
import { StorageInfoService } from '@mm-services/storage-info.service';

import { filter } from 'rxjs/operators';
import { Selectors } from '@mm-selectors/index';

@Component({
  selector: 'mm-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
  imports: [
    MatSidenavContainer,
    MatSidenav,
    PanelHeaderComponent,
    MatSidenavContent,
    RouterLink,
    AuthDirective,
    MatIcon,
    NgClass,
    TranslatePipe,
    RelativeDatePipe
],
})
export class SidebarMenuComponent extends BaseMenuComponent implements OnInit, OnDestroy {
  @Input() canLogOut: boolean = false;
  @ViewChild('sidebar') sidebar!: MatSidenav;
  private globalActions: GlobalActions;
  replicationStatus;
  moduleOptions: MenuOption[] = [];
  secondaryOptions: MenuOption[] = [];
  adminAppPath: string = '';

  constructor(
    protected store: Store,
    protected locationService: LocationService,
    protected dbSyncService: DBSyncService,
    protected modalService: ModalService,
    private router: Router,
    protected readonly storageInfoService: StorageInfoService,
  ) {
    super(store, dbSyncService, modalService, storageInfoService);
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    super.ngOnInit();
    this.adminAppPath = this.locationService.adminPath;
    this.setModuleOptions();
    this.setSecondaryOptions();
    this.additionalSubscriptions();
    this.subscribeToRouter();
  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }

  close() {
    return this.globalActions.closeSidebarMenu();
  }

  replicate(): void {
    if (this.replicationStatus?.current?.disableSyncButton) {
      return;
    }
    super.replicate();
  }

  private subscribeToRouter() {
    const routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationStart))
      .subscribe(() => this.close());
    this.subscriptions.add(routerSubscription);
  }

  private additionalSubscriptions() {
    const subscribeSidebarMenu = this.store
      .select(Selectors.getSidebarMenu)
      .subscribe(sidebarMenu => this.sidebar?.toggle(sidebarMenu?.isOpen));
    this.subscriptions.add(subscribeSidebarMenu);

    const subscribePrivacyPolicy = this.store
      .select(Selectors.getShowPrivacyPolicy)
      .subscribe(showPrivacyPolicy => this.setSecondaryOptions(showPrivacyPolicy));
    this.subscriptions.add(subscribePrivacyPolicy);
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
        routerLink: 'trainings',
        icon: 'fa-graduation-cap',
        translationKey: 'training_materials.page.title',
        canDisplay: true,
      },
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

interface MenuOption {
  icon: string;
  translationKey: string;
  routerLink?: string;
  hasPermissions?: string;
  canDisplay?: boolean;
  click?: () => void;
}
