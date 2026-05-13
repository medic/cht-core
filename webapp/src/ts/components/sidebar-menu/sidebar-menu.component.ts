import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { BaseMenuComponent } from '@mm-components/base-menu/base-menu.component';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { PanelHeaderComponent } from '@mm-components/panel-header/panel-header.component';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { NavigationStart, Router, RouterLink } from '@angular/router';
import { AuthDirective } from '@mm-directives/auth.directive';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { RelativeDatePipe } from '@mm-pipes/date.pipe';
import { ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';

import { GlobalActions } from '@mm-actions/global';

import { Store } from '@ngrx/store';
import { LocationService } from '@mm-services/location.service';
import { DBSyncService } from '@mm-services/db-sync.service';
import { ModalService } from '@mm-services/modal.service';
import { StorageInfoService } from '@mm-services/storage-info.service';

import { filter } from 'rxjs/operators';
import { Selectors } from '@mm-selectors/index';
import { HeaderTabsService, SidebarTab } from '@mm-services/header-tabs.service';

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
    NgClass,
    TranslatePipe,
    RelativeDatePipe,
    ResourceIconPipe,
  ],
})
export class SidebarMenuComponent extends BaseMenuComponent implements OnInit, OnDestroy {
  @Input() canLogOut: boolean = false;
  @ViewChild('sidebar') sidebar!: MatSidenav;
  private globalActions: GlobalActions;
  replicationStatus;
  showPrivacyPolicy: boolean = false;
  headerTabsForSidebar: SidebarTab[] = [];
  adminAppPath: string = '';

  constructor(
    protected store: Store,
    protected locationService: LocationService,
    protected dbSyncService: DBSyncService,
    protected modalService: ModalService,
    private router: Router,
    protected readonly storageInfoService: StorageInfoService,
    private readonly headerTabsService: HeaderTabsService
  ) {
    super(store, dbSyncService, modalService, storageInfoService);
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    super.ngOnInit();
    this.adminAppPath = this.locationService.adminPath;
    this.additionalSubscriptions();
    this.subscribeToRouter();
    this.headerTabsService
      .getSidebarTabs()
      .then(tabs => this.headerTabsForSidebar = tabs);
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

  onTabClick(tab: SidebarTab) {
    if (tab.name !== 'bug') {
      return;
    }
    this.openFeedback();
    this.close();
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
      .subscribe(showPrivacyPolicy => this.showPrivacyPolicy = showPrivacyPolicy);
    this.subscriptions.add(subscribePrivacyPolicy);
  }
}
