import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

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
    const today = new Date();

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

        const startDate = new Date(form.startDate);
        if (startDate > today) {
          return false; // Training has not started yet
        }

        if (!form.duration) {
          return true; // Training never ends
        }

        const endDate = new Date(form.startDate);
        endDate.setDate(endDate.getDate() + form.duration);
        return endDate > today;
      })
      .sort((a, b) => a.startDate - b.startDate);
  }

  private async getCompletedTrainings(userCtx) {
    const docs = await this.dbService
      .get()
      .allDocs({
        include_docs: true,
        startkey: [ TRAINING_PREFIX, userCtx.name ].join(':'),
        endkey: [ TRAINING_PREFIX, userCtx.name, '\ufff0' ].join(':'),
      });

    if (!docs?.rows?.length) {
      return;
    }

    return new Set(docs.rows.map(row => row?.doc?.form));
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
      const userCtx = this.sessionService.userCtx();
      let trainingForms = this.getAvailableTrainingForms(xForms, userCtx);
      if (!trainingForms?.length) {
        return;
      }

      const completedTrainings = await this.getCompletedTrainings(userCtx);
      if (completedTrainings) {
        trainingForms = trainingForms.filter(form => !completedTrainings.has(form.code));
      }

      if (!trainingForms.length) {
        return;
      }

      this.globalActions.setTrainingCard(trainingForms[0].code);
      this.modalService.show(TrainingCardsComponent, { backdrop: 'static' });
    } catch (error) {
      console.error('Error showing training cards modal.', error);
      return;
    }
  }

  public initTrainingCards() {
    if (this.sessionService.isDbAdmin()) {
      return;
    }

    this.xmlFormsService.subscribe(
      'TrainingCards',
      { trainingForms: true, contactForms: false },
      (error, xForms) => this.handleTrainingCards(error, xForms)
    );
  }

}
