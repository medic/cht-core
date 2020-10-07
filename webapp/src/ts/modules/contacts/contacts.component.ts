import { Component, OnInit, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { GlobalActions } from '../../actions/global';
import { ChangesService } from '@mm-services/changes.service';
import { ServicesActions } from '@mm-actions/services';
import { ContactsActions } from '@mm-actions/contacts';
import { Selectors } from '../../selectors';
import { isMobile } from '../../providers/responsive.provider';
import { SearchService } from '@mm-services/search.service';
import { ContactTypesService } from '@mm-services/contact-types.service'
import { init as scrollLoaderInit } from '../../providers/scroll-loader.provider';
import { reportsReducer } from '@mm-reducers/reports';

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
  moreItems;
  usersHomePlace;
  contactTypes;
  isAdmin;
  childPlaces;

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private changeService: ChangesService,
    private translateService: TranslateService,
    private searchService: SearchService,
    private contactTypesService: ContactTypesService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.contactsActions = new ContactsActions(store);
    this.servicesActions = new ServicesActions(store);
  }

  ngOnInit() {
    const reduxSubscription = combineLatest(
      this.store.select(Selectors.getContactsList),
      this.store.select(Selectors.getIsAdmin)
    ).subscribe(([contactsList, isAdmin]) => {
      this.contactsList = contactsList;
      this.isAdmin = isAdmin;
    });
    this.subscription.add(reduxSubscription);
    this.contactTypesService
      .getAll()
      .then((types) => {
        this.contactTypes = types;
        return this.getChildren()
      })
      .then((children) => {
        this.childPlaces = children;
        this.filters = {
          types: {
            selected: this.childPlaces.map(type => type.id)
          }
        };
        this.search();
      });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private formatContacts(contacts) {
    return contacts.map(contact => {
      const typeId = contact.contact_type || contact.type;
      const type = this.contactTypes.find(type => type.id === typeId);
      contact.route = 'contacts';
      contact.icon = type && type.icon;
      contact.heading = contact.name;

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

  private query(opts) {
    const options = Object.assign({ limit: PAGE_SIZE, hydrateContactNames: true }, opts);
    if (options.limit < PAGE_SIZE) {
      options.limit = PAGE_SIZE;
    }

    if (!options.silent) {
      this.error = false;
      // this.errorSyntax = false;
      this.loading = true;
    }

    return this.searchService
      .search('contacts', this.filters, options)
      .then((updatedContacts) => {
        updatedContacts = this.formatContacts(updatedContacts);

        this.contactsActions.updateContactsList(updatedContacts);

        this.moreItems = updatedContacts.length >= options.limit;
        this.hasContacts = !!updatedContacts.length;
        this.loading = false;
        this.appending = false;
        this.error = false;
        // this.errorSyntax = false;

        // set first report selected if conditions todo
        // scrolling todo

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
}
