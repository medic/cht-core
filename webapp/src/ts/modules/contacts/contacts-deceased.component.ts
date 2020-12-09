import { Component, OnInit, OnDestroy } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ContactsActions } from '@mm-actions/contacts';
import { ChangesService } from '@mm-services/changes.service';

@Component({
  selector: 'contacts-deceased',
  templateUrl: './contacts-deceased.component.html'
})
export class ContactsDeceasedComponent implements OnInit, OnDestroy {
  subscription: Subscription = new Subscription();
  private globalActions;
  private contactsActions;
  loadingContent;
  selectedContact;

  constructor(
    private store: Store,
    private changesService: ChangesService,
    private translateService:TranslateService,
    private router: Router,
    private route: ActivatedRoute,
  ){
    this.globalActions = new GlobalActions(store);
    this.contactsActions = new ContactsActions(store);
  }

  ngOnInit() {
    const reduxSubscription = combineLatest(
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getSelectedContact),
    ).subscribe(([loadingContent, selectedContact]) => {
      this.selectedContact = selectedContact;
      this.loadingContent = loadingContent;
    });
    this.subscription.add(reduxSubscription);

    const routeSubscription =  this.route.params.subscribe((params) => {
      if (params.id) {
        this.selectContact(params.id);
      }
    });
    this.subscription.add(routeSubscription);

    const changesSubscription = this.changesService.subscribe({
      key: 'contacts-deceased',
      filter: function(change) {
        return this.selectedContact && this.selectedContact.doc._id === change.id;
      },
      callback: function(change) {
        if (change.deleted) {
          const parentId = this.selectedContact &&
                           this.selectedContact.doc &&
                           this.selectedContact.doc.parent &&
                           this.selectedContact.doc.parent._id;
          return this.router.navigate(['/contacts', { id: parentId || null }]);
        } else {
          // refresh the updated contact
          this.selectContact(change.id, true);
        }
      }
    });
    this.subscription.add(changesSubscription);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  selectContact(id, silent?) {
    this.contactsActions.selectContact(id, silent);
    this.globalActions.setTitle(this.translateService.instant('contact.deceased.title'));
  }
}
