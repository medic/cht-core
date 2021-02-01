import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store, select } from '@ngrx/store';
import { of } from 'rxjs';
import { exhaustMap, withLatestFrom } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

import { Actions as ContactActionList, ContactsActions } from '@mm-actions/contacts';
import { ContactViewModelGeneratorService } from '@mm-services/contact-view-model-generator.service';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ContactSummaryService } from '@mm-services/contact-summary.service';
import { TasksForContactService } from '@mm-services/tasks-for-contact.service';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { RouteSnapshotService } from '@mm-services/route-snapshot.service';

@Injectable()
export class ContactsEffects {
  private contactsActions;
  private globalActions;

  private selectedContact;

  constructor(
    private actions$: Actions,
    private store: Store,
    private contactViewModelGeneratorService: ContactViewModelGeneratorService,
    private contactSummaryService: ContactSummaryService,
    private tasksForContactService: TasksForContactService,
    private targetAggregateService: TargetAggregatesService,
    private translateService: TranslateService,
    private routeSnapshotService: RouteSnapshotService,
  ) {
    this.contactsActions = new ContactsActions(store);
    this.globalActions = new GlobalActions(store);

    this.store
      .select(Selectors.getSelectedContact)
      .subscribe(selectedContact => this.selectedContact = selectedContact);
  }

  selectContact = createEffect(() => {
    return this.actions$.pipe(
      ofType(ContactActionList.selectContact),
      withLatestFrom(
        this.store.pipe(select(Selectors.getUserFacilityId)),
        this.store.select(Selectors.getForms),
      ),
      exhaustMap(([{ payload: { id, silent } }, userFacilityId, forms]) => {
        if (!id) {
          return of(this.contactsActions.clearSelection());
        }

        if (!silent) {
          this.globalActions.setLoadingShowContent(id);
          this.contactsActions.setLoadingSelectedContact();
          this.contactsActions.setContactsLoadingSummary(true);
        }

        const loadContact = this
          .loadContact(id)
          .then(() => this.loadChildren(userFacilityId))
          .then(() => this.loadReports(forms))
          .then(() => this.loadTargetDoc())
          .then(() => this.loadContactSummary())
          .then(() => this.loadTasks())
          .catch(err => {
            if (err.code === 404 && !silent) {
              this.globalActions.setSnackbarContent(this.translateService.instant('error.404.title'));
            }
            console.error('Error selecting contact', err);
            this.globalActions.unsetSelected();
            return of(this.contactsActions.setSelectedContact(null));
          });

        return of(loadContact);
      }),
    );
  }, { dispatch: false });

  private setTitle(selected) {
    const routeSnapshot = this.routeSnapshotService.get();
    const deceasedTitle = routeSnapshot?.data?.name === 'contacts.deceased'
      ? this.translateService.instant('contact.deceased.title') : null;
    const title = deceasedTitle || selected.type?.name_key || 'contact.profile';
    this.globalActions.setTitle(this.translateService.instant(title));
  }

  private loadContact(id) {
    return this.contactViewModelGeneratorService
      .getContact(id, { merge: false })
      .then(model => {
        this.globalActions.settingSelected();
        this.contactsActions.setSelectedContact(model);
        this.setTitle(model);
      });
  }

  private loadChildren(userFacilityId) {
    const getChildPlaces = userFacilityId !== this.selectedContact?._id;
    return this.contactViewModelGeneratorService
      .loadChildren(this.selectedContact, { getChildPlaces })
      .then(children => {
        this.contactsActions.receiveSelectedContactChildren(children);
      });
  }

  private loadReports(forms) {
    return this.contactViewModelGeneratorService
      .loadReports(this.selectedContact, forms)
      .then(reports => {
        return this.contactsActions.receiveSelectedContactReports(reports);
      });
  }

  private loadTargetDoc() {
    return this.targetAggregateService
      .getCurrentTargetDoc(this.selectedContact)
      .then(targetDoc => {
        this.contactsActions.receiveSelectedContactTargetDoc(targetDoc);
      });
  }

  private loadTasks() {
    return this.tasksForContactService
      .get(this.selectedContact)
      .then(tasks => {
        this.contactsActions.updateSelectedContactsTasks(tasks);
      });
  }

  private loadContactSummary() {
    const selected = this.selectedContact;
    return this.contactSummaryService
      .get(selected.doc, selected.reports, selected.lineage, selected.targetDoc)
      .then(summary => {
        this.contactsActions.setContactsLoadingSummary(false);
        return this.contactsActions.updateSelectedContactSummary(summary);
      });
  }
}
