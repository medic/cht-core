import { CanDeactivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { ContactsEditComponent } from '@mm-modules/contacts/contacts-edit.component';

@Injectable({
  providedIn: 'root'
})
export class ContactAddRouteGuardProvider implements CanDeactivate<ContactsEditComponent> {
  private globalActions;
  constructor(
    private router:Router,
    private store:Store,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  canDeactivate(
    component:ContactsEditComponent,
    currentRoute:ActivatedRouteSnapshot,
    currentState:RouterStateSnapshot,
    nextState:RouterStateSnapshot,
  ) {
    if (!component.enketoEdited || !component.cancelCallback) {
      return true;
    }

    this.globalActions.navigationCancel(nextState.url);
    return false;
  }
}
