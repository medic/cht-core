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
import { FormService } from '@mm-services/form.service';
import { PerformanceService } from '@mm-services/performance.service';
import { TranslateService } from '@mm-services/translate.service';
import { EnketoFormContext } from '@mm-services/enketo.service';

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
    private formService:FormService,
    private translateService:TranslateService,
    private router:Router,
    private route:ActivatedRoute,
    private performanceService:PerformanceService,
    private ngZone:NgZone,
  ) {
    this.globalActions = new GlobalActions(this.store);
    this.reportsActions = new ReportsActions(this.store);
  }

  selectedReport;
  loadingContent;
  contentError;
  enketoError;
  enketoStatus;
  enketoSaving;
  enketoEdited;
  form;
  errorTranslationKey;
  cancelCallback;
  selectMode;

  private geoHandle:any;
  private globalActions: GlobalActions;
  private reportsActions: ReportsActions;
  private trackRender;
  private trackEditDuration;
  private trackSave;
  private trackMetadata = { action: '', form: '' };
  private routeSnapshot;

  private subscribeToStore() {
    const reduxSubscription = combineLatest(
      this.store.select(Selectors.getLoadingContent),
      this.store.select(Selectors.getSelectedReport),
      this.store.select(Selectors.getEnketoStatus),
      this.store.select(Selectors.getEnketoSavingStatus),
      this.store.select(Selectors.getEnketoError),
      this.store.select(Selectors.getCancelCallback),
      this.store.select(Selectors.getSelectMode),
    ).subscribe(([
      loadingContent,
      selectedReport,
      enketoStatus,
      enketoSaving,
      enketoError,
      cancelCallback,
      selectMode,
    ]) => {
      this.selectedReport = selectedReport;
      this.loadingContent = loadingContent;
      this.enketoStatus = enketoStatus;
      this.enketoEdited = enketoStatus.edited;
      this.enketoSaving = enketoSaving;
      this.enketoError = enketoError;
      this.cancelCallback = cancelCallback;
      this.selectMode = selectMode;
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
    this.trackRender = this.performanceService.track();
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
        this.reportsActions.openReportContent(model);
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

  private getAttachment(docId, attachmentName) {
    return this.dbService
      .get()
      .getAttachment(docId, attachmentName)
      .catch(e => {
        if (e.status === 404) {
          console.error(`Could not find attachment [${attachmentName}] on doc [${docId}].`);
        } else {
          throw e;
        }
      });
  }

  private async getAttachmentForElement(docId, $element) {
    const fileName = $element.data('loaded-file-name');
    if (fileName) {
      const attachmentName = `user-file-${fileName}`;
      const attachment = await this.getAttachment(docId, attachmentName);
      if (attachment) {
        return attachment;
      }
    }

    const legacyAttachmentName = `user-file${$element.attr('name')}`;
    return this.getAttachment(docId, legacyAttachmentName);
  }

  private renderAttachmentPreviews(model) {
    return Promise
      .resolve()
      .then(() => Promise
        .all($('#report-form input[type="file"]:not(.draw-widget__load)')
          .map(async (idx, element) => {
            const $element = $(element);
            const $picker = $element
              .closest('.question')
              .find('.widget.file-picker');

            $picker
              .find('.file-feedback')
              .empty();

            // Currently only support rendering image previews when editing reports
            // https://github.com/medic/cht-core/issues/9165
            if ($element.attr('accept') !== 'image/*') {
              return;
            }

            const attachmentBlob = await this.getAttachmentForElement(model.doc._id, $element);
            if (!attachmentBlob) {
              return;
            }

            const base64 = await this.fileReaderService.base64(attachmentBlob);

            const $preview = $picker.find('.file-preview');
            $preview.empty();
            $preview.append('<img src="data:' + base64 + '">');
          })));
  }

  private async renderForm(formDoc, reportContent, model) {
    const formContext = new EnketoFormContext('#report-form', 'report', formDoc, reportContent);
    formContext.editing = !!reportContent;
    formContext.editedListener = this.markFormEdited.bind(this);
    formContext.valuechangeListener = this.resetFormError.bind(this);

    try {
      const form = await this.formService.render(formContext);
      this.form = form;
      this.globalActions.setLoadingContent(false);
      if (model?.doc?._id) {
        await this.ngZone.runOutsideAngular(() => this.renderAttachmentPreviews(model));
      }
    } catch (err) {
      this.setError(err);
      console.error('Error loading form.', err);
    }

    this.trackMetadata.action = model.doc ? 'edit' : 'add';
    this.trackMetadata.form =  model.formInternalId;
    this.trackRender?.stop({
      name: [ 'enketo', 'reports', this.trackMetadata.form, this.trackMetadata.action, 'render' ].join(':'),
      recordApdex: true,
    });
    this.trackEditDuration = this.performanceService.track();
  }

  private setError(err) {
    this.errorTranslationKey = err.translationKey || 'error.loading.form';
    this.globalActions.setLoadingContent(false);
    this.contentError = true;
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.reportsActions.setSelectedReport();
    this.geoHandle && this.geoHandle.cancel();
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

    this.trackEditDuration?.stop({
      name: [ 'enketo', 'reports', this.trackMetadata.form, this.trackMetadata.action, 'user_edit_time' ].join(':'),
    });
    this.trackSave = this.performanceService.track();

    this.globalActions.setEnketoSavingStatus(true);
    this.resetFormError();
    const reportId = this.selectedReport?.doc?._id;
    const formInternalId = this.selectedReport?.formInternalId;

    return this.formService
      .save(formInternalId, this.form, this.geoHandle, reportId)
      .then((docs) => {
        console.debug('saved report and associated docs', docs);
        this.globalActions.setEnketoSavingStatus(false);
        const snackBarTranslationKey = this.routeSnapshot.params.reportId ? 'report.updated' : 'report.created';
        this.globalActions.setSnackbarContent(this.translateService.instant(snackBarTranslationKey));
        this.globalActions.setEnketoEditedStatus(false);
        this.router.navigate(['/reports', docs[0]._id]);
      })
      .then(() => {
        this.trackSave?.stop({
          name: [ 'enketo', 'reports', this.trackMetadata.form, this.trackMetadata.action, 'save' ].join(':'),
          recordApdex: true,
        });
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
