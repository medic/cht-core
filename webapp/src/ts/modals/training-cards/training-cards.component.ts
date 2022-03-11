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
  subscription: Subscription = new Subscription();
  form;
  formInternalId;
  loadingContent;
  contentError;
  errorTranslationKey
  enketoError;
  enketoStatus;
  enketoSaving;

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

  private _loadForm() {
    this.loadingContent = true;
    this.geoHandle && this.geoHandle.cancel();
    this.geoHandle = this.geolocationService.init();
    this.xmlFormsService
      .get(this.formInternalId)
      .then(form => {
        console.warn('HOLA - hey look what I found: ', form); // Todo remove this
        return this.ngZone.run(() => this.renderForm(form));
      })
      .catch(error => {
        this.setError(error);
        console.error('Error fetching form.', error);
      });
  }

  private renderForm(form) {
    return this.enketoService
      .render(
        '#training-cards-form',
        form,
        undefined,
        undefined,
        this.resetFormError.bind(this),
      )
      .then(form => {
        this.form = form;
        this.loadingContent = false;
      })
      .then(() => {
        /* TODO
        this.telemetryData.postRender = Date.now();
        this.telemetryData.action = model.doc ? 'edit' : 'add';
        this.telemetryData.form = model.formInternalId;

        this.telemetryService.record(
          `enketo:reports:${this.telemetryData.form}:${this.telemetryData.action}:render`,
          this.telemetryData.postRender - this.telemetryData.preRender);
         */
      })
      .catch(error => {
        this.setError(error);
        console.error('Error loading form.', error);
      });
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
    this.formInternalId = 'pnc_danger_sign_follow_up_baby'; // Todo remove this default
    this.form = null;
    this.loadingContent = true;
  }

  private resetFormError() {
    if (this.enketoError) {
      this.globalActions.setEnketoError(null);
    }
  }

  setError(error) {
    this.errorTranslationKey = error.translationKey || 'error.loading.form';
    this.loadingContent = false;
    this.contentError = true;
  }

  submit() {
    // Todo this is on submit modal, do we need it?
    this.close();
    window.location.reload();
  }

  saveForm() {
    if (this.enketoSaving) {
      console.debug('Attempted to call TrainingCardsComponent:save more than once');
      return;
    }

    /** ToDo
    this.telemetryData.preSave = Date.now();
    this.telemetryService.record(
      `enketo:reports:${this.telemetryData.form}:${this.telemetryData.action}:user_edit_time`,
      this.telemetryData.preSave - this.telemetryData.postRender);
    */

    this.globalActions.setEnketoSavingStatus(true);
    this.resetFormError();

    return this.enketoService
      .save(this.formInternalId, this.form, this.geoHandle)
      .then(docs => {
        console.debug('Saved form and associated docs', docs);
        // Todo change this translation key
        this.globalActions.setSnackbarContent(this.translateService.instant('report.created'));
        this.globalActions.setEnketoSavingStatus(false);
        this.enketoService.unload(this.form);
      })
      .then(() => {
        /** todo
        this.telemetryData.postSave = Date.now();

        this.telemetryService.record(
          `enketo:tasks:${this.telemetryData.form}:${this.telemetryData.action}:save`,
          this.telemetryData.postSave - this.telemetryData.preSave);
        */
        // Todo close modal in all places that makes sense
      })
      .catch(error => {
        this.globalActions.setEnketoSavingStatus(false);
        console.error('Error submitting form data: ', error);
        this.translateService
          .get('error.report.save')
          .then(text => this.globalActions.setEnketoError(text));
      });
  }

  cancel() {
    // ToDo
  }
}
