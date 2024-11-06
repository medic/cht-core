import { Component, EventEmitter, Input, NgZone, OnDestroy, OnInit, Output } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';

import { XmlFormsService } from '@mm-services/xml-forms.service';
import { FormService } from '@mm-services/form.service';
import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { GeolocationService } from '@mm-services/geolocation.service';
import { TranslateService } from '@mm-services/translate.service';
import { PerformanceService } from '@mm-services/performance.service';
import { EnketoFormContext } from '@mm-services/enketo.service';
import { TranslateFromService } from '@mm-services/translate-from.service';

@Component({
  selector: 'training-cards-form',
  templateUrl: './training-cards-form.component.html',
})
export class TrainingCardsFormComponent implements OnInit, OnDestroy {
  @Input() isEmbedded = true;
  @Output() quit = new EventEmitter<boolean>();
  @Output() save = new EventEmitter<void>();
  @Output() handleError = new EventEmitter<void>();
  private geoHandle:any;
  private globalActions: GlobalActions;
  private trackRender;
  private trackEditDuration;
  private trackSave;
  private trackMetadata = { action: '', form: '' };
  readonly FORM_WRAPPER_ID = 'training-cards-form';
  trainingCardFormId: null | string = null;
  formNoTitle = false;
  form;
  loadingContent = true;
  contentError;
  errorTranslationKey;
  enketoError;
  enketoStatus;
  enketoSaving;
  subscriptions: Subscription = new Subscription();

  constructor(
    private readonly ngZone: NgZone,
    private readonly store: Store,
    private readonly xmlFormsService: XmlFormsService,
    private readonly formService: FormService,
    private readonly geolocationService: GeolocationService,
    private readonly translateService: TranslateService,
    private readonly performanceService: PerformanceService,
    private readonly translateFromService: TranslateFromService,
  ) {
    this.globalActions = new GlobalActions(this.store);
  }

  ngOnInit() {
    this.trackRender = this.performanceService.track();
    this.reset();
    this.subscribeToStore();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
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
    this.subscriptions.add(reduxSubscription);
  }

  private loadForm() {
    this.ngZone.runOutsideAngular(() => this._loadForm());
  }

  private async _loadForm() {
    try {
      this.loadingContent = true;
      this.geoHandle && this.geoHandle.cancel();
      this.geoHandle = this.geolocationService.init();
      const form = await this.xmlFormsService.get(this.trainingCardFormId);
      await this.ngZone.run(() => this.renderForm(form));
    } catch (error) {
      this.setError(error);
      console.error('Trainings Content Component :: Error fetching form.', error);
    }
  }

  private async renderForm(formDoc) {
    try {
      const formContext = new EnketoFormContext(`#${this.FORM_WRAPPER_ID}`, 'training-card', formDoc);
      formContext.isFormInModal = !this.isEmbedded;
      formContext.valuechangeListener = this.resetFormError.bind(this);

      this.form = await this.formService.render(formContext);
      this.formNoTitle = !formDoc?.title;
      this.setNavigationTitle(formDoc);
      this.showContent();
      this.recordPerformancePostRender();
    } catch (error) {
      this.setError(error);
      console.error('Trainings Content Component :: Error rendering form.', error);
    }
  }

  private showContent() {
    this.loadingContent = false;
    if (!this.isEmbedded) {
      return;
    }
    this.globalActions.setShowContent(true);
  }

  private setNavigationTitle(formDoc) {
    if (!this.isEmbedded) {
      return;
    }

    if (formDoc?.translation_key) {
      this.globalActions.setTitle(this.translateService.instant(formDoc.translation_key));
      return;
    }

    if (formDoc?.title) {
      this.globalActions.setTitle(this.translateFromService.get(formDoc?.title));
      return;
    }

    this.globalActions.setTitle(formDoc?.internalId);
  }

  private reset() {
    this.resetFormError();
    this.contentError = false;
    this.trainingCardFormId = null;
    this.form = null;
    this.loadingContent = true;
  }

  private resetFormError() {
    if (this.enketoError) {
      this.globalActions.setEnketoError(null);
    }
  }

  setError(error) {
    this.errorTranslationKey = error?.translationKey || 'training_cards.error.loading';
    this.contentError = true;
    this.handleError.emit();
    this.showContent();
  }

  async saveForm() {
    if (this.enketoSaving) {
      console.debug('Attempted to call TrainingsContentComponent.saveForm more than once');
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
      this.globalActions.unsetSelected();
      this.recordPerformancePostSave();
      this.save.emit();
    } catch (error) {
      this.globalActions.setEnketoSavingStatus(false);
      console.error('Trainings Content Component :: Error submitting form data.', error);
      const friendlyMessage = await this.translateService.get('training_cards.error.save');
      this.globalActions.setEnketoError(friendlyMessage);
    }
  }

  private recordPerformancePostRender() {
    this.trackMetadata.action = 'add';
    this.trackMetadata.form = this.trainingCardFormId!;
    this.trackRender?.stop({
      name: [ 'enketo', this.trackMetadata.form, this.trackMetadata.action, 'render' ].join(':'),
      recordApdex: true,
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
}
