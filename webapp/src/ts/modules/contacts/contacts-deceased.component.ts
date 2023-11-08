import { Component, OnInit, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { Router, ActivatedRoute } from '@angular/router';

import { Selectors } from '@mm-selectors/index';
import { ContactsActions } from '@mm-actions/contacts';
import { ChangesService } from '@mm-services/changes.service';

@Component({
  selector: 'contacts-deceased',
  templateUrl: './contacts-deceased.component.html'
})
export class ContactsDeceasedComponent implements OnInit, OnDestroy {
  subscription: Subscription = new Subscription();
  private contactsActions;
  loadingContent;
  selectedContact;

  constructor(
    private store: Store,
    private changesService: ChangesService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.contactsActions = new ContactsActions(store);
  }

  ngOnInit() {
    this.subscribeToStore();
    this.subscribeToRoute();
    this.subscribeToChanges();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  subscribeToStore() {
    const reduxSubscription = combineLatest(
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getSelectedContact),
    ).subscribe(([loadingContent, selectedContact]) => {
      this.selectedContact = selectedContact;
      this.loadingContent = loadingContent;
    });
    this.subscription.add(reduxSubscription);
  }

  subscribeToRoute() {
    const routeSubscription =  this.route.params.subscribe((params) => {
      if (params.id) {
        this.selectContact(params.id);
      }
    });
    this.subscription.add(routeSubscription);
  }

  subscribeToChanges() {
    const changesSubscription = this.changesService.subscribe({
      key: 'contacts-deceased',
      filter: (change) => {
        return this.selectedContact?.doc?._id === change.id;
      },
      callback: (change) => {
        if (change.deleted) {
          const parentId = this.selectedContact?.doc?.parent?._id;
          return this.router.navigate(['/contacts', { id: parentId || null }]);
        }
        // refresh the updated contact
        this.selectContact(change.id, true);
      }
    });
    this.subscription.add(changesSubscription);
  }

  selectContact(id, silent?) {
    this.contactsActions.selectContact(id, silent);
  }
}
