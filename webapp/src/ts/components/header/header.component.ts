import { BaseMenuComponent } from '@mm-components/base-menu/base-menu.component';
import { Component, OnInit, Input, OnDestroy } from '@angular/core';

import { Store } from '@ngrx/store';
import { Selectors } from '@mm-selectors/index';
import { DBSyncService } from '@mm-services/db-sync.service';
import { ModalService } from '@mm-services/modal.service';
import { StorageInfoService } from '@mm-services/storage-info.service';
import { SettingsService } from '@mm-services/settings.service';


import { RouterLink } from '@angular/router';
import { AuthDirective } from '@mm-directives/auth.directive';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { NgIf, NgClass, NgFor } from '@angular/common';
import { MobileDetectionComponent } from '@mm-components/mobile-detection/mobile-detection.component';

import { TranslatePipe } from '@ngx-translate/core';
import { RelativeDatePipe } from '@mm-pipes/date.pipe';
import { LocalizeNumberPipe } from '@mm-pipes/number.pipe';
import { HeaderLogoPipe, ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';

import { HeaderTab, HeaderTabsService } from '@mm-services/header-tabs.service';

export const OLD_NAV_PERMISSION = 'can_view_old_navigation';

@Component({
  selector: 'mm-header',
  templateUrl: './header.component.html',
  imports: [
    RouterLink,
    AuthDirective,
    BsDropdownModule,
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

export class HeaderComponent extends BaseMenuComponent implements OnInit, OnDestroy {
  @Input() adminUrl;
  @Input() canLogOut;

  showPrivacyPolicy = false;
  // replicationStatus;
  currentTab;
  bubbleCount = {};
  permittedTabs: HeaderTab[] = [];

  constructor(
    protected readonly store: Store,
    protected readonly dbSyncService: DBSyncService,
    protected readonly modalService: ModalService,
    protected readonly storageInfoService: StorageInfoService,
    private settingsService: SettingsService,
    private headerTabsService: HeaderTabsService,
  ) {
    super(store, dbSyncService, modalService, storageInfoService);
  }

  ngOnInit(): void {
    super.ngOnInit();
    this.additionalSubscriptions();
    this.getHeaderTabs();
  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }

  private additionalSubscriptions(){
    const currentTab = this.store.select(Selectors.getCurrentTab)
      .subscribe(tab => this.currentTab = tab);
    this.subscriptions.add(currentTab);

    const showPrivacyPolicy = this.store.select(Selectors.getShowPrivacyPolicy)
      .subscribe(show => this.showPrivacyPolicy = show);
    this.subscriptions.add(showPrivacyPolicy);


    const bubbleCounterObserver = this.store.select(Selectors.getBubbleCounter)
      .subscribe(count => this.bubbleCount = count);
    this.subscriptions.add(bubbleCounterObserver);
  }

  private getHeaderTabs() {
    this.settingsService
      .get()
      .then(settings => this.headerTabsService.getAuthorizedTabs(settings))
      .then(permittedTabs => {
        this.permittedTabs = permittedTabs;
      });
  }
}
