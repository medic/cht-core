import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { from, of } from 'rxjs';
import { map, exhaustMap, filter, catchError } from 'rxjs/operators';

import { Actions as ContactActionList, ContactsActions } from '@mm-actions/contacts';
import { ContactViewModelGeneratorService } from '@mm-services/contact-view-model-generator.service';
import { GlobalActions } from '@mm-actions/global';

@Injectable()
export class ContactsEffects {
  private contactsActions;
  private globalActions;

  constructor(
    private actions$: Actions,
    private store: Store,
    private contactViewModelGeneratorService: ContactViewModelGeneratorService
  ) {
    this.contactsActions = new ContactsActions(store);
    this.globalActions = new GlobalActions(store);
  }

  selectContact = createEffect(() => {
    return this.actions$.pipe(
      ofType(ContactActionList.selectContact),
      filter(({ payload: { id } }) => !!id),
      exhaustMap(({ payload: { id, silent } }) => {
        console.log('in the map after selecting');
        if (!silent) {
          this.globalActions.setLoadingShowContent(id);
        }

        return from(this.contactViewModelGeneratorService.getContact(id, { getChildPlaces: false, merge: false })).pipe(
          map(model => this.contactsActions.setSelected(model)),
          catchError(error => {
            console.error('Error selecting report', error);
            return of(this.globalActions.unsetSelected());
          }),
        );
      }),
    );
  }, { dispatch: false });
}
