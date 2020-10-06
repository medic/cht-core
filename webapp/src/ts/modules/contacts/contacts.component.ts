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
  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private changeService: ChangesService,
    private translateService: TranslateService,
  ) {
    this.globalActions = new GlobalActions(store);
    this.contactsActions = new ContactsActions(store);
    this.servicesActions = new ServicesActions(store);
  }

  ngOnInit() {
    const reduxSubscription = combineLatest(
      this.store.select(Selectors.getContactsList),
    ).subscribe(([contactsList]) => {
      this.contactsList = contactsList;
    });
    this.subscription.add(reduxSubscription);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
