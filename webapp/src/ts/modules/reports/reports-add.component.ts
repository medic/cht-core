import { Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
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


@Component({
  templateUrl: './reports-add.component.html',
})
export class ReportsAddComponent implements OnInit, OnDestroy{
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
  form;
  errorTranslationKey;

  private geoHandle:any;
  private globalActions;
  private reportsActions;
  private telemetryData:any = {
    preRender: Date.now()
  };
  private routeSnapshot;

  ngOnInit() {
    const reduxSubscription = combineLatest(
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getSelectedReports),
      this.store.select(Selectors.getEnketoStatus),
      this.store.select(Selectors.getEnketoSavingStatus),
      this.store.select(Selectors.getEnketoError),
    ).subscribe(([
      loadingContent,
      selectedReports,
      enketoStatus,
      enketoSaving,
      enketoError,
    ]) => {
      this.selectedReports = selectedReports;
      this.loadingContent = loadingContent;
      this.enketoStatus = enketoStatus;
      this.enketoSaving = enketoSaving;
      this.enketoError = enketoError;
    });
    this.subscription.add(reduxSubscription);

    this.globalActions.setLoadingContent(true);
    this.contentError = false;
    this.routeSnapshot = this.route.snapshot;

    if (this.routeSnapshot.params && (this.routeSnapshot.params.reportsId || this.routeSnapshot.params.formId)) {
      this.globalActions.setCancelCallback(() => {
        // Note : if no $state.params.reportId, goes to "No report selected".
        this.router.navigate(['/reports', this.routeSnapshot.params.reportsId]);
      });
    } else {
      this.globalActions.clearCancelCallback();
    }

    this.resetFormError();

    const routeSubscription = this.route.params.subscribe((params) => {
      if (_isEqual(this.routeSnapshot.params, params)) {
        // the 1st time we load the form, we must wait for the view to be initialized
        // if we don't skip, it will result in the form being loaded twice
        return;
      }
      this.routeSnapshot = this.route.snapshot;
      this.loadForm();
    });
    this.subscription.add(routeSubscription);
  }

  ngAfterViewInit() {
    this.loadForm();
  }

  private loadForm() {
    this
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
            console.log('future wrapper', $('#report-form'));

            this.enketoService
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
              })
              .then(() => {
                if (!model.doc || !model.doc._id) {
                  return;
                }

                const $component = this;
                return Promise
                  .all($('#report-form input[type=file]')
                    .map(function() {
                      const $this = $(this);
                      const attachmentName = 'user-file' + $this.attr('name');

                      return $component.dbService
                        .get()
                        .getAttachment(model.doc._id, attachmentName)
                        .then(blob => $component.fileReaderService.base64(blob))
                        .then((base64) => {
                          const $picker = $this.closest('.question')
                            .find('.widget.file-picker');

                          $picker.find('.file-feedback').empty();

                          const $preview = $picker.find('.file-preview');
                          $preview.empty();
                          $preview.append('<img src="data:' + base64 + '">');
                        });
                    }));
              })
              .then(() => {
                this.telemetryData.postRender = Date.now();
                this.telemetryData.action = model.doc ? 'edit' : 'add';
                this.telemetryData.form = model.formInternalId;
                // todo telemetry
                /*
                 Telemetry.record(
                 `enketo:reports:${telemetryData.form}:${telemetryData.action}:render`,
                 telemetryData.postRender - telemetryData.preRender);
                 */
              })
              .catch((err) => {
                this.errorTranslationKey = err.translationKey || 'error.loading.form';
                this.globalActions.setLoadingContent(false);
                this.contentError = true;
                console.error('Error loading form.', err);
              });
          });
      })
      .catch((err) => {
        this.globalActions.setLoadingContent(false);
        console.error('Error setting selected doc', err);
      });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.geoHandle && this.geoHandle.cancel();
    // todo evaluate if checking for current route snapshot is still necessary.
    // is there a case where this component is destroyed but we want to keep the enketo form in memory?
    this.enketoService.unload(this.form);
    /*if (!$state.includes('reports.add') && !$state.includes('reports.edit')) {
      Enketo.unload(ctrl.form);
    }*/
  }

  getSelected() {
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
  };

  private resetFormError() {
    if (this.enketoError) {
      this.globalActions.setEnketoError(null);
    }
  }

  save() {
    if (this.enketoSaving) {
      console.debug('Attempted to call reports-add:$scope.save more than once');
      return;
    }

    this.telemetryData.preSave = Date.now();
    // todo
    /*
    Telemetry.record(
      `enketo:reports:${telemetryData.form}:${telemetryData.action}:user_edit_time`,
      telemetryData.preSave - telemetryData.postRender);*/

    this.globalActions.setEnketoSavingStatus(true);
    this.resetFormError();
    const model = this.selectedReports[0];
    const reportId = model.doc && model.doc._id;
    const formInternalId = model.formInternalId;

    this.enketoService
      .save(formInternalId, this.form, this.geoHandle, reportId)
      .then((docs) => {
        console.debug('saved report and associated docs', docs);
        this.globalActions.setEnketoSavingStatus(false);
        // todo
        this.globalActions.setSnackbarContent(true ? 'report.updated' : 'report.created');
        // todo
        this.globalActions.setEnketoEditedStatus(false);
        console.log('redirecting!');
        this.router.navigate(['/reports', docs[0]._id]);
      })
      .then(() => {
        this.telemetryData.postSave = Date.now();
        /*
        Telemetry.record(
          `enketo:reports:${telemetryData.form}:${telemetryData.action}:save`,
          telemetryData.postSave - telemetryData.preSave);*/
      })
      .catch((err) => {
        this.globalActions.setEnketoSavingStatus(false);
        console.error('Error submitting form data: ', err);
        this.translateService.get('error.report.save').toPromise().then(msg => {
          this.globalActions.setEnketoError(msg);
        });
      });
  }

  navigationCancel() {
    this.globalActions.navigationCancel();
  }
}

