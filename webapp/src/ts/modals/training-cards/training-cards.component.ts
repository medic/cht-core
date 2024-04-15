import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';

import { XmlFormsService } from '@mm-services/xml-forms.service';
import { FormService } from '@mm-services/form.service';
import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { GeolocationService } from '@mm-services/geolocation.service';
import { TranslateService } from '@mm-services/translate.service';
import { PerformanceService } from '@mm-services/performance.service';
import { EnketoFormContext } from '@mm-services/enketo.service';

@Component({
  selector: 'training-cards-modal',
  templateUrl: './training-cards.component.html'
})
export class TrainingCardsComponent implements OnInit, OnDestroy {

  constructor(
    private ngZone: NgZone,
    private store: Store,
    private xmlFormsService: XmlFormsService,
    private formService: FormService,
    private geolocationService: GeolocationService,
    private translateService: TranslateService,
    private performanceService: PerformanceService,
    private matDialogRef: MatDialogRef<TrainingCardsComponent>,
  ) {
    this.globalActions = new GlobalActions(this.store);
  }

  static id = 'training-cards-modal';
  private geoHandle:any;
  private globalActions;
  private trackRender;
  private trackEditDuration;
  private trackSave;
  private trackMetadata = { action: '', form: '' };
  formNoTitle = false;
  form;
  trainingCardFormId;
  formWrapperId = 'training-cards-form';
  modalTitleKey = 'training_cards.modal.title';
  loadingContent;
  contentError;
  hideModalFooter;
  errorTranslationKey;
  enketoError;
  enketoStatus;
  enketoSaving;
  showConfirmExit;
  subscription: Subscription = new Subscription();

  ngOnInit() {
    this.trackRender = this.performanceService.track();
    this.reset();
    this.subscribeToStore();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.geoHandle?.cancel();
    // old code checked whether the component is reused before unloading the form
    // this is because AngularJS created the new "controller" before destroying the old one
    // in Angular, unless specific RouteReuseStrategies are employed, components are always
    // destroyed before new ones are created
    // see https://github.com/angular/angular/blob/10.2.x/packages/router/src/operators/activate_routes.ts#L37
    // for Angular behavior
    // see https://github.com/medic/cht-core/issues/2198#issuecomment-210202785 for AngularJS behavior
    this.formService.unload(this.form);
    this.globalActions.clearEnketoStatus();
  }

  private loadForm() {
    this.ngZone.runOutsideAngular(() => this._loadForm());
  }

  private async _loadForm() {
    try {
      this.loadingContent = true;
      this.hideModalFooter = true;
      this.geoHandle && this.geoHandle.cancel();
      this.geoHandle = this.geolocationService.init();
      const form = await this.xmlFormsService.get(this.trainingCardFormId);
      await this.ngZone.run(() => this.renderForm(form));
    } catch (error) {
      this.setError(error);
      console.error('Training Cards :: Error fetching form.', error);
    }
  }

  private async renderForm(formDoc) {
    try {
      const formContext = new EnketoFormContext(`#${this.formWrapperId}`, 'training-card', formDoc);
      formContext.isFormInModal = true;
      formContext.valuechangeListener = this.resetFormError.bind(this);

      this.form = await this.formService.render(formContext);
      this.formNoTitle = !formDoc?.title;
      this.loadingContent = false;
      this.recordPerformancePostRender();
    } catch (error) {
      this.setError(error);
      console.error('Training Cards :: Error rendering form.', error);
    }
  }

  private subscribeToStore() {
    const reduxSubscription = combineLatest([
      this.store.select(Selectors.getEnketoStatus),
      this.store.select(Selectors.getEnketoSavingStatus),
      this.store.select(Selectors.getEnketoError),
      this.store.select(Selectors.getTrainingCardFormId),
    ]).subscribe(([
      enketoStatus,
      enketoSaving,
      enketoError,
      trainingCardFormId,
    ]) => {
      this.enketoStatus = enketoStatus;
      this.enketoSaving = enketoSaving;
      this.enketoError = enketoError;

      if (trainingCardFormId && trainingCardFormId !== this.trainingCardFormId) {
        this.trainingCardFormId = trainingCardFormId;
        this.loadForm();
      }
    });
    this.subscription.add(reduxSubscription);
  }

  private reset() {
    this.resetFormError();
    this.contentError = false;
    this.trainingCardFormId = null;
    this.form = null;
    this.loadingContent = true;
    this.hideModalFooter = true;
  }

  private resetFormError() {
    if (this.enketoError) {
      this.globalActions.setEnketoError(null);
    }
  }

  setError(error) {
    this.errorTranslationKey = error?.translationKey || 'training_cards.error.loading';
    this.loadingContent = false;
    this.hideModalFooter = false;
    this.contentError = true;
  }

  close() {
    this.globalActions.setTrainingCardFormId(null);
    this.matDialogRef.close();
  }

  async saveForm() {
    if (this.enketoSaving) {
      console.debug('Attempted to call TrainingCardsComponent:saveForm more than once');
      return;
    }

    this.recordPerformancePreSave();
    this.globalActions.setEnketoSavingStatus(true);
    this.resetFormError();

    try {
      const docs = await this.formService.save(this.trainingCardFormId, this.form, this.geoHandle);
      console.debug('Saved form and associated docs', docs);
      const snackText = await this.translateService.get('training_cards.form.saved');
      this.globalActions.setSnackbarContent(snackText);
      this.globalActions.setEnketoSavingStatus(false);
      this.formService.unload(this.form);
      this.recordPerformancePostSave();
      this.close();

    } catch (error) {
      this.globalActions.setEnketoSavingStatus(false);
      console.error('Training Cards :: Error submitting form data.', error);
      const friendlyMessage = await this.translateService.get('training_cards.error.save');
      this.globalActions.setEnketoError(friendlyMessage);
    }
  }

  private recordPerformancePostRender() {
    this.trackMetadata.action = 'add';
    this.trackMetadata.form =  this.trainingCardFormId;
    this.trackRender?.stop({
      name: [ 'enketo', this.trackMetadata.form, this.trackMetadata.action, 'render' ].join(':')
    });
    this.trackEditDuration = this.performanceService.track();
  }

  private recordPerformancePreSave() {
    this.trackEditDuration?.stop({
      name: [ 'enketo', this.trackMetadata.form, this.trackMetadata.action, 'user_edit_time' ].join(':'),
    });
    this.trackSave = this.performanceService.track();
  }

  private recordPerformancePostSave() {
    this.trackSave?.stop({
      name: [ 'enketo', this.trackMetadata.form, this.trackMetadata.action, 'save' ].join(':'),
    });
  }

  private recordPerformanceQuitTraining() {
    this.trackEditDuration?.stop({
      name: [ 'enketo', this.trackMetadata.form, this.trackMetadata.action, 'quit' ].join(':'),
    });
  }

  confirmExit(confirm) {
    if (this.contentError) {
      this.close();
      return;
    }
    this.showConfirmExit = confirm;
  }

  quitTraining() {
    this.recordPerformanceQuitTraining();
    this.close();
  }
}
