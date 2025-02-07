import { Component, OnDestroy, OnInit, ViewChild, Input } from '@angular/core';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { NavigationStart, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { LocationService } from '@mm-services/location.service';
import { DBSyncService } from '@mm-services/db-sync.service';
import { ModalService } from '@mm-services/modal.service';
import { LogoutConfirmComponent } from '@mm-modals/logout/logout-confirm.component';
import { FeedbackComponent } from '@mm-modals/feedback/feedback.component';
import { PanelHeaderComponent } from '../panel-header/panel-header.component';
import { NgFor, NgIf } from '@angular/common';
import { AuthDirective } from '../../directives/auth.directive';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { RelativeDatePipe } from '@mm-pipes/date.pipe';

@Component({
  selector: 'mm-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
  imports: [
    MatSidenavContainer,
    MatSidenav,
    PanelHeaderComponent,
    MatSidenavContent,
    NgFor,
    RouterLink,
    AuthDirective,
    MatIcon,
    NgIf,
    TranslatePipe,
    RelativeDatePipe,
  ],
})
export class SidebarMenuComponent implements OnInit, OnDestroy {
  @Input() canLogOut: boolean = false;
  @ViewChild('sidebar') sidebar!: MatSidenav;
  private globalActions: GlobalActions;
  subscriptions: Subscription = new Subscription();
  replicationStatus;
  moduleOptions: MenuOption[] = [];
  secondaryOptions: MenuOption[] = [];
  adminAppPath: string = '';

  constructor(
    private store: Store,
    private locationService: LocationService,
    private dbSyncService: DBSyncService,
    private modalService: ModalService,
    private router: Router,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    this.adminAppPath = this.locationService.adminPath;
    this.setModuleOptions();
    this.setSecondaryOptions();
    this.subscribeToStore();
    this.subscribeToRouter();
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

  private subscribeToRouter() {
    const routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationStart))
      .subscribe(() => this.close());
    this.subscriptions.add(routerSubscription);
  }

  private subscribeToStore() {
    const subscribeReplicationStatus = this.store
      .select(Selectors.getReplicationStatus)
      .subscribe(replicationStatus => this.replicationStatus = replicationStatus);
    this.subscriptions.add(subscribeReplicationStatus);

    const subscribeSidebarMenu = this.store
      .select(Selectors.getSidebarMenu)
      .subscribe(sidebarMenu => this.sidebar?.toggle(sidebarMenu?.isOpen));
    this.subscriptions.add(subscribeSidebarMenu);

    const subscribePrivacyPolicy = this.store
      .select(Selectors.getShowPrivacyPolicy)
      .subscribe(showPrivacyPolicy => this.setSecondaryOptions(showPrivacyPolicy));
    this.subscriptions.add(subscribePrivacyPolicy);
  }

  private openFeedback() {
    this.modalService.show(FeedbackComponent);
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
