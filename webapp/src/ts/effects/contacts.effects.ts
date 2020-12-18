import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store, select } from '@ngrx/store';
import { from, of } from 'rxjs';
import { map, exhaustMap, filter, catchError, withLatestFrom } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

import { Actions as ContactActionList, ContactsActions } from '@mm-actions/contacts';
import { ContactViewModelGeneratorService } from '@mm-services/contact-view-model-generator.service';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ContactSummaryService } from '@mm-services/contact-summary.service';
import { TasksForContactService } from '@mm-services/tasks-for-contact.service';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';

@Injectable()
export class ContactsEffects {
  private contactsActions;
  private globalActions;

  constructor(
    private actions$: Actions,
    private store: Store,
    private contactViewModelGeneratorService: ContactViewModelGeneratorService,
    private contactSummaryService: ContactSummaryService,
    private tasksForContactService: TasksForContactService,
    private targetAggregateService: TargetAggregatesService,
    private translateService: TranslateService,
  ) {
    this.contactsActions = new ContactsActions(store);
    this.globalActions = new GlobalActions(store);
  }

  selectContact = createEffect(() => {
    return this.actions$.pipe(
      ofType(ContactActionList.selectContact),
      filter(({ payload: { id } }) => !!id),
      exhaustMap(({ payload: { id, silent } }) => {
        if (!silent) {
          this.globalActions.setLoadingShowContent(id);
        }
        return from(this.contactViewModelGeneratorService.getContact(id, { getChildPlaces: true, merge: false })).pipe(
          map(model => this.contactsActions.setSelectedContact(model)),
          catchError(error => {
            console.error('Error selecting contact', error);
            return of(this.globalActions.unsetSelected());
          }),
        );
      }),
    );
  }, { dispatch: false });

  setSelectedContact = createEffect(() => {
    return this.actions$.pipe(
      ofType(ContactActionList.setSelectedContact),
      withLatestFrom(
        this.store.pipe(select(Selectors.getSelectedContact))
      ),
      exhaustMap(([{ payload: { selected } }, previousSelectedContact]) => {
        if (!selected) {
          return []; // return an empty stream if there is no selected contact
        }
        const refreshing = previousSelectedContact?.doc?._id === selected.id;
        this.globalActions.settingSelected(refreshing);
        this.contactsActions.setLoadingSelectedContact();
        this.contactsActions.setContactsLoadingSummary(true);
        this.globalActions.clearCancelCallback();
        const options = { getChildPlaces: true };
        const title = (selected.type && selected.type.name_key) || 'contact.profile';
        this.globalActions.setTitle(this.translateService.instant(title));
        return from(this.contactViewModelGeneratorService.loadChildren(previousSelectedContact, options)).pipe(
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

  receiveSelectedContactReports = createEffect(() => {
    return this.actions$.pipe(
      ofType(ContactActionList.receiveSelectedContactChildren),
      withLatestFrom(
        this.store.pipe(select(Selectors.getSelectedContact)),
        this.store.pipe(select(Selectors.getForms)),
      ),
      exhaustMap(([, selectedContact, forms]) => {
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

  updateSelectedContactSummary = createEffect(() => {
    return this.actions$.pipe(
      ofType(ContactActionList.receiveSelectedContactReports),
      withLatestFrom(
        this.store.pipe(select(Selectors.getSelectedContact))
      ),
      exhaustMap(([, selectedContact]) => {
        const selected: any = { ...selectedContact };
        this.contactsActions.setContactsLoadingSummary(true);
        this.tasksForContactService
          .get(selected)
          .then((tasks) => {
            return this.contactsActions.updateSelectedContactsTasks(tasks);
          });
        return from(this.contactSummaryService.get(selected.doc, selected.reports, selected.lineage)).pipe(
          map(summary => {
            this.contactsActions.setContactsLoadingSummary(false);
            return this.contactsActions.updateSelectedContactSummary(summary);
          }),
          catchError(error => {
            console.error('Error loading summary', error);
            return of(this.globalActions.unsetSelected());
          }),
        );
      })
    );
  },{ dispatch: false });

  receiveSelectedContactTargetDoc = createEffect(() => {
    return this.actions$.pipe(
      ofType(ContactActionList.updateSelectedContactSummary),
      withLatestFrom(
        this.store.pipe(select(Selectors.getSelectedContact))
      ),
      exhaustMap(([, selectedContact]) => {
        return from(this.targetAggregateService.getCurrentTargetDoc(selectedContact)).pipe(
          map(targetDoc => {
            return this.contactsActions.receiveSelectedContactTargetDoc(targetDoc);
          }),
          catchError(error => {
            console.error('Error loading target doc', error);
            return of(this.globalActions.unsetSelected());
          }),
        );
      })
    );
  },{ dispatch: false });
}
