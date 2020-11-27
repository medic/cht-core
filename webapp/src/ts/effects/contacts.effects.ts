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

  // private loadSelectedContactChildren(selected, options) {
  //   return this.contactViewModelGeneratorService.loadChildren(selected, options).then(children => {
  //     return this.contactsActions.receiveSelectedContactChildren(children);
  //   });
  // }

  // private loadSelectedContactReports(selected, forms) {
  //   return this.contactViewModelGeneratorService.loadReports(selected, forms).then(reports => {
  //     return this.contactsActions.receiveSelectedContactReports(reports);
  //   });
  // }

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
        this.store.pipe(select(Selectors.getSelectedContact))
      ),
      exhaustMap(([{ payload: { selected } }, selectedContact]) => {
        const refreshing = (selectedContact && selectedContact.doc._id) === selected.id;
        this.globalActions.settingSelected(refreshing);
        this.contactsActions.setLoadingSelectedContact();
        this.contactsActions.setContactsLoadingSummary(true);
        this.globalActions.clearCancelCallback();
        const options = { getChildPlaces: false };
        // const lazyLoadedContactData = this.loadSelectedContactChildren(selectedContact, { getChildPlaces: false })
        //   .then(() => this.loadSelectedContactReports(selectedContact, forms));
        // .then(() => loadSelectedContactTargetDoc(selected));
        return from(this.contactViewModelGeneratorService.loadChildren(selectedContact, options)).pipe(
          map(children => {
            return this.contactsActions.receiveSelectedContactChildren(children);
          }),
          catchError(error => {
            console.error('Error fetching children', error);
            return of(this.globalActions.unsetSelected());
          }),
        );
      })
    );
  },{ dispatch: false });

  receiveSelectedContactChildren = createEffect(() => {
    return this.actions$.pipe(
      ofType(ContactActionList.receiveSelectedContactChildren),
      withLatestFrom(
        this.store.pipe(select(Selectors.getSelectedContact)),
        this.store.pipe(select(Selectors.getForms)),
      ),
      exhaustMap(([payload, selectedContact, forms]) => {
        return from(this.contactViewModelGeneratorService.loadReports(selectedContact, forms)).pipe(
          map(reports => {
            return this.contactsActions.receiveSelectedContactReports(reports);
          }),
          catchError(error => {
            console.error('Error loading reports', error);
            return of(this.globalActions.unsetSelected());
          }),
        );
      })
    );
  },{ dispatch: false });

  receiveSelectedContactReports = createEffect(() => {
    return this.actions$.pipe(
      ofType(ContactActionList.receiveSelectedContactReports),
      withLatestFrom(
        this.store.pipe(select(Selectors.getSelectedContact))
      ),
      exhaustMap(([payload, selectedContact]) => {
        const selected: any = Object.assign({}, selectedContact);
        this.contactsActions.setContactsLoadingSummary(true);
        // this.contactSummaryService.get(
        //   selected.doc,
        //   selected.reports,
        //   selected.lineage
        // ).then(() => {
        //   return of(this.contactsActions.setContactsLoadingSummary(false));
        // });
        // this.contactsActions.setContactsLoadingSummary(false);
        // return of(this.contactSummaryService.get(
        //   selected.doc,
        //   selected.reports,
        //   selected.lineage
        // ));
        return from(this.contactSummaryService.get(selected.doc, selected.reports, selected.lineage)).pipe(
          map(summary => {
            this.contactsActions.setContactsLoadingSummary(false);
            return this.contactsActions.updateSelectedContact(summary);
          })
        );
      })
    );
  },{ dispatch: false });
}
