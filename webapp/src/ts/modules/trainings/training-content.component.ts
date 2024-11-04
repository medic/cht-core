import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  selector: 'training-content',
  templateUrl: './training-content.component.html'
})
export class TrainingsContentComponent implements OnInit, OnDestroy {

  private geoHandle:any;
  private globalActions;
  private trackRender;
  private trackEditDuration;
  private trackSave;
  private trackMetadata = { action: '', form: '' };
  readonly FORM_WRAPPER_ID = 'training-cards-form';
  formNoTitle = false;
  form;
  trainingCardFormId: null | string = null;
  loadingContent = true;
  contentError;
  errorTranslationKey;
  enketoError;
  enketoStatus;
  enketoSaving;
  showConfirmExit = false;
  subscriptions: Subscription = new Subscription();
  isEmbedded = true;

  constructor(
    private readonly ngZone: NgZone,
    private readonly store: Store,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
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
    this.subscribeToRouteParams();
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
    this.globalActions.clearNavigation();
    this.globalActions.clearEnketoStatus();
  }

  private subscribeToRouteParams() {
    const routeSubscription = this.route.params.subscribe(params => {
      this.globalActions.setTrainingCard({ formId: params?.id });
      if (!params?.id) {
        this.loadingContent = false;
        this.globalActions.setShowContent(false);
      }
    });
    this.subscriptions.add(routeSubscription);
  }

  private subscribeToStore() {
    const reduxSubscription = combineLatest([
      this.store.select(Selectors.getEnketoStatus),
      this.store.select(Selectors.getEnketoSavingStatus),
      this.store.select(Selectors.getEnketoError),
      this.store.select(Selectors.getTrainingCardFormId),
      this.store.select(Selectors.getTrainingCard),
    ]).subscribe(([
      enketoStatus,
      enketoSaving,
      enketoError,
      trainingCardFormId,
      trainingCard,
    ]) => {
      this.enketoStatus = enketoStatus;
      this.enketoSaving = enketoSaving;
      this.enketoError = enketoError;
      this.showConfirmExit = trainingCard.showConfirmExit;

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
      formContext.isFormInModal = true; // ToDo fix this
      formContext.valuechangeListener = this.resetFormError.bind(this);

      this.form = await this.formService.render(formContext);
      this.formNoTitle = !formDoc?.title;  // ToDo fix this
      this.setNavigationTitle(formDoc);

      this.loadingContent = false;
      this.globalActions.setShowContent(true);
      this.recordPerformancePostRender();
    } catch (error) {
      this.setError(error);
      console.error('Trainings Content Component :: Error rendering form.', error);
    }
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
    this.loadingContent = false;
    this.contentError = true;
    this.globalActions.setShowContent(true);
  }

  close() {
    // TODO this.globalActions.setTrainingCard({ formId: null, isOpen: false, showConfirmExit: false, nextUrl: null });
    // ToDo this.matDialogRef.close();
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
      this.globalActions.clearNavigation();
      this.recordPerformancePostSave();
      this.close(); // ToDo fix
      this.router.navigate([ '/', 'trainings' ]);
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

  confirmExit(confirm) {
    if (this.contentError) {
      this.close();
      return;
    }
    this.showConfirmExit = confirm;
  }
}
