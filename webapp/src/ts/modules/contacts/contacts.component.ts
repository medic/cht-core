import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { findIndex as _findIndex } from 'lodash-es';

import { GlobalActions } from '@mm-actions/global';
import { ChangesService } from '@mm-services/changes.service';
import { ContactsActions } from '@mm-actions/contacts';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { GetDataRecordsService } from '@mm-services/get-data-records.service';
import { SessionService } from '@mm-services/session.service';
import { AuthService } from '@mm-services/auth.service';
import { SettingsService } from '@mm-services/settings.service';
import { UHCSettingsService } from '@mm-services/uhc-settings.service';
import { Selectors } from '@mm-selectors/index';
import { Filter, SearchService } from '@mm-services/search.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { RelativeDateService } from '@mm-services/relative-date.service';
import { ScrollLoaderProvider } from '@mm-providers/scroll-loader.provider';
import { ExportService } from '@mm-services/export.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { TranslateService } from '@mm-services/translate.service';
import { OLD_REPORTS_FILTER_PERMISSION } from '@mm-modules/reports/reports-filters.component';
import { FastAction, FastActionButtonService } from '@mm-services/fast-action-button.service';
import { PerformanceService } from '@mm-services/performance.service';

@Component({
  templateUrl: './contacts.component.html'
})
export class ContactsComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly PAGE_SIZE = 25;
  private subscription: Subscription = new Subscription();
  private globalActions: GlobalActions;
  private contactsActions: ContactsActions;
  private listContains;
  private destroyed?: boolean;
  private isOnlineOnly?: boolean;

  fastActionList?: FastAction[];
  contactsList;
  loading = false;
  error;
  appending?: boolean;
  hasContacts = true;
  filters: Filter = {};
  defaultFilters: Filter = {};
  moreItems;
  usersHomePlace;
  contactTypes;
  childPlaces;
  allowedChildPlaces = [];
  lastVisitedDateExtras;
  visitCountSettings;
  defaultSortDirection = 'alpha';
  sortDirection = this.defaultSortDirection;
  isAllowedToSort = true;
  additionalListItem = false;
  useSearchNewDesign = true;
  enketoEdited?: boolean;
  selectedContact;

  constructor(
    private store: Store,
    private changesService: ChangesService,
    private fastActionButtonService: FastActionButtonService,
    private translateService: TranslateService,
    private searchService: SearchService,
    private contactTypesService: ContactTypesService,
    private userSettingsService: UserSettingsService,
    private getDataRecordsService: GetDataRecordsService,
    private sessionService: SessionService,
    private authService: AuthService,
    private settingsService: SettingsService,
    private UHCSettings: UHCSettingsService,
    private scrollLoaderProvider: ScrollLoaderProvider,
    private relativeDateService: RelativeDateService,
    private router: Router,
    private exportService: ExportService,
    private performanceService: PerformanceService,
    private xmlFormsService: XmlFormsService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.contactsActions = new ContactsActions(store);
  }

  async ngOnInit() {
    const trackPerformance = this.performanceService.track();
    this.isOnlineOnly = this.sessionService.isOnlineOnly();
    this.globalActions.clearFilters(); // clear any global filters first
    this.subscribeToStore();
    this.manageChangesSubscription();

    try {
      const [settings, homePlaceSummary, viewLastVisitedDate, contactTypes] = await Promise.all([
        this.settingsService.get(),
        this.getUserHomePlaceSummary(),
        this.canViewLastVisitedDate(),
        this.contactTypesService.getAll(),
      ]);

      this.visitCountSettings = this.UHCSettings.getVisitCountSettings(settings);
      this.usersHomePlace = homePlaceSummary;
      this.lastVisitedDateExtras = viewLastVisitedDate;
      this.contactTypes = contactTypes;

      if (this.lastVisitedDateExtras && this.UHCSettings.getContactsDefaultSort(settings)) {
        this.sortDirection = this.defaultSortDirection = this.UHCSettings.getContactsDefaultSort(settings);
      }

      const children = await this.getChildren();
      this.childPlaces = children;
      this.defaultFilters = {
        types: {
          selected: this.childPlaces.map(type => type.id),
        },
      };

      this.subscribeToAllContactXmlForms();
      await this.search();
    } catch (err) {
      this.error = true;
      this.loading = false;
      this.appending = false;
      console.error('Error initializing contacts component', err);
    } finally {
      trackPerformance?.stop({
        name: 'contact_list:load',
        recordApdex: true,
      });
    }
  }

  private async handleChange(change): Promise<void> {
    const limit = this.contactsList.length;
    if (change.deleted) {
      this.contactsActions.removeContactFromList({ _id: change.id });
      this.hasContacts = !!this.contactsList.length;
    }
    if (this.usersHomePlace && change.id === this.usersHomePlace._id) {
      this.usersHomePlace = await this.getUserHomePlaceSummary(change.id);
    }
    const withIds =
      this.isSortedByLastVisited() &&
      !!this.isRelevantVisitReport(change.doc) &&
      !change.deleted;
    await this.query({
      limit,
      withIds,
      silent: true,
    });
  }

  private manageChangesSubscription() {
    const changesSubscription = this.changesService.subscribe({
      key: 'contacts-list',
      callback: async (change) => {
        const limit = this.contactsList.length;
        if (change.deleted) {
          this.contactsActions.removeContactFromList({ _id: change.id });
          this.hasContacts = this.contactsList.length;
        }
        if (this.usersHomePlace?.some(homePlace => homePlace._id === change.id)) {
          this.usersHomePlace = await this.getUserHomePlaceSummary();
        }
        const withIds =
          this.isSortedByLastVisited() &&
          !!this.isRelevantVisitReport(change.doc) &&
          !change.deleted;
        return this.query({
          limit,
          withIds,
          silent: true,
        });
      },
      filter: (change) => {
        return (
          this.contactTypesService.includes(change.doc) ||
          (change.deleted && this.listContains(change.id)) ||
          this.isRelevantVisitReport(change.doc) ||
          this.listContains(change.id)
        );
      },
    });
    this.subscription.add(changesSubscription);

    Promise
      .all([
        this.getUserHomePlaceSummary(),
        this.canViewLastVisitedDate(),
        this.settingsService.get(),
        this.contactTypesService.getAll()
      ])
      .then(([homePlaceSummary, viewLastVisitedDate, settings, contactTypes]) => {
        this.usersHomePlace = homePlaceSummary;
        if (this.usersHomePlace && this.usersHomePlace.length > 1) {
          this.isAllowedToSort = false;
        }
        this.lastVisitedDateExtras = viewLastVisitedDate;
        this.visitCountSettings = this.UHCSettings.getVisitCountSettings(settings);
        if (this.lastVisitedDateExtras && this.UHCSettings.getContactsDefaultSort(settings)) {
          this.sortDirection = this.defaultSortDirection = this.UHCSettings.getContactsDefaultSort(settings);
        }
        this.contactTypes = contactTypes;
        return this.getChildren();
      })
      .then((children) => {
        this.childPlaces = children;
        this.defaultFilters = {
          types: {
            selected: this.childPlaces.map(type => type.id)
          }
        };

        this.subscribeToAllContactXmlForms();
        return this.search();
      })
      .catch((err) => {
        this.error = true;
        this.loading = false;
        this.appending = false;
        console.error('Error searching for contacts', err);
      })
      .finally(() => {
        trackPerformance?.stop({
          name: 'contact_list:load',
          recordApdex: true,
        });
      });
  }

  async ngAfterViewInit() {
    const isDisabled = !this.sessionService.isAdmin() && await this.authService.has(OLD_REPORTS_FILTER_PERMISSION);
    this.useSearchNewDesign = !isDisabled;
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.subscription.unsubscribe();

    this.contactsActions.resetContactsList();
    this.contactsActions.clearSelection();
    this.globalActions.clearFilters();
    this.globalActions.unsetSelected();
    this.globalActions.setLeftActionBar({});
  }

  private subscribeToStore() {
    const reduxSubscription = combineLatest(
      this.store.select(Selectors.getContactsList),
      this.store.select(Selectors.getFilters),
      this.store.select(Selectors.contactListContains),
      this.store.select(Selectors.getSelectedContact),
    ).subscribe(([
      contactsList,
      filters,
      listContains,
      selectedContact,
    ]) => {
      this.contactsList = contactsList;
      this.filters = filters;
      this.listContains = listContains;
      this.selectedContact = selectedContact;
    });
    this.subscription.add(reduxSubscription);
  }

  private isRelevantVisitReport (doc) {
    const isRelevantDelete = doc && doc._deleted && this.isSortedByLastVisited();
    return (
      doc &&
      this.lastVisitedDateExtras &&
      doc.type === 'data_record' &&
      doc.form &&
      doc.fields &&
      doc.fields.visited_contact_uuid &&
      (this.listContains(doc.fields.visited_contact_uuid) ||
        isRelevantDelete)
    );
  }

  private getUserFacilityId(userSettings) {
    return Array.isArray(userSettings.facility_id) ? userSettings.facility_id : [userSettings.facility_id];
  }

  private getUserHomePlaceSummary() {
    return this.userSettingsService
      .get()
      .then((userSettings: any) => {
        const facilityId = this.getUserFacilityId(userSettings);

        if (!facilityId.length || facilityId.some(id => id === undefined)) {
          return;
        }


        this.globalActions.setUserFacilityId(facilityId);
        return this.getDataRecordsService
          .get(facilityId)
          .then(places => {
            const validPlaces = places?.filter(place => place !== undefined);
            return validPlaces.length ? validPlaces : undefined;
          });
      })
      .then((summary) => {
        if (summary) {
          summary.home = true;
        }
        return summary;
      });
  }

  private canViewLastVisitedDate() {
    if (this.sessionService.isAdmin()) {
      // disable UHC for DB admins
      return Promise.resolve(false);
    }
    return this.authService.has('can_view_last_visited_date');
  }

  private formatContacts(contacts) {
    return contacts.map(contact => this.formatContact(contact));
  }

  private formatContact(updatedContact) {
    const contact = { ...updatedContact };
    const type = this.getContactType(contact);
    this.populateContactDetails(contact, type);
    this.setVisitDetails(contact, type);
    return contact;
  }

  private getContactType(contact) {
    const typeId = this.contactTypesService.getTypeId(contact);
    return this.contactTypesService.getTypeById(this.contactTypes, typeId);
  }

  private isPrimaryContact(contact) {
    return this.usersHomePlace && this.usersHomePlace.length === 1 && contact.home;
  }

  private populateContactDetails(contact, type) {
    contact.route = 'contacts';
    contact.icon = type?.icon;
    contact.heading = contact.name || '';
    contact.valid = true;
    contact.summary = null;
    contact.primary = this.isPrimaryContact(contact);
    contact.dod = contact.date_of_death;
  }

  private setVisitDetails(contact, type) {
    if (!type?.count_visits || !Number.isInteger(contact.lastVisitedDate)) {
      return;
    }
    this.setVisitOverdue(contact);
    this.setVisitCountDetails(contact);
    this.evaluateVisitGoal(contact);
  }

  private setVisitOverdue(contact) {
    if (contact.lastVisitedDate === 0) {
      contact.overdue = true;
      contact.summary = this.translateService.instant('contact.last.visit.unknown');
      return;
    }
    const now = new Date().getTime();
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
    contact.overdue = contact.lastVisitedDate <= oneMonthAgo;
    contact.summary = this.translateService.instant(
      'contact.last.visited.date',
      { date: this.relativeDateService.getRelativeDate(contact.lastVisitedDate, {}) }
    );
  }

  private setVisitCountDetails(contact) {
    const visitCount = Math.min(contact.visitCount, 99) + (contact.visitCount > 99 ? '+' : '');
    contact.visits = {
      count: this.translateService.instant('contacts.visits.count', { count: visitCount }),
      summary: this.translateService.instant(
        'contacts.visits.visits',
        { VISITS: contact.visitCount }
      )
    };
  }

  private evaluateVisitGoal(contact) {
    const { visitCountGoal, visitCount } = contact;
    if (!visitCountGoal) {
      return;
    }
    contact.visits.status = this.setVisitStatus(visitCount, visitCountGoal);
  }

  private setVisitStatus(visitCount, visitCountGoal) {
    if (!visitCount) {
      return 'pending';
    }
    if (visitCount < visitCountGoal) {
      return 'started';
    }
    return 'done';
  }

  private getChildren() {
    const filterChildPlaces = (children) => children.filter(child => !child.person);

    if (this.usersHomePlace) {
      // backwards compatibility with pre-flexible hierarchy users
      const homeType = this.contactTypesService.getTypeId(this.usersHomePlace[0]);
      return this.contactTypesService
        .getChildren(homeType)
        .then(filterChildPlaces);
    }

    if (this.isOnlineOnly) {
      return this.contactTypesService
        .getChildren()
        .then(filterChildPlaces);
    }

    return Promise.resolve([]);
  }

  private initScroll() {
    this.scrollLoaderProvider.init(() => {
      if (!this.loading && this.moreItems) {
        this.query({
          paginating: true,
        });
      }
    });
  }

  private isSortedByLastVisited() {
    return this.sortDirection === 'last_visited_date';
  }

  private updateAdditionalListItem(homeIndex) {
    this.additionalListItem =
      !this.filters.search &&
      (this.additionalListItem || !this.appending) &&
      homeIndex === -1;
  }

  private query(opts?) {
    const trackPerformance = this.performanceService.track();
    const options = Object.assign({ limit: this.PAGE_SIZE }, opts);
    if (options.limit < this.PAGE_SIZE) {
      options.limit = this.PAGE_SIZE;
    }

    if (!options.silent) {
      this.error = false;
      this.loading = true;
    }
    if (options.paginating) {
      this.appending = true;
      options.skip = this.contactsList.length;
    } else if (!options.silent) {
      this.contactsActions.resetContactsList();
      this.additionalListItem = false;
    }

    if (this.additionalListItem) {
      if (options.skip) {
        options.skip -= 1;
      } else {
        options.limit -= 1;
      }
    }

    let searchFilters = this.defaultFilters;
    if (this.filters.search) {
      searchFilters = this.filters;
    }

    const extensions:any = {};
    if (this.lastVisitedDateExtras) {
      extensions.displayLastVisitedDate = true;
      extensions.visitCountSettings = this.visitCountSettings;
    }
    if (this.isSortedByLastVisited()) {
      extensions.sortByLastVisitedDate = true;
    }

    let docIds;
    if (options.withIds) {
      docIds = this.contactsList.map((item) => {
        return item._id;
      });
    }

    return this.searchService
      .search('contacts', searchFilters, options, extensions, docIds)
      .then(updatedContacts => {
        // If you have a home place make sure its at the top
        if (this.usersHomePlace) {
          this.usersHomePlace.forEach(homePlace => {
            const homeIndex = _findIndex(updatedContacts, (contact: any) => contact._id === homePlace._id);

            this.updateAdditionalListItem(homeIndex);

            if (!this.appending) {
              if (homeIndex !== -1) {
                // move it to the top
                const [homeContact] = updatedContacts.splice(homeIndex, 1);
                updatedContacts.unshift(homeContact);
              } else if (!this.filters.search) {
                updatedContacts.unshift(homePlace);
              }
            }
          });
        }

        //  only show homeplaces facilities for multi-facility users
        if (this.usersHomePlace?.length > 1 && !this.filters.search) {
          const homePlaceIds = this.usersHomePlace.map(place => place._id);
          updatedContacts = updatedContacts.filter(place => homePlaceIds.includes(place._id));
        }

        updatedContacts = this.formatContacts(updatedContacts);
        this.contactsActions.updateContactsList(updatedContacts);

        this.moreItems = updatedContacts.length >= options.limit;
        this.hasContacts = !!this.contactsList.length;
        this.appending = false;
        this.error = false;
        this.initScroll();
        this.updateFastActions();
        this.setLeftActionBar();
      })
      .catch(err => {
        this.error = true;
        console.error('Error loading contacts', err);
      })
      .finally(() => {
        this.loading = false;
        trackPerformance?.stop({ name: 'contact_list:query', recordApdex: true });
      });
  }

  search() {
    if (this.filters.search && !this.enketoEdited) {
      this.router.navigate(['/contacts']);
      this.contactsActions.clearSelection();
    }

    this.loading = true;
    return this.query();
  }

  sort(sortDirection?) {
    this.sortDirection = sortDirection ? sortDirection : this.defaultSortDirection;
    this.query();
  }

  listTrackBy(index, contact) {
    return contact._id + contact._rev;
  }

  private setLeftActionBar() {
    if (this.destroyed) {
      // don't update the actionbar if the component has already been destroyed
      // this callback can be queued up and persist even after component destruction
      return;
    }

    this.globalActions.setLeftActionBar({
      exportFn: () => this.exportContacts(),
      hasResults: this.hasContacts,
      userFacilityId: this.usersHomePlace?.[0]?._id,
      childPlaces: this.allowedChildPlaces,
    });
  }

  private async updateFastActions() {
    if (this.destroyed) {
      // Don't update the fast actions, if the component has already been destroyed
      // This callback can be queued up and persist even after component destruction
      return;
    }

    this.fastActionList = await this.fastActionButtonService.getContactLeftSideActions({
      parentFacilityId: this.usersHomePlace?.[0]?._id,
      childContactTypes: this.allowedChildPlaces,
    });
  }

  getFastActionButtonType() {
    return this.fastActionButtonService.getButtonTypeForContentList();
  }

  exportContacts() {
    this.exportService.export('contacts', this.filters, { humanReadable: true });
  }

  private subscribeToAllContactXmlForms() {
    const subscription = this.xmlFormsService.subscribe(
      'ContactForms',
      { contactForms: true },
      (error, forms) => {
        if (error) {
          console.error('Error fetching allowed contact forms', error);
          return;
        }

        this.allowedChildPlaces = this.filterAllowedChildType(forms, this.childPlaces);
        this.globalActions.updateLeftActionBar({ childPlaces: this.allowedChildPlaces });
        this.updateFastActions();
      }
    );
    this.subscription.add(subscription);
  }

  private filterAllowedChildType(forms, childTypes) {
    if (!childTypes) {
      return;
    }

    return childTypes
      .filter(contactType => forms?.find(form => form._id === contactType.create_form))
      .sort((a, b) => a.id?.localeCompare(b.id));
  }

}
