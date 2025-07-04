import { AfterViewInit, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { isEqual as _isEqual } from 'lodash-es';

import { ContactViewModelGeneratorService } from '@mm-services/contact-view-model-generator.service';
import { FormService, WebappEnketoFormContext } from '@mm-services/form.service';
import { GeolocationService } from '@mm-services/geolocation.service';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { PerformanceService } from '@mm-services/performance.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { TranslateService } from '@mm-services/translate.service';
import { NgIf } from '@angular/common';
import { EnketoComponent } from '@mm-components/enketo/enketo.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  templateUrl: './contacts-report.component.html',
  imports: [NgIf, EnketoComponent, TranslatePipe]
})
export class ContactsReportComponent implements OnInit, OnDestroy, AfterViewInit {
  private globalActions;
  private geoHandle: any;
  private routeSnapshot;
  private trackRender;
  private trackEditDuration;
  private trackSave;
  private trackMetadata = { form: '' };

  subscription: Subscription = new Subscription();
  enketoEdited;
  enketoStatus;
  enketoSaving;
  enketoError;
  form;
  loadingForm;
  errorTranslationKey;
  contentError;
  cancelCallback;

  constructor(
    private store: Store,
    private formService: FormService,
    private geolocationService: GeolocationService,
    private performanceService: PerformanceService,
    private xmlFormsService: XmlFormsService,
    private translateFromService: TranslateFromService,
    private router: Router,
    private route: ActivatedRoute,
    private translateService: TranslateService,
    private contactViewModelGeneratorService: ContactViewModelGeneratorService,
    private ngZone: NgZone,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    this.trackRender = this.performanceService.track();
    this.subscribeToStore();
    this.subscribeToRoute();

    this.geoHandle = this.geolocationService.init();
    this.resetFormError();
    this.form = null;
    this.loadingForm = true;
    this.globalActions.setShowContent(true);
    this.setCancelCallback();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.geoHandle && this.geoHandle.cancel();
    this.formService.unload(this.form);
    this.globalActions.clearNavigation();
    this.globalActions.clearEnketoStatus();
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

  private _getContactAndForm() {
    return Promise
      .all([
        this.getContact(),
        this.xmlFormsService.get(this.routeSnapshot.params?.formId),
      ]);
  }

  private getContactAndForm() {
    return this.ngZone.runOutsideAngular(() => this._getContactAndForm());
  }

  private render() {
    this.contentError = false;
    this.errorTranslationKey = false;

    return this
      .getContactAndForm()
      .then(([ contact, formDoc ]) => {
        this.globalActions.setEnketoEditedStatus(false);
        this.globalActions.setTitle(this.translateFromService.get(formDoc.title));
        this.setCancelCallback();

        const formContext = new WebappEnketoFormContext(
          '#contact-report',
          'report',
          formDoc,
          { source: 'contact', contact }
        );
        formContext.editedListener = this.markFormEdited.bind(this);
        formContext.valuechangeListener = this.resetFormError.bind(this);

        return this.formService.render(formContext);
      })
      .then((formInstance) => {
        this.form = formInstance;
        this.loadingForm = false;
        this.trackMetadata.form = this.routeSnapshot.params.formId;
        this.trackRender?.stop({
          name: [ 'enketo', 'contacts', this.trackMetadata.form, 'add', 'render' ].join(':'),
          recordApdex: true,
        });
        this.trackEditDuration = this.performanceService.track();
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
      const cancelCallback = (router, contactId) => {
        router.navigate(['/contacts', contactId || '']);
      };
      this.globalActions.setCancelCallback(cancelCallback.bind({}, this.router, this.routeSnapshot?.params?.id));
    } else {
      this.globalActions.clearNavigation();
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

    this.trackEditDuration?.stop({
      name: [ 'enketo', 'contacts', this.trackMetadata.form, 'add', 'user_edit_time' ].join(':'),
    });
    this.trackSave = this.performanceService.track();

    this.globalActions.setEnketoSavingStatus(true);
    this.resetFormError();
    this.formService
      .save(this.routeSnapshot.params.formId, this.form, this.geoHandle)
      .then((docs) => {
        console.debug('saved report and associated docs', docs);
        this.globalActions.setEnketoSavingStatus(false);
        this.globalActions.setSnackbarContent(this.translateService.instant('report.created'));
        this.globalActions.setEnketoEditedStatus(false);
        this.trackSave?.stop({
          name: [ 'enketo', 'contacts', this.trackMetadata.form, 'add', 'save' ].join(':'),
          recordApdex: true,
        });

        this.router.navigate(['/contacts', this.routeSnapshot.params.id]);
      })
      .catch((err) => {
        this.globalActions.setEnketoSavingStatus(false);
        console.error('Error submitting form data: ', err);
        this.globalActions.setEnketoError(this.translateService.instant('error.report.save'));
      });
  }
}
