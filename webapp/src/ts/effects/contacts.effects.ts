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

        let trackName = [ 'contact_detail', 'contact', 'load' ];
        const trackPerformance = this.performanceService.track();

        if (!silent) {
          this.globalActions.setLoadingShowContent(id);
          this.contactsActions.setLoadingSelectedContact();
          this.contactsActions.setContactsLoadingSummary(true);
        }

        const trackContactDataLoad = this.performanceService.track();
        const loadContact = this
          .loadContact(id)
          .then(contact => {
            const contactType = contact?.doc?.contact_type;
            if (contactType) {
              trackName = trackName.map(part => part === 'contact' ? contactType : part);
            }
            trackContactDataLoad?.stop({ name: [ ...trackName, 'contact_data' ].join(':') });
          })
          .then(() => this.verifySelectedContactNotChanged(id))
          .then(() => this.setTitle())
          .then(() => this.loadChildren(id, userFacilityId, trackName))
          .then(() => this.loadReports(id, forms, trackName))
          .then(() => this.loadTargetDoc(id, trackName))
          .then(() => this.loadContactSummary(id, trackName))
          .then(() => this.loadTasks(id, trackName))
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
            trackPerformance?.stop({ recordApdex: true, name: trackName.join(':') });
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
    this.contactsActions.setContactIdToLoad(id);
    return this.contactViewModelGeneratorService
      .getContact(id, { merge: false })
      .then(model => {
        return this
          .verifySelectedContactNotChanged(model._id)
          .then(() => {
            this.globalActions.settingSelected();
            this.contactsActions.setSelectedContact(model);
            return model;
          });
      });
  }

  private verifySelectedContactNotChanged(id) {
    return this.contactIdToLoad !== id ? Promise.reject({code: 'SELECTED_CONTACT_CHANGED'}) : Promise.resolve();
  }

  private shouldGetDescendants(contactId, userFacilityId: string[] = []) {
    if (!userFacilityId?.length) {
      return true;
    }

    if (userFacilityId.length > 1) {
      return true;
    }

    return userFacilityId[0] !== contactId;
  }

  private loadChildren(contactId, userFacilityId, trackName) {
    const trackPerformance = this.performanceService.track();
    const getChildPlaces = this.shouldGetDescendants(contactId, userFacilityId);

    return this.contactViewModelGeneratorService
      .loadChildren(this.selectedContact, {getChildPlaces})
      .then(children => {
        return this
          .verifySelectedContactNotChanged(contactId)
          .then(() => this.contactsActions.receiveSelectedContactChildren(children));
      })
      .finally(() => {
        trackPerformance?.stop({ name: [ ...trackName, 'load_descendants' ].join(':') });
      });
  }

  private loadReports(contactId, forms, trackName) {
    const trackPerformance = this.performanceService.track();
    return this.contactViewModelGeneratorService
      .loadReports(this.selectedContact, forms)
      .then(reports => {
        return this
          .verifySelectedContactNotChanged(contactId)
          .then(() => this.contactsActions.receiveSelectedContactReports(reports));
      })
      .finally(() => {
        trackPerformance?.stop({ name: [ ...trackName, 'load_reports' ].join(':') });
      });
  }

  private loadTargetDoc(contactId, trackName) {
    const trackPerformance = this.performanceService.track();
    return this.targetAggregateService
      .getCurrentTargetDoc(this.selectedContact)
      .then(targetDoc => {
        return this
          .verifySelectedContactNotChanged(contactId)
          .then(() => this.contactsActions.receiveSelectedContactTargetDoc(targetDoc));
      })
      .finally(() => {
        trackPerformance?.stop({ name: [ ...trackName, 'load_targets' ].join(':') });
      });
  }

  private loadTasks(contactId, trackName) {
    const trackPerformance = this.performanceService.track();
    return this.tasksForContactService
      .get(this.selectedContact)
      .then(tasks => {
        return this
          .verifySelectedContactNotChanged(contactId)
          .then(() => this.contactsActions.updateSelectedContactsTasks(tasks));
      })
      .finally(() => {
        trackPerformance?.stop({ name: [ ...trackName, 'load_tasks' ].join(':') });
      });
  }

  private loadContactSummary(contactId, trackName) {
    const trackPerformance = this.performanceService.track();
    const selected = this.selectedContact;
    return this.contactSummaryService
      .get(selected.doc, selected.reports, selected.lineage, selected.targetDoc)
      .catch(error => {
        this.contactsActions.updateSelectedContactSummary({ errorStack: error.stack });
        throw error;
      })
      .then(summary => {
        return this
          .verifySelectedContactNotChanged(contactId)
          .then(() => {
            this.contactsActions.setContactsLoadingSummary(false);
            return this.contactsActions.updateSelectedContactSummary(summary);
          });
      })
      .finally(() => {
        trackPerformance?.stop({ name: [ ...trackName, 'load_contact_summary' ].join(':') });
      });
  }
}
