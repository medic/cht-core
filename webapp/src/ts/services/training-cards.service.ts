import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as moment from 'moment';

import { XmlFormsService } from '@mm-services/xml-forms.service';
import { TrainingCardsComponent } from '@mm-modals/training-cards/training-cards.component';
import { DbService } from '@mm-services/db.service';
import { GlobalActions } from '@mm-actions/global';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { SessionService } from '@mm-services/session.service';
import { RouteSnapshotService } from '@mm-services/route-snapshot.service';

export const TRAINING_PREFIX: string = 'training';

@Injectable({
  providedIn: 'root'
})
export class TrainingCardsService {
  private globalActions;

  constructor(
    private store: Store,
    private xmlFormsService: XmlFormsService,
    private dbService: DbService,
    private modalService: ModalService,
    private sessionService: SessionService,
    private routeSnapshotService: RouteSnapshotService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  private getAvailableTrainingForms(xForms, userCtx) {
    const today = moment();

    return xForms
      .map(xForm => ({
        id: xForm._id,
        code: xForm.internalId,
        startDate: xForm.context?.start_date,
        duration: xForm.context?.duration,
        userRoles: xForm.context?.user_roles,
      }))
      .filter(form => {
        const hasRole = form.userRoles?.find(role => userCtx.roles.includes(role));
        if (!hasRole) {
          return false;
        }

        form.startDate = form.startDate ? moment(form.startDate) : today.clone();
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
        startkey: [ TRAINING_PREFIX, userCtx.name ].join(':'),
        endkey: [ TRAINING_PREFIX, userCtx.name, '\ufff0' ].join(':'),
      });

    return docs?.rows?.length ? new Set(docs.rows.map(row => row?.doc?.form)) : new Set();
  }

  private async handleTrainingCards(error, xForms) {
    if (error) {
      console.error('Error fetching training cards.', error);
      return;
    }

    const routeSnapshot = this.routeSnapshotService.get();
    if (routeSnapshot?.data?.hideTraining) {
      return;
    }

    try {
      const firstChronologicalTrainingForm = await this.getFirstChronologicalForm(xForms);
      if (!firstChronologicalTrainingForm) {
        return;
      }

      this.globalActions.setTrainingCard(firstChronologicalTrainingForm.code);
      this.modalService.show(TrainingCardsComponent, { backdrop: 'static' });

    } catch (error) {
      console.error('Error showing training cards modal.', error);
      return;
    }
  }

  private async getFirstChronologicalForm(xForms) {
    const userCtx = this.sessionService.userCtx();
    const trainingForms = this.getAvailableTrainingForms(xForms, userCtx) || [];
    if (!trainingForms.length) {
      return;
    }

    const completedTrainings = await this.getCompletedTrainings(userCtx);
    return trainingForms
      .filter(form => !completedTrainings.has(form.code))
      .sort((a, b) => a.startDate.diff(b.startDate))
      .shift();
  }

  public initTrainingCards() {
    this.xmlFormsService.subscribe(
      'TrainingCards',
      { trainingForms: true },
      (error, xForms) => this.handleTrainingCards(error, xForms)
    );
  }

}
