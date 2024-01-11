import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store, select } from '@ngrx/store';
import { combineLatest, of } from 'rxjs';
import { exhaustMap, withLatestFrom } from 'rxjs/operators';

import { Actions as ContactActionList, ContactsActions } from '@mm-actions/contacts';
import { ContactViewModelGeneratorService } from '@mm-services/contact-view-model-generator.service';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ContactSummaryService } from '@mm-services/contact-summary.service';
import { TasksForContactService } from '@mm-services/tasks-for-contact.service';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { RouteSnapshotService } from '@mm-services/route-snapshot.service';
import { TranslateService } from '@mm-services/translate.service';
import { PerformanceService } from '@mm-services/performance.service';

@Injectable()
export class ContactsEffects {
  private contactsActions: ContactsActions;
  private globalActions: GlobalActions;

  private selectedContact;
  private contactIdToLoad;

  constructor(
    private actions$: Actions,
    private store: Store,
    private performanceService: PerformanceService,
    private contactViewModelGeneratorService: ContactViewModelGeneratorService,
    private contactSummaryService: ContactSummaryService,
    private tasksForContactService: TasksForContactService,
    private targetAggregateService: TargetAggregatesService,
    private translateService: TranslateService,
    private routeSnapshotService: RouteSnapshotService,
  ) {
    this.contactsActions = new ContactsActions(store);
    this.globalActions = new GlobalActions(store);

    combineLatest(
      this.store.select(Selectors.getSelectedContact),
      this.store.select(Selectors.getContactIdToLoad),
    ).subscribe(([ selectedContact, contactIdToLoad ]) => {
      this.selectedContact = selectedContact;
      this.contactIdToLoad = contactIdToLoad;
    });
  }

  selectContact = createEffect(() => {
    const trackPerformance = this.performanceService.track('select_contact:load_everything');
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
          .then(() => this.verifySelectedContactNotChanged(id))
          .then(() => this.setTitle())
          .then(() => this.loadChildren(id, userFacilityId))
          .then(() => this.loadReports(id, forms))
          .then(() => this.loadTargetDoc(id))
          .then(() => this.loadContactSummary(id))
          .then(() => this.loadTasks(id))
          .catch(err => {
            // If the selected contact has changed, just stop loading this one
            if (err.code === 'SELECTED_CONTACT_CHANGED') {
              return of();
            }
            if (err.code === 404 && !silent) {
              this.globalActions.setSnackbarContent(this.translateService.instant('error.404.title'));
            }
            console.error('Error selecting contact', err);
            this.globalActions.unsetSelected();
            return of(this.contactsActions.clearSelection());
          })
          .finally(() => {
            trackPerformance?.stop();
          });

        return of(loadContact);
      }),
    );
  }, { dispatch: false });

  private setTitle() {
    const routeSnapshot = this.routeSnapshotService.get();
    const deceasedTitle = routeSnapshot?.data?.name === 'contacts.deceased'
      ? this.translateService.instant('contact.deceased.title') : null;
    const title = deceasedTitle || this.selectedContact.type?.name_key || 'contact.profile';
    this.globalActions.setTitle(this.translateService.instant(title));
  }

  private loadContact(id) {
    const trackPerformance = this.performanceService.track('select_contact:contact_data');
    this.contactsActions.setContactIdToLoad(id);
    return this.contactViewModelGeneratorService
      .getContact(id, { merge: false })
      .then(model => {
        return this
          .verifySelectedContactNotChanged(model._id)
          .then(() => {
            this.globalActions.settingSelected();
            this.contactsActions.setSelectedContact(model);
          });
      })
      .finally(() => {
        trackPerformance?.stop();
      });
  }

  private verifySelectedContactNotChanged(id) {
    return this.contactIdToLoad !== id ? Promise.reject({code: 'SELECTED_CONTACT_CHANGED'}) : Promise.resolve();
  }

  private loadChildren(contactId, userFacilityId) {
    const trackPerformance = this.performanceService.track('select_contact:load_children');
    const getChildPlaces = userFacilityId !== contactId;
    return this.contactViewModelGeneratorService
      .loadChildren(this.selectedContact, {getChildPlaces})
      .then(children => {
        return this
          .verifySelectedContactNotChanged(contactId)
          .then(() => this.contactsActions.receiveSelectedContactChildren(children));
      })
      .finally(() => {
        trackPerformance?.stop();
      });
  }

  private loadReports(contactId, forms) {
    const trackPerformance = this.performanceService.track('select_contact:load_reports');
    return this.contactViewModelGeneratorService
      .loadReports(this.selectedContact, forms)
      .then(reports => {
        return this
          .verifySelectedContactNotChanged(contactId)
          .then(() => this.contactsActions.receiveSelectedContactReports(reports));
      })
      .finally(() => {
        trackPerformance?.stop();
      });
  }

  private loadTargetDoc(contactId) {
    const trackPerformance = this.performanceService.track('select_contact:load_targets');
    return this.targetAggregateService
      .getCurrentTargetDoc(this.selectedContact)
      .then(targetDoc => {
        return this
          .verifySelectedContactNotChanged(contactId)
          .then(() => this.contactsActions.receiveSelectedContactTargetDoc(targetDoc));
      })
      .finally(() => {
        trackPerformance?.stop();
      });
  }

  private loadTasks(contactId) {
    const trackPerformance = this.performanceService.track('select_contact:load_tasks');
    return this.tasksForContactService
      .get(this.selectedContact)
      .then(tasks => {
        return this
          .verifySelectedContactNotChanged(contactId)
          .then(() => this.contactsActions.updateSelectedContactsTasks(tasks));
      })
      .finally(() => {
        trackPerformance?.stop();
      });
  }

  private loadContactSummary(contactId) {
    const trackPerformance = this.performanceService.track('select_contact:load_contact_summary');
    const selected = this.selectedContact;
    return this.contactSummaryService
      .get(selected.doc, selected.reports, selected.lineage, selected.targetDoc)
      .then(summary => {
        return this
          .verifySelectedContactNotChanged(contactId)
          .then(() => {
            this.contactsActions.setContactsLoadingSummary(false);
            return this.contactsActions.updateSelectedContactSummary(summary);
          });
      })
      .finally(() => {
        trackPerformance?.stop();
      });
  }
}
