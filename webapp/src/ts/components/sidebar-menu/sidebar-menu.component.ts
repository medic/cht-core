import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { LocationService } from '@mm-services/location.service';

@Component({
  selector: 'mm-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
})
export class SidebarMenuComponent implements OnInit, OnDestroy {
  @ViewChild('sidebar') sidebar!: MatSidenav;
  private subscriptions: Subscription = new Subscription();
  private globalActions: GlobalActions;
  mainModules: MenuOptions[] = [];
  adminAppPath: string = '';

  constructor(
    private store: Store,
    private locationService: LocationService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    this.adminAppPath = this.locationService.adminPath;
    this.setMainModules();
    this.subscribeToStore();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  close() {
    return this.globalActions.closeSidebarMenu();
  }

  private subscribeToStore() {
    const subscribe = this.store
      .select(Selectors.getSidebarMenu)
      .subscribe(sidebarMenu => {
        if (sidebarMenu?.isOpen) {
          return this.sidebar?.open();
        }
        return this.sidebar?.close();
      });
    this.subscriptions.add(subscribe);
  }

  private setMainModules() {
    this.mainModules = [
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
}

export interface SidebarMenu {
  isOpen: boolean;
}

export type MenuOptions = {
  icon: string;
  translationKey: string;
  routerLink: string | undefined;
  hasPermissions: string | undefined;
};
