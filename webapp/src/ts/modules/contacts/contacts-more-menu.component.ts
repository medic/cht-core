import { Component, EventEmitter, OnDestroy, OnInit, Output, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';

import { ChangesService } from '@mm-services/changes.service';
import { TranslateService } from '@mm-services/translate.service';
import { SearchService } from '@mm-services/search.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { GetDataRecordsService } from '@mm-services/get-data-records.service';
import { SessionService } from '@mm-services/session.service';
import { AuthService } from '@mm-services/auth.service';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ResponsiveService } from '@mm-services/responsive.service';

@Component({
  selector: 'mm-contacts-more-menu',
  templateUrl: './contacts-more-menu.component.html'
})
export class ContactsMoreMenuComponent implements OnInit, OnDestroy {
  @Input() allowedChildPlaces;
  @Output() exportContacts: EventEmitter<any> = new EventEmitter();

  private subscription: Subscription = new Subscription();
  private globalActions: GlobalActions;
  private hasExportPermission = false;
  private hasEditPermission = false;
  private hasCreatePlacesPermission = false;
  private hasDeletePermission = false;
  private isOnlineOnly = false;
  private loadingContent = true;
  private snapshotData;
  private userSettings;

  selectedContactDoc;
  hasNestedContacts = false;
  contactsList;

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private changesService: ChangesService,
    private translateService: TranslateService,
    private searchService: SearchService,
    private contactTypesService: ContactTypesService,
    private userSettingsService: UserSettingsService,
    private getDataRecordsService: GetDataRecordsService,
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
    this.hasCreatePlacesPermission = await this.authService.has('can_create_places');
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

  deleteContact() {
    this.globalActions.deleteDocConfirm(this.selectedContactDoc);
  }

  displayEditOption() {
    return this.selectedContactDoc
      && !this.loadingContent
      && this.snapshotData?.name === 'contacts.detail'
      && this.hasEditPermission
      && (this.isOnlineOnly || this.userSettings?.facility_id !== this.selectedContactDoc?._id);
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
      && (this.allowedChildPlaces ? this.hasCreatePlacesPermission : true)
      && !this.responsiveService.isMobile();
  }
}
