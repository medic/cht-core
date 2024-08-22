import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';

@Component({
  selector: 'mm-sidebar-menu',
  templateUrl: './sidebar-menu.component.html',
})
export class SidebarMenuComponent implements OnInit, OnDestroy {
  @ViewChild('sidebar') sidebar!: MatSidenav;
  private subscriptions: Subscription = new Subscription();
  private globalActions: GlobalActions;

  constructor(private store: Store) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
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

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  close() {
    return this.globalActions.closeSidebarMenu();
  }
}

export interface SidebarMenu {
  isOpen: boolean;
}
