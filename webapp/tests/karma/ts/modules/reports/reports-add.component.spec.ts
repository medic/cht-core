import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { expect } from 'chai';
import sinon from 'sinon';

import { ReportsAddComponent } from '@mm-modules/reports/reports-add.component';
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
import { ComponentsModule } from '@mm-components/components.module';
import { EnketoComponent } from '@mm-components/enketo/enketo.component';
import { TelemetryService } from '@mm-services/telemetry.service';

describe('Reports Add Component', () => {
  let component:ReportsAddComponent;
  let fixture: ComponentFixture<ReportsAddComponent>;
  let dbService;
  let fileReaderService;
  let getReportContentService;
  let xmlFormsService;
  let lineageModelGeneratorService;
  let geolocationService;
  let geoHandle;
  let enketoService;
  let router;
  let route;

  beforeEach(waitForAsync(() => {
    dbService = { getAttachment: sinon.stub() };
    fileReaderService = { base64: sinon.stub() };
    getReportContentService = { getReportContent: sinon.stub().resolves() };
    xmlFormsService = { get: sinon.stub().resolves() };
    lineageModelGeneratorService = { report: sinon.stub().resolves({ doc: {} }) };
    geoHandle = { cancel: sinon.stub() };
    geolocationService = { init: sinon.stub().returns(geoHandle) };
    enketoService = {
      unload: sinon.stub(),
      save: sinon.stub(),
      render: sinon.stub().resolves(),
    };
    route = {
      snapshot: { params: { formId: 'a_form' } },
      params: new Subject(),
    };
    router = { navigate: sinon.stub() };

    const mockedSelectors = [
      { selector: Selectors.getLoadingContent, value: false },
      { selector: Selectors.getSelectedReports, value: [] },
      { selector: Selectors.getEnketoStatus, value: {} },
      { selector: Selectors.getEnketoSavingStatus, value: false },
      { selector: Selectors.getEnketoError, value: false },
    ];

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          ComponentsModule,
        ],
        declarations: [
          ReportsAddComponent,
          EnketoComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: DbService, useValue: { get: () => dbService }},
          { provide: FileReaderService, useValue: fileReaderService },
          { provide: GetReportContentService, useValue: getReportContentService },
          { provide: XmlFormsService, useValue: xmlFormsService },
          { provide: LineageModelGeneratorService, useValue: lineageModelGeneratorService },
          { provide: GeolocationService, useValue: geolocationService },
          { provide: EnketoService, useValue: enketoService },
          { provide: ActivatedRoute, useValue: route },
          { provide: Router, useValue: router },
          { provide: TelemetryService, useValue: { record: sinon.stub() }},
        ],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(ReportsAddComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create ReportsAddComponent', () => {
    expect(component).to.exist;
  });

  describe('onInit', () => {
    it('should subscribe to redux and route changes', () => {
      const spy = sinon.spy(component.subscription, 'add');
      component.ngOnInit();
      expect(spy.callCount).to.equal(2);
    });

    it('should set cancel callback when route loads a new report', () => {
      route.snapshot.params = { formId: 'some_form' };
      const setCancelCallback = sinon.stub(GlobalActions.prototype, 'setCancelCallback');
      const clearCancelCallback = sinon.stub(GlobalActions.prototype, 'clearNavigation');
      component.ngOnInit();
      expect(setCancelCallback.callCount).to.equal(1);
      expect(clearCancelCallback.callCount).to.equal(0);
      expect(router.navigate.callCount).to.equal(0);
      const callback = setCancelCallback.args[0][0];
      callback();
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/reports', '']]);
    });

    it('should set cancel callback when route loads an existent report', () => {
      route.snapshot.params = { reportId: 'report_id' };
      const setCancelCallback = sinon.stub(GlobalActions.prototype, 'setCancelCallback');
      const clearCancelCallback = sinon.stub(GlobalActions.prototype, 'clearNavigation');
      component.ngOnInit();
      expect(setCancelCallback.callCount).to.equal(1);
      expect(clearCancelCallback.callCount).to.equal(0);
      expect(router.navigate.callCount).to.equal(0);
      const callback = setCancelCallback.args[0][0];
      callback();
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/reports', 'report_id']]);
    });

    it('should clear cancel callback when no params', () => {
      route.snapshot.params = { };
      const setCancelCallback = sinon.stub(GlobalActions.prototype, 'setCancelCallback');
      const clearCancelCallback = sinon.stub(GlobalActions.prototype, 'clearNavigation');
      component.ngOnInit();
      expect(clearCancelCallback.callCount).to.equal(1);
      expect(setCancelCallback.callCount).to.deep.equal(0);
    });

    it('should reset enketo error if existent', () => {
      component.enketoError = 'some_error';
      const setEnketoError = sinon.stub(GlobalActions.prototype, 'setEnketoError');

      component.ngOnInit();
      expect(setEnketoError.callCount).to.equal(1);
      expect(setEnketoError.args[0]).to.deep.equal([null]);
    });

    it('route params subscription should not fire when params do not change', fakeAsync(() => {
      route.snapshot.params = { formId: 'some_form' };
      const openReportContentStub = sinon.stub(ReportsActions.prototype, 'openReportContent');
      const setEnketoErrorStub = sinon.stub(GlobalActions.prototype, 'setEnketoError');

      component.enketoError = 'some_error';
      route.params.next({ formId: 'some_form' });
      tick();
      expect(openReportContentStub.notCalled).to.be.true;
      expect(setEnketoErrorStub.notCalled).to.be.true;
    }));

    it('route params subscription should fire when params change', fakeAsync(() => {
      route.snapshot.params = { formId: 'some_form' };
      const openReportContentStub = sinon.stub(ReportsActions.prototype, 'openReportContent');
      const setEnketoErrorStub = sinon.stub(GlobalActions.prototype, 'setEnketoError');

      component.enketoError = 'some_error';
      route.params.next({ formId: 'otherform' });
      tick();
      expect(openReportContentStub.calledOnce).to.be.true;
      expect(setEnketoErrorStub.calledOnce).to.be.true;
      // the 2 count is because we've actually subscribed to the params change twice by calling ngOnInit manually
    }));
  });

  describe('loadForm', () => {
    describe('for new reports', () => {
      it('should load form', fakeAsync(() => {
        sinon.resetHistory();

        route.snapshot.params = { formId: 'my_form' };
        const openReportContentStub = sinon.stub(ReportsActions.prototype, 'openReportContent');
        getReportContentService.getReportContent.resolves();
        const xmlForm = { _id: 'my_form', some: 'content' };
        const renderedForm = { rendered: 'form', model: {}, instance: {} };
        xmlFormsService.get.resolves(xmlForm);
        enketoService.render.resolves(renderedForm);
        const setEnketoEditedStatusStub = sinon.stub(GlobalActions.prototype, 'setEnketoEditedStatus');
        const setEnketoErrorStub = sinon.stub(GlobalActions.prototype, 'setEnketoError');

        component.ngAfterViewInit();
        tick();

        expect(geolocationService.init.calledOnce).to.be.true;
        expect(openReportContentStub.calledOnce).to.be.true;
        expect(openReportContentStub.args[0]).to.deep.equal([{ formInternalId: 'my_form' }]);
        expect(getReportContentService.getReportContent.calledOnce).to.be.true;
        expect(getReportContentService.getReportContent.args[0]).to.deep.equal([undefined]);
        expect(xmlFormsService.get.calledOnce).to.be.true;
        expect(xmlFormsService.get.args[0]).to.deep.equal(['my_form']);
        expect(setEnketoEditedStatusStub.calledOnce).to.be.true;
        expect(setEnketoEditedStatusStub.args[0]).to.deep.equal([false]);
        expect(enketoService.render.calledOnce).to.be.true;
        expect(enketoService.render.args[0][0].formDoc).to.deep.equal(xmlForm);
        expect(component.form).to.equal(renderedForm);

        const markFormEdited = enketoService.render.args[0][0].editedListener;
        const resetFormError = enketoService.render.args[0][0].valuechangeListener;

        markFormEdited();
        expect(setEnketoEditedStatusStub.calledTwice).to.be.true;
        expect(setEnketoEditedStatusStub.args[1]).to.deep.equal([true]);

        resetFormError();
        expect(setEnketoErrorStub.notCalled).to.be.true; // no error so no call
        component.enketoError = 'some error';
        resetFormError();
        expect(setEnketoErrorStub.calledOnce).to.be.true;
        expect(setEnketoErrorStub.args[0]).to.deep.equal([null]);
      }));

      it('should reset geohandle on reload', fakeAsync(() => {
        expect(geoHandle.cancel.callCount).to.equal(0);
        expect(geolocationService.init.callCount).to.equal(1);
        component.ngAfterViewInit();
        tick();
        expect(geolocationService.init.callCount).to.equal(2);
        expect(geoHandle.cancel.callCount).to.equal(1);
      }));

      it('should catch form reading errors', fakeAsync(() => {
        const consoleErrorMock = sinon.stub(console, 'error');
        sinon.resetHistory();
        xmlFormsService.get.rejects({ error: 'boom' });

        component.ngAfterViewInit();
        tick();

        expect(xmlFormsService.get.callCount).to.equal(1);
        expect(enketoService.render.callCount).to.equal(0);
        expect(consoleErrorMock.callCount).to.equal(1);
        expect(consoleErrorMock.args[0][0]).to.equal('Error setting selected doc');
      }));

      it('should catch enketo errors', fakeAsync(() => {
        const consoleErrorMock = sinon.stub(console, 'error');
        sinon.resetHistory();
        getReportContentService.getReportContent.resolves();
        xmlFormsService.get.resolves({ _id: 'my_form', some: 'content' });
        enketoService.render.rejects({ some: 'error' });

        component.ngAfterViewInit();
        tick();

        expect(xmlFormsService.get.callCount).to.equal(1);
        expect(enketoService.render.callCount).to.equal(1);
        expect(component.form).to.equal(undefined);
        expect(consoleErrorMock.callCount).to.equal(1);
        expect(consoleErrorMock.args[0][0]).to.equal('Error loading form.');
      }));
    });

    describe('for existent reports', () => {
      // todo add tests here when migrating the final code about editing reports
    });
  });

  describe('save', () => {
    it('should do nothing if already saving', fakeAsync(() => {
      sinon.resetHistory();
      component.enketoSaving = true;
      component.save();
      tick();

      expect(enketoService.save.callCount).to.equal(0);
    }));

    it('should call enketo save and update state when new report', fakeAsync(() => {
      component.form = { the: 'rendered form' };
      component.selectedReport = { formInternalId: 'some_form' };

      const setEnketoSavingStatus = sinon.stub(GlobalActions.prototype, 'setEnketoSavingStatus');
      const setEnketoEditedStatus = sinon.stub(GlobalActions.prototype, 'setEnketoEditedStatus');
      const setEnketoError = sinon.stub(GlobalActions.prototype, 'setEnketoError');
      enketoService.save.resolves([{ _id: 'new_report' }]);

      component.save();
      expect(setEnketoSavingStatus.callCount).to.equal(1);
      expect(setEnketoSavingStatus.args[0]).to.deep.equal([true]);
      // nothing happened yet
      expect(setEnketoEditedStatus.callCount).to.equal(0);
      expect(router.navigate.callCount).to.equal(0);
      expect(enketoService.save.callCount).to.equal(1);
      expect(enketoService.save.args[0]).to.deep.equal([
        'some_form',
        { the: 'rendered form' },
        geoHandle,
        undefined, //no report id
      ]);

      tick();

      expect(setEnketoSavingStatus.callCount).to.equal(2);
      expect(setEnketoSavingStatus.args[1]).to.deep.equal([false]);
      expect(setEnketoEditedStatus.callCount).to.equal(1);
      expect(setEnketoEditedStatus.args[0]).to.deep.equal([false]);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/reports', 'new_report']]);
      expect(setEnketoError.callCount).to.equal(0);
    }));

    it('should catch enketo saving error', fakeAsync(() => {
      const consoleErrorMock = sinon.stub(console, 'error');
      component.form = { the: 'the form' };
      component.selectedReport = { formInternalId: 'delivery' };

      const setEnketoSavingStatus = sinon.stub(GlobalActions.prototype, 'setEnketoSavingStatus');
      const setEnketoEditedStatus = sinon.stub(GlobalActions.prototype, 'setEnketoEditedStatus');
      const setEnketoError = sinon.stub(GlobalActions.prototype, 'setEnketoError');
      enketoService.save.rejects({ some: 'error' });

      component.save();
      expect(setEnketoSavingStatus.callCount).to.equal(1);
      expect(setEnketoSavingStatus.args[0]).to.deep.equal([true]);
      // nothing happened yet
      expect(setEnketoEditedStatus.callCount).to.equal(0);
      expect(router.navigate.callCount).to.equal(0);
      expect(enketoService.save.callCount).to.equal(1);
      expect(enketoService.save.args[0]).to.deep.equal([
        'delivery',
        { the: 'the form' },
        geoHandle,
        undefined, //no report id
      ]);

      tick();

      expect(setEnketoSavingStatus.callCount).to.equal(2);
      expect(setEnketoSavingStatus.args[1]).to.deep.equal([false]);
      expect(setEnketoEditedStatus.callCount).to.equal(0);
      expect(router.navigate.callCount).to.equal(0);
      expect(setEnketoError.callCount).to.equal(1);
      expect(consoleErrorMock.callCount).to.equal(1);
      expect(consoleErrorMock.args[0][0]).to.equal('Error submitting form data: ');
    }));

    // todo add tests for editing existent reports when focusing on migrating that
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe from everything, cancel geohandle and clear enketo form', () => {
      sinon.resetHistory();
      const spy = sinon.stub(component.subscription, 'unsubscribe');
      component.ngOnDestroy();
      expect(spy.callCount).to.equal(1);
      expect(geoHandle.cancel.callCount).to.equal(1);
      expect(enketoService.unload.callCount).to.equal(1);
    });
  });

  it('navigationCancel should call correct action', () => {
    const navigationCancel = sinon.stub(GlobalActions.prototype, 'navigationCancel');
    component.navigationCancel();
    expect(navigationCancel.callCount).to.equal(1);
  });
});
