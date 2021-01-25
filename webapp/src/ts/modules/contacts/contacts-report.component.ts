import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { isEqual as _isEqual } from 'lodash-es';

import { ContactViewModelGeneratorService } from '@mm-services/contact-view-model-generator.service';
import { EnketoService } from '@mm-services/enketo.service';
import { GeolocationService } from '@mm-services/geolocation.service';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { TelemetryService } from '@mm-services/telemetry.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';

@Component({
  templateUrl: './contacts-report.component.html'
})
export class ContactsReportComponent implements OnInit, OnDestroy, AfterViewInit {
  private globalActions;
  private geoHandle:any;
  private routeSnapshot;
  private telemetryData:any = {
    preRender: Date.now()
  };

  subscription: Subscription = new Subscription();
  enketoEdited
  enketoStatus;
  enketoSaving;
  enketoError;
  selectedContact;
  form;
  loadingForm;
  errorTranslationKey;
  contentError;
  cancelCallback;

  constructor(
    private store: Store,
    private enketoService: EnketoService,
    private geolocationService: GeolocationService,
    private telemetryService: TelemetryService,
    private xmlFormsService: XmlFormsService,
    private translateFromService: TranslateFromService,
    private router: Router,
    private route: ActivatedRoute,
    private translateService: TranslateService,
    private contactViewModelGeneratorService: ContactViewModelGeneratorService,
  ){
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    this.subscribeToStore();
    this.subscribeToRoute();

    this.geoHandle = this.geolocationService.init();
    this.resetFormError();
    this.form = null;
    this.loadingForm = true;
    this.globalActions.setShowContent(true);
    this.setCancelCallback();
    this.globalActions.clearRightActionBar();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.geoHandle && this.geoHandle.cancel();
    this.enketoService.unload(this.form);
  }

  ngAfterViewInit() {
    this.render();
  }

  private getContact() {
    const id = this.routeSnapshot.params.id;
    if (!id) {
      return Promise.resolve();
    }
    return this.contactViewModelGeneratorService
      .getContact(id, { getChildPlaces: false, merge: true })
      .then((result) => result.doc);
  }

  private resetState() {
    this.loadingForm = true;

    if (!this.routeSnapshot.params?.id) {
      this.globalActions.unsetSelected();
      this.globalActions.settingSelected();
    }
  }

  private markFormEdited() {
    this.globalActions.setEnketoEditedStatus(true);
  }

  private resetFormError() {
    if (this.enketoError) {
      this.globalActions.setEnketoError(null);
    }
  }

  private render() {
    this.contentError = false;
    this.errorTranslationKey = false;

    return this
      .getContact()
      .then((contact) => {
        this.setCancelCallback();
        this.selectedContact = contact;
        return this.xmlFormsService.get(this.routeSnapshot.params.formId);
      })
      .then((form) => {
        this.globalActions.setEnketoEditedStatus(false);
        this.globalActions.setTitle(this.translateFromService.get(form.title));
        this.setCancelCallback();

        const instanceData = {
          source: 'contact',
          contact: this.selectedContact,
        };
        const markFormEdited = this.markFormEdited.bind(this);
        const resetFormError = this.resetFormError.bind(this);

        return this.enketoService.render(
          '#contact-report',
          form,
          instanceData,
          markFormEdited,
          resetFormError
        );
      })
      .then((formInstance) => {
        this.form = formInstance;
        this.loadingForm = false;
        this.telemetryData.postRender = Date.now();
        this.telemetryData.form = this.routeSnapshot.params.formId;

        this.telemetryService.record(
          `enketo:contacts:${this.telemetryData.form}:add:render`,
          this.telemetryData.postRender - this.telemetryData.preRender);
      })
      .catch(err => {
        console.error('Error loading form', err);
        this.errorTranslationKey = err.translationKey || 'error.loading.form';
        this.contentError = true;
        this.loadingForm = false;
      });
  }

  private subscribeToStore() {
    const reduxSubscription = combineLatest(
      this.store.select(Selectors.getEnketoStatus),
      this.store.select(Selectors.getEnketoSavingStatus),
      this.store.select(Selectors.getEnketoError),
      this.store.select(Selectors.getEnketoEditedStatus),
      this.store.select(Selectors.getCancelCallback),
    ).subscribe(([ enketoStatus, enketoSaving, enketoError, enketoEdited, cancelCallback]) => {
      this.enketoStatus = enketoStatus;
      this.enketoSaving = enketoSaving;
      this.enketoError = enketoError;
      this.enketoEdited = enketoEdited;
      this.cancelCallback = cancelCallback;
    });
    this.subscription.add(reduxSubscription);
  }

  private subscribeToRoute() {
    this.routeSnapshot = this.route.snapshot;
    this.resetState();

    const routeSubscription = this.route.params.subscribe((params) => {
      if (_isEqual(this.routeSnapshot.params, params)) {
        // the 1st time we load the form, we must wait for the view to be initialized
        // if we don't skip, it will result in the form being loaded twice
        return;
      }
      this.routeSnapshot = this.route.snapshot;
      this.resetState();
      this.resetFormError();
      this.render();
    });
    this.subscription.add(routeSubscription);
  }

  private setCancelCallback() {
    this.routeSnapshot = this.route.snapshot;
    if (this.routeSnapshot.params) {
      this.globalActions.setCancelCallback(() => {
        this.router.navigate(['/contacts', this.routeSnapshot?.params?.id || '']);
      });
    } else {
      this.globalActions.clearCancelCallback();
    }
  }

  navigationCancel() {
    this.globalActions.navigationCancel();
  }

  save() {
    if (this.enketoSaving) {
      console.debug('Attempted to call "contacts-report.save" more than once');
      return;
    }

    this.telemetryData.preSave = Date.now();
    this.telemetryService.record(
      `enketo:contacts:${this.telemetryData.form}:add:user_edit_time`,
      this.telemetryData.preSave - this.telemetryData.postRender);

    this.globalActions.setEnketoSavingStatus(true);
    this.resetFormError();
    this.enketoService
      .save(this.routeSnapshot.params.formId, this.form, this.geoHandle)
      .then((docs) => {
        console.debug('saved report and associated docs', docs);
        this.globalActions.setEnketoSavingStatus(false);
        this.globalActions.setSnackbarContent(this.translateService.instant('report.created'));
        this.globalActions.setEnketoEditedStatus(false);
        this.router.navigate(['/contacts', this.routeSnapshot.params.id]);
      })
      .then(() => {
        this.telemetryData.postSave = Date.now();

        this.telemetryService.record(
          `enketo:contacts:${this.telemetryData.form}:add:save`,
          this.telemetryData.postSave - this.telemetryData.preSave);
      })
      .catch((err) => {
        this.globalActions.setEnketoSavingStatus(false);
        console.error('Error submitting form data: ', err);
        this.globalActions.setEnketoError(this.translateService.instant('error.report.save'));
      });
  }
}
