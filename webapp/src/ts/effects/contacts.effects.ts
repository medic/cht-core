import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store, select } from '@ngrx/store';
import { from, of } from 'rxjs';
import { map, exhaustMap, filter, catchError, withLatestFrom } from 'rxjs/operators';

import { Actions as ContactActionList, ContactsActions } from '@mm-actions/contacts';
import { ContactViewModelGeneratorService } from '@mm-services/contact-view-model-generator.service';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ContactSummaryService } from '@mm-services/contact-summary.service';

@Injectable()
export class ContactsEffects {
  private contactsActions;
  private globalActions;

  constructor(
    private actions$: Actions,
    private store: Store,
    private contactViewModelGeneratorService: ContactViewModelGeneratorService,
    private contactSummaryService: ContactSummaryService,
  ) {
    this.contactsActions = new ContactsActions(store);
    this.globalActions = new GlobalActions(store);
  }

  private loadSelectedContactChildren(selected, options) {
    return this.contactViewModelGeneratorService.loadChildren(selected, options).then(children => {
      return this.contactsActions.receiveSelectedContactChildren(children);
    });
  }

  private loadSelectedContactReports(selected, forms) {
    console.log('caaled with', selected);
    return this.contactViewModelGeneratorService.loadReports(selected, forms).then(reports => {
      return this.contactsActions.receiveSelectedContactReports(reports);
    });
  }

  // TODO:
  // private loadSelectedContactTargetDoc(selected) {
  //   return '';
  // }

  selectContact = createEffect(() => {
    return this.actions$.pipe(
      ofType(ContactActionList.selectContact),
      filter(({ payload: { id } }) => !!id),
      exhaustMap(({ payload: { id, silent } }) => {
        if (!silent) {
          this.globalActions.setLoadingShowContent(id);
        }
        return from(this.contactViewModelGeneratorService.getContact(id, { getChildPlaces: false, merge: false })).pipe(
          map(model => this.contactsActions.setSelected(model)),
          catchError(error => {
            console.error('Error selecting contact', error);
            return of(this.globalActions.unsetSelected());
          }),
        );
      }),
    );
  }, { dispatch: false });

  setSelected = createEffect(() => {
    return this.actions$.pipe(
      ofType(ContactActionList.setSelected),
      withLatestFrom(
        this.store.pipe(select(Selectors.getSelectedContact)),
        this.store.pipe(select(Selectors.getForms)),
      ),
      exhaustMap(([{ payload: { selected } }, selectedContact, forms]) => {
        const refreshing = (selectedContact && selectedContact.doc._id) === selected.id;
        this.globalActions.settingSelected(refreshing);
        this.contactsActions.setLoadingSelectedContact();
        this.contactsActions.setContactsLoadingSummary(true);
        this.globalActions.clearCancelCallback();
        const lazyLoadedContactData = this.loadSelectedContactChildren(selectedContact, { getChildPlaces: false })
          .then(() => this.loadSelectedContactReports(selectedContact, forms));
          // .then(() => loadSelectedContactTargetDoc(selected));
        return from(lazyLoadedContactData).pipe(
          map(() => {
            this.contactSummaryService.get(selectedContact.doc, selectedContact.reports, selectedContact.lineage);
          })
        );
      })
    );
  },{ dispatch: false });
}
