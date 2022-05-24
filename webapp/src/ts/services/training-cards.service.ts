import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import { XmlFormsService } from '@mm-services/xml-forms.service';
import { TrainingCardsComponent } from '@mm-modals/training-cards/training-cards.component';
import { DbService } from '@mm-services/db.service';
import { GlobalActions } from '@mm-actions/global';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { SessionService } from '@mm-services/session.service';

@Injectable({
  providedIn: 'root'
})
export class TrainingCardsService {
  private globalActions;

  constructor(
    private store:Store,
    private xmlFormsService: XmlFormsService,
    private dbService: DbService,
    private modalService:ModalService,
    private sessionService: SessionService
  ) {
    this.globalActions = new GlobalActions(store);
  }

  private canOpenTraining() {
    return !document.getElementsByClassName('enketo').length;
  }

  private getActiveTrainingForms(xForms) {
    const today = new Date();
    return xForms
      .map(xForm => ({
        id: xForm._id,
        code: xForm.internalId,
        startDate: xForm.start_date,
        duration: xForm.duration,
      }))
      .filter(form => {
        const startDate = new Date(form.startDate);
        if (!form.duration) {
          return startDate < today;
        }

        const endDate = new Date(form.startDate);
        endDate.setDate(endDate.getDate() + form.duration);
        return startDate < today && endDate > today;
      })
      .sort((a, b) => a.startDate - b.startDate);
  }

  private async getCompletedTrainings() {
    const docs = await this.dbService
      .get()
      .query('medic-client/trainings_by_form');

    if (!docs?.rows?.length) {
      return;
    }

    return new Set(docs.rows.map(row => row.key && row.key[0]));
  }

  public initTrainingCards() {
    if (!this.canOpenTraining()) {
      return;
    }

    if (this.sessionService.isDbAdmin()) {
      return;
    }

    this.xmlFormsService.subscribe(
      'TrainingCards',
      { trainingForms: true, contactForms: false },
      async (error, xForms) => {
        if (error) {
          console.error('Error fetching training cards.', error);
          return;
        }

        try {
          let trainingForms = this.getActiveTrainingForms(xForms);
          if (!trainingForms?.length) {
            return;
          }

          const completedTrainings = await this.getCompletedTrainings();
          if (completedTrainings) {
            trainingForms = trainingForms.filter(form => !completedTrainings.has(form.code));
          }

          if (!trainingForms.length) {
            return;
          }

          this.globalActions.setTrainingCard(trainingForms[0].code);
          this.modalService.show(TrainingCardsComponent);
        } catch (error) {
          console.error('Error showing training cards modal.', error);
          return;
        }
      });
  }

}
