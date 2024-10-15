import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as moment from 'moment';
import { v4 as uuid } from 'uuid';
import { first } from 'rxjs/operators';

import { XmlFormsService } from '@mm-services/xml-forms.service';
import { TrainingCardsComponent } from '@mm-modals/training-cards/training-cards.component';
import { DbService } from '@mm-services/db.service';
import { GlobalActions } from '@mm-actions/global';
import { ModalService } from '@mm-services/modal.service';
import { SessionService } from '@mm-services/session.service';
import { RouteSnapshotService } from '@mm-services/route-snapshot.service';

export const TRAINING_PREFIX: string = 'training:';

@Injectable({
  providedIn: 'root'
})
export class TrainingCardsService {
  private readonly globalActions: GlobalActions;
  private readonly STORAGE_KEY_LAST_VIEWED_DATE = 'training-cards-last-viewed-date';

  constructor(
    private store: Store,
    private xmlFormsService: XmlFormsService,
    private dbService: DbService,
    private modalService: ModalService,
    private sessionService: SessionService,
    private routeSnapshotService: RouteSnapshotService,
  ) {
    this.globalActions = new GlobalActions(this.store);
  }

  private getAvailableTrainingCards(xForms, userCtx) {
    const today = moment();

    return xForms
      .map(xForm => ({
        id: xForm._id,
        code: xForm.internalId,
        startDate: xForm.context?.start_date ? moment(xForm.context.start_date) : today.clone(),
        duration: xForm.context?.duration,
        userRoles: xForm.context?.user_roles,
      }))
      .filter(form => {
        if (!this.isTrainingCardForm(form.code)) {
          console.error(new Error(`Training Cards :: Incorrect internalId format. Doc ID: ${form.id}`));
          return false;
        }

        const hasRole = form.userRoles?.find(role => this.sessionService.hasRole(role, userCtx));
        if (form.userRoles && !hasRole) {
          return false; // Form has 'userRoles', but the user doesn't have any assigned.
        }

        if (!form.startDate?.isValid() || form.startDate.isAfter(today)) {
          return false;
        }

        if (!form.duration) {
          return true; // Training never ends
        }

        const endDate = form.startDate.clone();
        endDate.add(form.duration, 'day');
        return endDate.isAfter(today);
      });
  }

  private async getCompletedTrainings(userCtx) {
    const docs = await this.dbService
      .get()
      .allDocs({
        include_docs: true,
        startkey: TRAINING_PREFIX + userCtx.name + ':',
        endkey: TRAINING_PREFIX + userCtx.name + ':\ufff0',
      });

    return docs?.rows?.length ? new Set(docs.rows.map(row => row?.doc?.form)) : new Set();
  }

  private async handleTrainingCards(error, xForms) {
    if (error) {
      console.error('Training Cards :: Error fetching forms.', error);
      return;
    }

    try {
      const firstChronologicalTrainingCard = await this.getFirstChronologicalForm(xForms);
      if (!firstChronologicalTrainingCard) {
        return;
      }

      this.globalActions.setTrainingCard({ formId: firstChronologicalTrainingCard.code });
    } catch (error) {
      console.error('Training Cards :: Error showing modal.', error);
      return;
    }
  }

  displayTrainingCards() {
    if (this.hasBeenDisplayed()) {
      return;
    }

    const routeSnapshot = this.routeSnapshotService.get();
    if (routeSnapshot?.data?.hideTraining) {
      return;
    }

    this.modalService
      .show(TrainingCardsComponent, { closeOnNavigation: false })
      ?.afterOpened()
      .pipe(first())
      .subscribe(() => {
        const key = this.getLocalStorageKey();
        if (key) {
          window.localStorage.setItem(key, new Date().toISOString());
        }
      });
  }

  private async getFirstChronologicalForm(xForms) {
    const userCtx = this.sessionService.userCtx();
    const trainingCards = this.getAvailableTrainingCards(xForms, userCtx) || [];
    if (!trainingCards.length) {
      return;
    }

    const completedTrainings = await this.getCompletedTrainings(userCtx);
    return trainingCards
      .filter(form => !completedTrainings.has(form.code))
      .sort((a, b) => a.startDate.diff(b.startDate))
      .shift();
  }

  public initTrainingCards() {
    this.xmlFormsService.subscribe(
      'TrainingCards',
      { trainingCards: true },
      (error, xForms) => this.handleTrainingCards(error, xForms)
    );
  }

  public isTrainingCardForm(formInternalId) {
    return !!formInternalId?.startsWith(TRAINING_PREFIX);
  }

  public getTrainingCardDocId() {
    const userName = this.sessionService.userCtx()?.name;
    if (!userName) {
      throw new Error('Training Cards :: Cannot create document ID, user context does not have the "name" property.');
    }
    return `${TRAINING_PREFIX}${userName}:${uuid()}`;
  }

  private hasBeenDisplayed() {
    const key = this.getLocalStorageKey();
    if (!key) {
      return false;
    }

    const dateString = window.localStorage.getItem(key) ?? '';
    const lastViewedDate = new Date(dateString);
    if (isNaN(lastViewedDate.getTime())) {
      return false;
    }

    lastViewedDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return lastViewedDate >= today;
  }

  private getLocalStorageKey() {
    const username = this.sessionService.userCtx()?.name;
    if (!username) {
      return;
    }

    return `${this.STORAGE_KEY_LAST_VIEWED_DATE}-${username}`;
  }
}
