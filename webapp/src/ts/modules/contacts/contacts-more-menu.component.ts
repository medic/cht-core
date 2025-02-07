import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Data, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';

import { UserSettingsService } from '@mm-services/user-settings.service';
import { SessionService } from '@mm-services/session.service';
import { AuthService } from '@mm-services/auth.service';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ResponsiveService } from '@mm-services/responsive.service';
import { NgIf } from '@angular/common';
import { MatIconButton } from '@angular/material/button';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'mm-contacts-more-menu',
    templateUrl: './contacts-more-menu.component.html',
    standalone: true,
    imports: [NgIf, MatIconButton, MatMenuTrigger, MatIcon, MatMenu, MatMenuItem, RouterLink, TranslatePipe]
})
export class ContactsMoreMenuComponent implements OnInit, OnDestroy {
  @Output() exportContacts: EventEmitter<any> = new EventEmitter();

  private subscription: Subscription = new Subscription();
  private globalActions: GlobalActions;
  private hasExportPermission = false;
  private hasEditPermission = false;
  private hasDeletePermission = false;
  private isOnlineOnly = false;
  private loadingContent = true;
  private snapshotData: Data | null = null;
  private userSettings;

  selectedContactDoc;
  hasNestedContacts = false;
  isUserFacility = false;
  contactsList;

  constructor(
    private store: Store,
    private userSettingsService: UserSettingsService,
    private sessionService: SessionService,
    private authService: AuthService,
    private responsiveService: ResponsiveService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit(): void {
    this.isOnlineOnly = this.authService.online(true);
    this.subscribeToStore();
    this.checkPermissions();
    this.getUserSettings();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private subscribeToStore() {
    const storeSubscription = combineLatest(
      this.store.select(Selectors.getContactsList),
      this.store.select(Selectors.getSelectedContactDoc),
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getSnapshotData),
    ).subscribe(([
      contactsList,
      selectedContactDoc,
      loadingContent,
      snapshotData
    ]) => {
      this.contactsList = contactsList;
      this.selectedContactDoc = selectedContactDoc;
      this.loadingContent = loadingContent;
      this.snapshotData = snapshotData;
      this.checkUserFacility();
    });
    this.subscription.add(storeSubscription);

    const contactChildren = this.store
      .select(Selectors.getSelectedContactChildren)
      .subscribe(selectedContactChildren => {
        this.hasNestedContacts = selectedContactChildren?.some(group => group.contacts?.length);
      });
    this.subscription.add(contactChildren);
  }

  private async checkPermissions() {
    this.hasEditPermission = await this.authService.has('can_edit');
    this.hasDeletePermission = await this.authService.has('can_delete_contacts');
    this.hasExportPermission = await this.authService.any([[ 'can_export_all' ], [ 'can_export_contacts' ]]);
  }

  private getUserSettings() {
    if (this.userSettings) {
      return;
    }
    return this.userSettingsService
      .get()
      .then(userSettings => this.userSettings = userSettings)
      .catch(error => console.error('Error fetching user settings', error));
  }

  private checkUserFacility() {
    if (this.sessionService.isAdmin()) {
      return false;
    }
    this.isUserFacility = this.userSettings?.facility_id.includes(this.selectedContactDoc?._id);
  }

  deleteContact() {
    this.globalActions.deleteDocConfirm(this.selectedContactDoc);
  }

  displayEditOption() {
    return this.selectedContactDoc
      && !this.loadingContent
      && this.snapshotData?.name === 'contacts.detail'
      && this.hasEditPermission
      && (this.isOnlineOnly || !this.isUserFacility);
  }

  displayDeleteOption() {
    return this.selectedContactDoc
      && !this.loadingContent
      && this.snapshotData?.name === 'contacts.detail'
      && this.hasEditPermission
      && this.hasDeletePermission;
  }

  displayExportOption() {
    return this.isOnlineOnly
      && this.hasExportPermission
      && !this.responsiveService.isMobile();
  }
}
