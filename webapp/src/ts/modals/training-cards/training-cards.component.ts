import { AfterViewInit, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';

import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { EnketoService } from '@mm-services/enketo.service';
import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { GeolocationService } from '@mm-services/geolocation.service';
import { TranslateService } from '@mm-services/translate.service';

@Component({
  selector: 'training-cards-modal',
  templateUrl: './training-cards.component.html'
})
export class TrainingCardsComponent extends MmModalAbstract implements OnInit, AfterViewInit, OnDestroy {

  constructor(
    bsModalRef: BsModalRef,
    private ngZone: NgZone,
    private store: Store,
    private xmlFormsService: XmlFormsService,
    private enketoService: EnketoService,
    private geolocationService: GeolocationService,
    private translateService: TranslateService,
  ) {
    super(bsModalRef);
    this.globalActions = new GlobalActions(this.store);
  }

  static id = 'training-cards-modal';
  private geoHandle:any;
  private globalActions;
  form;
  formInternalId;
  formWrapperId = 'training-cards-form';
  modalTitleKey = 'training_cards.modal.title';
  loadingContent;
  contentError;
  hideModalFooter;
  errorTranslationKey
  enketoError;
  enketoStatus;
  enketoSaving;
  subscription: Subscription = new Subscription();

  ngOnInit() {
    // todo this.telemetryData = { preRender: Date.now() };
    this.reset();
    this.subscribeToStore();
  }

  ngAfterViewInit() {
    this.loadForm();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.geoHandle && this.geoHandle.cancel();
    // old code checked whether the component is reused before unloading the form
    // this is because AngularJS created the new "controller" before destroying the old one
    // in Angular, unless specific RouteReuseStrategies are employed, components are always
    // destroyed before new ones are created
    // see https://github.com/angular/angular/blob/10.2.x/packages/router/src/operators/activate_routes.ts#L37
    // for Angular behavior
    // see https://github.com/medic/cht-core/issues/2198#issuecomment-210202785 for AngularJS behavior
    this.enketoService.unload(this.form);
    this.globalActions.clearEnketoStatus();
  }

  private loadForm() {
    return this.ngZone.runOutsideAngular(() => this._loadForm());
  }

  private async _loadForm() {
    try {
      this.loadingContent = true;
      this.hideModalFooter = true;
      this.geoHandle && this.geoHandle.cancel();
      this.geoHandle = this.geolocationService.init();
      const form = await this.xmlFormsService.get(this.formInternalId);
      return this.ngZone.run(() => this.renderForm(form));
    } catch(error) {
      this.setError();
      console.error('Error fetching form.', error);
    }
  }

  private async renderForm(form) {
    try {
      const selector = `#${this.formWrapperId}`;
      this.form = await this.enketoService.render(selector, form, undefined, undefined, this.resetFormError.bind(this));
      this.loadingContent = false;
      this.recordTelemetryPostRender();
    } catch(error) {
      this.setError();
      console.error('Error rendering form.', error);
    }
  }

  private subscribeToStore() {
    const reduxSubscription = combineLatest(
      this.store.select(Selectors.getEnketoStatus),
      this.store.select(Selectors.getEnketoSavingStatus),
      this.store.select(Selectors.getEnketoError),
    ).subscribe(([
      enketoStatus,
      enketoSaving,
      enketoError,
    ]) => {
      this.enketoStatus = enketoStatus;
      this.enketoSaving = enketoSaving;
      this.enketoError = enketoError;
    });
    this.subscription.add(reduxSubscription);
  }

  private reset() {
    this.resetFormError();
    this.contentError = false;
    this.formInternalId = null;
    this.form = null;
    this.loadingContent = true;
    this.hideModalFooter = true;
  }

  private resetFormError() {
    if (this.enketoError) {
      this.globalActions.setEnketoError(null);
    }
  }

  setError() {
    this.errorTranslationKey = 'training_cards.error.loading';
    this.loadingContent = false;
    this.hideModalFooter = false;
    this.contentError = true;
  }

  async saveForm() {
    if (this.enketoSaving) {
      console.debug('Attempted to call TrainingCardsComponent:saveForm more than once');
      return;
    }

    this.recordTelemetryPreSave();
    this.globalActions.setEnketoSavingStatus(true);
    this.resetFormError();

    try {
      const docs = await this.enketoService.save(this.formInternalId, this.form, this.geoHandle);
      console.debug('Saved form and associated docs', docs);
      this.globalActions.setSnackbarContent(this.translateService.instant('training_cards.form.saved'));
      this.globalActions.setEnketoSavingStatus(false);
      this.enketoService.unload(this.form);
      this.recordTelemetryPostSave();
      this.close();

    } catch(error) {
      this.globalActions.setEnketoSavingStatus(false);
      console.error('Error submitting form data: ', error);
      const message = await this.translateService.get('training_cards.error.save');
      this.globalActions.setEnketoError(message);
    }
  }

  private recordTelemetryPostRender() {
    /* TODO telemetry
        this.telemetryData.postRender = Date.now();
        this.telemetryData.action = model.doc ? 'edit' : 'add';
        this.telemetryData.form = model.formInternalId;

        this.telemetryService.record(
          `enketo:reports:${this.telemetryData.form}:${this.telemetryData.action}:render`,
          this.telemetryData.postRender - this.telemetryData.preRender);
    */
  }

  private recordTelemetryPreSave() {
    /** ToDo telemetry
     this.telemetryData.preSave = Date.now();
     this.telemetryService.record(
     `enketo:reports:${this.telemetryData.form}:${this.telemetryData.action}:user_edit_time`,
     this.telemetryData.preSave - this.telemetryData.postRender);
     */
  }

  private recordTelemetryPostSave() {
    /** todo telemetry
     this.telemetryData.postSave = Date.now();

     this.telemetryService.record(
     `enketo:tasks:${this.telemetryData.form}:${this.telemetryData.action}:save`,
     this.telemetryData.postSave - this.telemetryData.preSave);
     */
  }

  cancel() {
    this.close();
  }
}
