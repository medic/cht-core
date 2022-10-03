import { AfterViewInit, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { isEqual as _isEqual } from 'lodash-es';

import { DbService } from '@mm-services/db.service';
import { FileReaderService } from '@mm-services/file-reader.service';
import { GetReportContentService } from '@mm-services/get-report-content.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { Selectors } from '@mm-selectors/index';
import { GeolocationService } from '@mm-services/geolocation.service';
import { GlobalActions } from '@mm-actions/global';
import { ReportsActions } from '@mm-actions/reports';
import { EnketoService } from '@mm-services/enketo.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { TranslateService } from '@mm-services/translate.service';


@Component({
  templateUrl: './reports-add.component.html',
})
export class ReportsAddComponent implements OnInit, OnDestroy, AfterViewInit {
  subscription: Subscription = new Subscription();
  constructor(
    private store:Store,
    private dbService:DbService,
    private fileReaderService:FileReaderService,
    private geolocationService:GeolocationService,
    private getReportContentService:GetReportContentService,
    private lineageModelGeneratorService:LineageModelGeneratorService,
    private xmlFormsService:XmlFormsService,
    private enketoService:EnketoService,
    private translateService:TranslateService,
    private router:Router,
    private route:ActivatedRoute,
    private telemetryService:TelemetryService,
    private ngZone:NgZone,
  ) {
    this.globalActions = new GlobalActions(this.store);
    this.reportsActions = new ReportsActions(this.store);
  }

  selectedReports = [];
  loadingContent;
  contentError;
  enketoError;
  enketoStatus;
  enketoSaving;
  enketoEdited;
  form;
  errorTranslationKey;
  cancelCallback;
  selectModeActive;

  private geoHandle:any;
  private globalActions;
  private reportsActions;
  private telemetryData:any = {
    preRender: Date.now()
  };

  private routeSnapshot;

  private subscribeToStore() {
    const reduxSubscription = combineLatest(
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getSelectedReports),
      this.store.select(Selectors.getEnketoStatus),
      this.store.select(Selectors.getEnketoSavingStatus),
      this.store.select(Selectors.getEnketoError),
      this.store.select(Selectors.getCancelCallback),
      this.store.select(Selectors.getSelectMode),
    ).subscribe(([
      loadingContent,
      selectedReports,
      enketoStatus,
      enketoSaving,
      enketoError,
      cancelCallback,
      selectMode,
    ]) => {
      this.selectedReports = selectedReports;
      this.loadingContent = loadingContent;
      this.enketoStatus = enketoStatus;
      this.enketoEdited = enketoStatus.edited;
      this.enketoSaving = enketoSaving;
      this.enketoError = enketoError;
      this.cancelCallback = cancelCallback;
      this.selectModeActive = selectMode?.active;
    });
    this.subscription.add(reduxSubscription);
  }

  private subscribeToRoute() {
    const routeSubscription = this.route.params.subscribe((params) => {
      if (_isEqual(this.routeSnapshot.params, params)) {
        // the 1st time we load the form, we must wait for the view to be initialized
        // if we don't skip, it will result in the form being loaded twice
        return;
      }
      this.routeSnapshot = this.route.snapshot;
      this.reset();
      this.loadForm();
    });
    this.subscription.add(routeSubscription);
  }

  private setCancelCallback() {
    this.routeSnapshot = this.route.snapshot;
    if (this.routeSnapshot.params && (this.routeSnapshot.params.reportId || this.routeSnapshot.params.formId)) {
      const cancelCallback = (router:Router, routeSnapshot) => {
        router.navigate(['/reports', routeSnapshot?.params?.reportId || '']);
      };
      this.globalActions.setCancelCallback(cancelCallback.bind({}, this.router, this.routeSnapshot));
    } else {
      this.globalActions.clearNavigation();
    }
  }

  private reset() {
    this.resetFormError();
    this.contentError = false;
    this.globalActions.setLoadingContent(true);
  }

  ngOnInit() {
    this.reset();
    this.subscribeToStore();
    this.setCancelCallback();
    this.subscribeToRoute();
  }

  ngAfterViewInit() {
    this.loadForm();
  }

  private loadForm() {
    return this.ngZone.runOutsideAngular(() => this._loadForm());
  }

  private _loadForm() {
    return this
      .getSelected()
      .then((model:any) => {
        console.debug('setting selected', model);
        this.reportsActions.setSelected(model);
        this.globalActions.setLoadingContent(true);

        return Promise
          .all([
            this.getReportContentService.getReportContent(model?.doc),
            this.xmlFormsService.get(model?.formInternalId)
          ])
          .then(([ reportContent, form ]) => {
            this.globalActions.setEnketoEditedStatus(false);

            return this.ngZone.run(() => this.renderForm(form, reportContent, model));
          });
      })
      .catch((err) => {
        this.setError(err);
        console.error('Error setting selected doc', err);
      });
  }

  private renderAttachmentPreviews(model) {
    return Promise
      .resolve()
      .then(() => Promise
        .all($('#report-form input[type=file]')
          .map((idx, element) => {
            const $element = $(element);
            const attachmentName = 'user-file' + $element.attr('name');

            return this.dbService
              .get()
              .getAttachment(model.doc._id, attachmentName)
              .then(blob => this.fileReaderService.base64(blob))
              .then((base64) => {
                const $picker = $element
                  .closest('.question')
                  .find('.widget.file-picker');

                $picker.find('.file-feedback').empty();

                const $preview = $picker.find('.file-preview');
                $preview.empty();
                $preview.append('<img src="data:' + base64 + '">');
              });
          })));
  }

  private renderForm(form, reportContent, model) {
    return this.enketoService
      .render(
        '#report-form',
        form,
        reportContent,
        this.markFormEdited.bind(this),
        this.resetFormError.bind(this),
      )
      .then((form) => {
        this.form = form;
        this.globalActions.setLoadingContent(false);
        if (!model.doc || !model.doc._id) {
          return;
        }

        return this.ngZone.runOutsideAngular(() => this.renderAttachmentPreviews(model));
      })
      .then(() => {
        this.telemetryData.postRender = Date.now();
        this.telemetryData.action = model.doc ? 'edit' : 'add';
        this.telemetryData.form = model.formInternalId;

        this.telemetryService.record(
          `enketo:reports:${this.telemetryData.form}:${this.telemetryData.action}:render`,
          this.telemetryData.postRender - this.telemetryData.preRender);
      })
      .catch((err) => {
        this.setError(err);
        console.error('Error loading form.', err);
      });
  }

  private setError(err) {
    this.errorTranslationKey = err.translationKey || 'error.loading.form';
    this.globalActions.setLoadingContent(false);
    this.contentError = true;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.reportsActions.setSelectedReports([]);
    this.geoHandle && this.geoHandle.cancel();
    // old code checked whether the component is reused before unloading the form
    // this is because AngularJS created the new "controller" before destroying the old one
    // in Angular, unless specific RouteReuseStrategies are employed, components are always
    // destroyed before new ones are created
    // see https://github.com/angular/angular/blob/10.2.x/packages/router/src/operators/activate_routes.ts#L37
    // for Angular behavior
    // see https://github.com/medic/cht-core/issues/2198#issuecomment-210202785 for AngularJS behavior
    this.enketoService.unload(this.form);
    this.globalActions.clearNavigation();
    this.globalActions.clearEnketoStatus();
  }

  private getSelected() {
    this.geoHandle && this.geoHandle.cancel();
    this.geoHandle = this.geolocationService.init();

    if (this.routeSnapshot.params.formId) { // adding
      return Promise.resolve({
        formInternalId: this.routeSnapshot.params.formId,
      });
    }

    if (this.routeSnapshot.params.reportId) { // editing
      return this.lineageModelGeneratorService
        .report(this.routeSnapshot.params.reportId)
        .then((result) => {
          return {
            doc: result.doc,
            formInternalId: result.doc && result.doc.form
          };
        });
    }

    return Promise.reject(new Error('Must have either formId or reportId'));
  }

  private markFormEdited() {
    this.globalActions.setEnketoEditedStatus(true);
  }

  private resetFormError() {
    if (this.enketoError) {
      this.globalActions.setEnketoError(null);
    }
  }

  save() {
    if (this.enketoSaving) {
      console.debug('Attempted to call reports-add.component:save more than once');
      return;
    }

    this.telemetryData.preSave = Date.now();
    this.telemetryService.record(
      `enketo:reports:${this.telemetryData.form}:${this.telemetryData.action}:user_edit_time`,
      this.telemetryData.preSave - this.telemetryData.postRender);

    this.globalActions.setEnketoSavingStatus(true);
    this.resetFormError();
    const model = this.selectedReports[0];
    const reportId = model?.doc?._id;
    const formInternalId = model?.formInternalId;

    return this.enketoService
      .save(formInternalId, this.form, this.geoHandle, reportId)
      .then((docs) => {
        console.debug('saved report and associated docs', docs);
        this.globalActions.setEnketoSavingStatus(false);
        const snackBarTranslationKey = this.routeSnapshot.params.reportId ? 'report.updated' : 'report.created';
        this.globalActions.setSnackbarContent(this.translateService.instant(snackBarTranslationKey));
        this.globalActions.setEnketoEditedStatus(false);
        this.router.navigate(['/reports', docs[0]._id]);

        this.telemetryData.postSave = Date.now();
        this.telemetryService.record(
          `enketo:reports:${this.telemetryData.form}:${this.telemetryData.action}:save`,
          this.telemetryData.postSave - this.telemetryData.preSave);
      })
      .catch((err) => {
        this.globalActions.setEnketoSavingStatus(false);
        console.error('Error submitting form data: ', err);
        this.translateService
          .get('error.report.save')
          .then(msg => {
            this.globalActions.setEnketoError(msg);
          });
      });
  }

  navigationCancel() {
    this.globalActions.navigationCancel();
  }
}
