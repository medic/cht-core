import { Component, OnInit, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash-es';
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
import { SimprintsService } from '@mm-services/simprints.service';
import { Selectors } from '@mm-selectors/index';
import { isMobile } from '@mm-providers/responsive.provider';
import { SearchService } from '@mm-services/search.service';
import { ContactTypesService } from '@mm-services/contact-types.service'
import { init as scrollLoaderInit } from '@mm-providers/scroll-loader.provider';

const PAGE_SIZE = 50;

@Component({
  templateUrl: './contacts.component.html'
})
export class ContactsComponent implements OnInit, OnDestroy{
  private subscription: Subscription = new Subscription();
  private globalActions;
  private contactsActions;
  private servicesActions;

  contactsList;
  loading = false;
  error;
  appending;
  filtered = false;
  hasContacts = true;
  filters:any = {};
  defaultFilters:any = {};
  moreItems;
  usersHomePlace;
  contactTypes;
  isAdmin;
  childPlaces;
  lastVisitedDateExtras;
  visitCountSettings;
  defaultSortDirection = 'alpha';
  sortDirection = this.defaultSortDirection;
  additionalListItem = false;
  simprintsEnabled;

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private changeService: ChangesService,
    private translateService: TranslateService,
    private searchService: SearchService,
    private contactTypesService: ContactTypesService,
    private userSettingsService:UserSettingsService,
    private getDataRecordsService: GetDataRecordsService,
    private sessionService: SessionService,
    private authService: AuthService,
    private settingsService: SettingsService,
    private UHCSettings: UHCSettingsService,
    private simprintsService: SimprintsService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.contactsActions = new ContactsActions(store);
    this.servicesActions = new ServicesActions(store);
  }

  ngOnInit() {
    const reduxSubscription = combineLatest(
      this.store.select(Selectors.getContactsList),
      this.store.select(Selectors.getIsAdmin),
      this.store.select(Selectors.getFilters)
    ).subscribe(([contactsList, isAdmin, filters]) => {
      this.contactsList = contactsList;
      this.isAdmin = isAdmin;
      this.filters = filters
    });
    this.subscription.add(reduxSubscription);
    Promise.all([
      this.getUserHomePlaceSummary(),
      this.canViewLastVisitedDate(),
      this.settingsService.get(),
      this.contactTypesService.getAll()
    ])
    .then(([homePlaceSummary, viewLastVisitedDate, settings, contactTypes]) => {
      this.usersHomePlace = homePlaceSummary;
      this.lastVisitedDateExtras = viewLastVisitedDate;
      this.visitCountSettings = this.UHCSettings.getVisitCountSettings(settings);
      if(this.lastVisitedDateExtras && this.UHCSettings.getContactsDefaultSort(settings)) {
        this.sortDirection = this.defaultSortDirection = this.UHCSettings.getContactsDefaultSort(settings);
      }
      this.contactTypes = contactTypes;
      return this.getChildren()
    })
    .then((children) => {
      this.childPlaces = children;
      this.defaultFilters = {
        types: {
          selected: this.childPlaces.map(type => type.id)
        }
      };
      this.simprintsEnabled = this.simprintsService.enabled();
      this.search();
    })
    .catch(() => {
      this.error = true;
      this.loading = false;
      this.appending = false;
    });
      
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private getUserHomePlaceSummary() {
    return this.userSettingsService.get()
      .then((userSettings:any) => {
        if (userSettings.facility_id) {
          return this.getDataRecordsService.get(userSettings.facility_id, {include_docs: false});
        }
      })
      .then((summary) => {
        if (summary) {
          summary.home = true;
        }
        return summary;
      });
  };

  private canViewLastVisitedDate() {
    if (this.sessionService.isDbAdmin()) {
      // disable UHC for DB admins
      return false;
    }
    return this.authService.has('can_view_last_visited_date');
  }

  private formatContacts(contacts) {
    return contacts.map(contact => {
      const typeId = contact.contact_type || contact.type;
      const type = this.contactTypes.find(type => type.id === typeId);
      contact.route = 'contacts';
      contact.icon = type && type.icon;
      contact.heading = contact.name;
      contact.valid = true;

      return contact
    });
  }

  private getChildren() {
    let p;
    if (this.usersHomePlace) {
      // backwards compatibility with pre-flexible hierarchy users
      const homeType = this.usersHomePlace.contact_type || this.usersHomePlace.type;
      p = this.contactTypesService.getChildren(homeType);
    } else if (this.isAdmin) {
      p = this.contactTypesService.getChildren(false);
    } else {
      return Promise.resolve([]);
    }
    return p.then(children => children.filter(child => !child.person));
  };

  private initScroll() {
    scrollLoaderInit(() => {
      if (!this.loading && this.moreItems) {
        this.query({ skip: true });
      }
    });
  };

  private isSortedByLastVisited() {
    return this.sortDirection === 'last_visited_date';
  }

  private query(opts) {
    const options = Object.assign({ limit: PAGE_SIZE, hydrateContactNames: true }, opts);
    if (options.limit < PAGE_SIZE) {
      options.limit = PAGE_SIZE;
    }

    if (!options.silent) {
      this.error = false;
      this.loading = true;
    }

    const searchFilters = Object.keys(this.filters).length < 1 ? this.defaultFilters : this.filters;

    const extensions:any = {};
    if (this.lastVisitedDateExtras) {
      extensions.displayLastVisitedDate = true;
      extensions.visitCountSettings = this.visitCountSettings;
    }
    if (this.isSortedByLastVisited()) {
      extensions.sortByLastVisitedDate = true;
    }

    return this.searchService
      .search('contacts', searchFilters, options, extensions)
      .then((updatedContacts) => {
        updatedContacts = this.formatContacts(updatedContacts);

        // If you have a home place make sure its at the top
        if(this.usersHomePlace) {
          const homeIndex = _.findIndex(updatedContacts, (contact:any) => {
            return contact._id === this.usersHomePlace._id;
          })
          this.additionalListItem = 
            this.filters.search &&
            this.filters.simprintsIdentities &&
            (this.additionalListItem || !this.appending) &&
            homeIndex === -1;

          if(!this.appending) {
            if (homeIndex !== -1) {
              // move it to the top
              updatedContacts.splice(homeIndex, 1);
              updatedContacts.unshift(this.usersHomePlace);
            } else if (
              this.filters.search &&
              this.filters.simprintsIdentities
            ) {
              updatedContacts.unshift(this.usersHomePlace);
            }
            if (this.filters.simprintsIdentities) {
              updatedContacts.forEach((contact) => {
                const identity = this.filters.simprintsIdentities.find(
                  function(identity) {
                    return identity.id === contact.simprints_id;
                  }
                );
                contact.simprints = identity || {
                  confidence: 0,
                  tierNumber: 5,
                };
              });
            }
          }
        }

        this.contactsActions.updateContactsList(updatedContacts);

        this.moreItems = updatedContacts.length >= options.limit;
        this.hasContacts = !!updatedContacts.length;
        this.loading = false;
        this.appending = false;
        this.error = false;
        this.initScroll();
      })
      .catch(err => {
        this.error = true;
        this.loading = false;
        if (
          this.filters.search &&
          err.reason &&
          err.reason.toLowerCase().indexOf('bad query syntax') !== -1
        ) {
          // invalid freetext filter query
          // this.errorSyntax = true;
        }
        console.error('Error loading messages', err);
      });
  }

  search(force = false) {
    // clears report selection for any text search or filter selection
    // does not clear selection when someone is editing a form
    // if((this.filters.search || Object.keys(this.filters).length > 1) && !this.enketoEdited) {
    //   //$state.go('reports.detail', { id: null }, { notify: false });
    //   //ctrl.clearSelection();
    // }
    if (!force && isMobile()) {
      // leave content shown
      return;
    }
    this.loading = true;

    return this.query(force);
  }

  simprintsIdentify() {
    this.loading = true;
    this.simprintsService.identify().then((identities) => {
      this.filters.simprintsIdentities = identities;
      this.search();
    });
  };
}
