import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { findIndex as _findIndex } from 'lodash-es';

import { GlobalActions } from '@mm-actions/global';
import { ChangesService } from '@mm-services/changes.service';
import { ServicesActions } from '@mm-actions/services';
import { ContactsActions } from '@mm-actions/contacts';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { GetDataRecordsService } from '@mm-services/get-data-records.service';
import { SessionService } from '@mm-services/session.service';
import { AuthService } from '@mm-services/auth.service';
import { SettingsService } from '@mm-services/settings.service';
import { UHCSettingsService } from '@mm-services/uhc-settings.service';
import { Selectors } from '@mm-selectors/index';
import { SearchService } from '@mm-services/search.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { RelativeDateService } from '@mm-services/relative-date.service';
import { ScrollLoaderProvider } from '@mm-providers/scroll-loader.provider';
import { TourService } from '@mm-services/tour.service';
import { ExportService } from '@mm-services/export.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { TranslateService } from '@mm-services/translate.service';
import { OLD_REPORTS_FILTER_PERMISSION } from '@mm-modules/reports/reports-filters.component';

@Component({
  templateUrl: './contacts.component.html'
})
export class ContactsComponent implements OnInit, AfterViewInit, OnDestroy{
  private readonly PAGE_SIZE = 50;
  private subscription: Subscription = new Subscription();
  private globalActions: GlobalActions;
  private contactsActions: ContactsActions;
  private servicesActions: ServicesActions;
  private listContains;
  private destroyed: boolean;
  private isOnlineOnly: boolean;

  contactsList;
  loading = false;
  error;
  appending: boolean;
  hasContacts = true;
  filters:any = {};
  defaultFilters:any = {};
  moreItems;
  usersHomePlace;
  contactTypes;
  childPlaces;
  allowedChildPlaces = [];
  lastVisitedDateExtras;
  visitCountSettings;
  defaultSortDirection = 'alpha';
  sortDirection = this.defaultSortDirection;
  additionalListItem = false;
  useSearchNewDesign = true;
  enketoEdited: boolean;
  selectedContact;

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
    private settingsService: SettingsService,
    private UHCSettings: UHCSettingsService,
    private scrollLoaderProvider: ScrollLoaderProvider,
    private relativeDateService: RelativeDateService,
    private tourService: TourService,
    private router: Router,
    private exportService: ExportService,
    private xmlFormsService: XmlFormsService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.contactsActions = new ContactsActions(store);
    this.servicesActions = new ServicesActions(store);
  }

  ngOnInit() {
    this.isOnlineOnly = this.sessionService.isOnlineOnly();
    this.globalActions.clearFilters(); // clear any global filters first
    this.subscribeToStore();

    const changesSubscription = this.changesService.subscribe({
      key: 'contacts-list',
      callback: (change) => {
        const limit = this.contactsList.length;
        if (change.deleted) {
          this.contactsActions.removeContactFromList({ _id: change.id });
          this.hasContacts = this.contactsList.length;
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
      });

    this.tourService.startIfNeeded(this.route.snapshot);
  }

  async ngAfterViewInit() {
    const isDisabled = !this.sessionService.isDbAdmin() && await this.authService.has(OLD_REPORTS_FILTER_PERMISSION);
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

  private getUserHomePlaceSummary() {
    return this.userSettingsService
      .get()
      .then((userSettings:any) => {
        if (userSettings.facility_id) {
          this.globalActions.setUserFacilityId(userSettings.facility_id);
          return this.getDataRecordsService.get(userSettings.facility_id);
        }
      })
      .then((summary) => {
        if (summary) {
          summary.home = true;
        }
        return summary;
      });
  }

  private canViewLastVisitedDate() {
    if (this.sessionService.isDbAdmin()) {
    // disable UHC for DB admins
      return Promise.resolve(false);
    }
    return this.authService.has('can_view_last_visited_date');
  }

  private formatContacts(contacts) {
    return contacts.map(updatedContact => {
      const contact = { ...updatedContact };
      const typeId = this.contactTypesService.getTypeId(contact);
      const type = this.contactTypesService.getTypeById(this.contactTypes, typeId);
      contact.route = 'contacts';
      contact.icon = type && type.icon;
      contact.heading = contact.name || '';
      contact.valid = true;
      contact.summary = null;
      contact.primary = contact.home;
      contact.dod = contact.date_of_death;
      if (type && type.count_visits && Number.isInteger(contact.lastVisitedDate)) {
        if (contact.lastVisitedDate === 0) {
          contact.overdue = true;
          contact.summary = this.translateService.instant('contact.last.visited.unknown');
        } else {
          const now = new Date().getTime();
          const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
          contact.overdue = contact.lastVisitedDate <= oneMonthAgo;
          contact.summary = this.translateService.instant(
            'contact.last.visited.date',
            { date: this.relativeDateService.getRelativeDate(contact.lastVisitedDate, {}) }
          );
        }

        const visitCount = Math.min(contact.visitCount, 99) + (contact.visitCount > 99 ? '+' : '');
        contact.visits = {
          count: this.translateService.instant('contacts.visits.count', { count: visitCount }),
          summary: this.translateService.instant(
            'contacts.visits.visits',
            { VISITS: contact.visitCount }
          )
        };

        if (contact.visitCountGoal) {
          if (!contact.visitCount) {
            contact.visits.status = 'pending';
          } else if (contact.visitCount < contact.visitCountGoal) {
            contact.visits.status = 'started';
          } else {
            contact.visits.status = 'done';
          }
        }
      }

      return contact;
    });
  }

  private getChildren() {
    const filterChildPlaces = (children) => children.filter(child => !child.person);

    if (this.usersHomePlace) {
      // backwards compatibility with pre-flexible hierarchy users
      const homeType = this.contactTypesService.getTypeId(this.usersHomePlace);
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

  private query(opts?) {
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
          const homeIndex = _findIndex(updatedContacts, (contact:any) => {
            return contact._id === this.usersHomePlace._id;
          });
          this.additionalListItem =
            !this.filters.search &&
            (this.additionalListItem || !this.appending) &&
            homeIndex === -1;

          if(!this.appending) {
            if (homeIndex !== -1) {
              // move it to the top
              updatedContacts.splice(homeIndex, 1);
              updatedContacts.unshift(this.usersHomePlace);
            } else if (!this.filters.search) {
              updatedContacts.unshift(this.usersHomePlace);
            }
          }
        }

        updatedContacts = this.formatContacts(updatedContacts);
        this.contactsActions.updateContactsList(updatedContacts);

        this.moreItems = updatedContacts.length >= options.limit;
        this.hasContacts = !!this.contactsList.length;
        this.loading = false;
        this.appending = false;
        this.error = false;
        this.initScroll();
        this.setLeftActionBar();
      })
      .catch(err => {
        this.error = true;
        this.loading = false;
        console.error('Error loading contacts', err);
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
      userFacilityId: this.usersHomePlace?._id,
      childPlaces: this.allowedChildPlaces,
    });
  }

  exportContacts() {
    this.exportService.export('contacts', this.filters, { humanReadable: true });
  }

  private subscribeToAllContactXmlForms() {
    const subscription = this.xmlFormsService.subscribe(
      'ContactForms',
      { contactForms: true, trainingForms: false },
      (error, forms) => {
        if (error) {
          console.error('Error fetching allowed contact forms', error);
          return;
        }

        this.allowedChildPlaces = this.filterAllowedChildType(forms, this.childPlaces);
        this.globalActions.updateLeftActionBar({ childPlaces: this.allowedChildPlaces });
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
