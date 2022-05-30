import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import { XmlFormsService } from '@mm-services/xml-forms.service';
import { TrainingCardsComponent } from '@mm-modals/training-cards/training-cards.component';
import { DbService } from '@mm-services/db.service';
import { GlobalActions } from '@mm-actions/global';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { SessionService } from '@mm-services/session.service';
import { UserSettingsService } from '@mm-services/user-settings.service';

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
    private sessionService: SessionService,
    private userSettingsService: UserSettingsService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  private canOpenTraining() {
    return !this.sessionService.isDbAdmin() && !document.getElementsByClassName('enketo').length;
  }

  private getAvailableTrainingForms(xForms) {
    const userCtx = this.sessionService.userCtx();
    const today = new Date();

    return xForms
      .map(xForm => ({
        id: xForm._id,
        code: xForm.internalId,
        startDate: xForm.start_date,
        duration: xForm.duration,
        userRoles: xForm.user_roles,
      }))
      .filter(form => {
        const hasRole = form.userRoles?.find(role => userCtx.roles.includes(role));
        if (form.userRoles?.length && !hasRole) {
          return false;
        }

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
    const userSettings:any = await this.userSettingsService.get();
    const docs = await this.dbService
      .get()
      .query('medic-client/trainings_by_contact', { key: [ userSettings.contact_id ] });

    if (!docs?.rows?.length) {
      return;
    }

    return new Set(docs.rows.map(row => row.value));
  }

  private async handleTrainingCards(error, xForms) {
    if (error) {
      console.error('Error fetching training cards.', error);
      return;
    }

    try {
      let trainingForms = this.getAvailableTrainingForms(xForms);
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
      this.modalService.show(TrainingCardsComponent, { backdrop: 'static' });
    } catch (error) {
      console.error('Error showing training cards modal.', error);
      return;
    }
  }

  public initTrainingCards() {
    if (!this.canOpenTraining()) {
      return;
    }

    this.xmlFormsService.subscribe(
      'TrainingCards',
      { trainingForms: true, contactForms: false },
      (error, xForms) => this.handleTrainingCards(error, xForms)
    );
  }

}
