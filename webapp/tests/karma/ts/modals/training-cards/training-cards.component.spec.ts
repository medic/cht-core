import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { expect } from 'chai';
import sinon from 'sinon';

import { TrainingCardsComponent } from '@mm-modals/training-cards/training-cards.component';
import { GeolocationService } from '@mm-services/geolocation.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { FormService } from '@mm-services/form.service';
import { TranslateService } from '@mm-services/translate.service';
import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { TelemetryService } from '@mm-services/telemetry.service';
import { FeedbackService } from '@mm-services/feedback.service';
import { ModalLayoutComponent } from '@mm-components/modal-layout/modal-layout.component';
import { PanelHeaderComponent } from '@mm-components/panel-header/panel-header.component';
import { EnketoComponent } from '@mm-components/enketo/enketo.component';

describe('TrainingCardsComponent', () => {
  let fixture: ComponentFixture<TrainingCardsComponent>;
  let component: TrainingCardsComponent;
  let store: MockStore;
  let geolocationService;
  let geoHandle;
  let xmlFormsService;
  let matDialogRef;
  let translateService;
  let formService;
  let globalActions;
  let telemetryService;
  let feedbackService;
  let consoleErrorMock;

  beforeEach(() => {
    consoleErrorMock = sinon.stub(console, 'error');
    geoHandle = { cancel: sinon.stub() };
    geolocationService = { init: sinon.stub().returns(geoHandle) };
    xmlFormsService = { get: sinon.stub().resolves() };
    matDialogRef = { close: sinon.stub() };
    translateService = {
      get: sinon.stub().resolvesArg(0),
      instant: sinon.stub().returnsArg(0),
    };
    formService = {
      unload: sinon.stub(),
      save: sinon.stub(),
      render: sinon.stub().resolves(),
    };
    telemetryService = { record: sinon.stub() };
    feedbackService = { submit: sinon.stub() };
    const mockedSelectors = [
      { selector: Selectors.getEnketoStatus, value: {} },
      { selector: Selectors.getEnketoSavingStatus, value: false },
      { selector: Selectors.getEnketoError, value: false },
      { selector: Selectors.getTrainingCardFormId, value: null },
    ];
    globalActions = {
      clearEnketoStatus: sinon.stub(GlobalActions.prototype, 'clearEnketoStatus'),
      setEnketoSavingStatus: sinon.stub(GlobalActions.prototype, 'setEnketoSavingStatus'),
      setEnketoError: sinon.stub(GlobalActions.prototype, 'setEnketoError'),
      setSnackbarContent: sinon.stub(GlobalActions.prototype, 'setSnackbarContent'),
    };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        declarations: [
          TrainingCardsComponent,
          ModalLayoutComponent,
          PanelHeaderComponent,
          EnketoComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: GeolocationService, useValue: geolocationService },
          { provide: XmlFormsService, useValue: xmlFormsService },
          { provide: TranslateService, useValue: translateService },
          { provide: FormService, useValue: formService },
          { provide: TelemetryService, useValue: telemetryService },
          { provide: FeedbackService, useValue: feedbackService },
          { provide: MatDialogRef, useValue: matDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: {} },
        ],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(TrainingCardsComponent);
        store = TestBed.inject(MockStore);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  });

  afterEach(() => sinon.restore());

  it('should create component', () => {
    expect(component).to.exist;
  });

  it('should close modal', () => {
    component.close();

    expect(matDialogRef.close.calledOnce).to.be.true;
  });

  it('should unsubscribe from everything, cancel geohandle and clear enketo form', fakeAsync(() => {
    const unsubscribeStub = sinon.stub(component.subscription, 'unsubscribe');

    store.overrideSelector(Selectors.getTrainingCardFormId, 'training:a_form_id');
    store.refreshState();
    tick();
    sinon.resetHistory();
    component.ngOnDestroy();
    tick();

    expect(unsubscribeStub.calledOnce).to.be.true;
    expect(geoHandle.cancel.calledOnce).to.be.true;
    expect(formService.unload.calledOnce).to.be.true;
    expect(globalActions.clearEnketoStatus.calledOnce).to.be.true;
  }));

  it('should close modal when quiting training', fakeAsync(() => {
    sinon.resetHistory();
    const xmlForm = { _id: 'training:a_form_id', some: 'content' };
    const renderedForm = { rendered: 'form', model: {}, instance: {} };
    xmlFormsService.get.resolves(xmlForm);
    formService.render.resolves(renderedForm);
    store.overrideSelector(Selectors.getTrainingCardFormId, 'training:a_form_id');
    store.refreshState();
    tick();

    component.quitTraining();

    expect(matDialogRef.close.calledOnce).to.be.true;
    expect(geolocationService.init.calledOnce).to.be.true;
    expect(xmlFormsService.get.calledOnce).to.be.true;
    expect(xmlFormsService.get.args[0]).to.deep.equal([ 'training:a_form_id' ]);
    expect(formService.render.calledOnce).to.be.true;
    expect(formService.render.args[0][0].formDoc).to.deep.equal(xmlForm);
    expect(component.form).to.equal(renderedForm);
    expect(consoleErrorMock.notCalled).to.be.true;
    expect(feedbackService.submit.notCalled).to.be.true;
    expect(telemetryService.record.callCount).to.equal(2);
    expect(telemetryService.record.args[0][0]).to.equal('enketo:training:a_form_id:add:render');
    expect(telemetryService.record.args[1][0]).to.equal('enketo:training:a_form_id:add:quit');
  }));

  describe('onInit', () => {
    it('should subscribe to redux and init component', () => {
      const AddSpy = sinon.spy(component.subscription, 'add');
      sinon.resetHistory();

      component.ngOnInit();

      expect(AddSpy.calledOnce).to.be.true;
      expect(component.contentError).to.be.false;
      expect(component.trainingCardFormId).to.be.null;
      expect(component.form).to.be.null;
      expect(component.loadingContent).to.be.true;
      expect(component.hideModalFooter).to.be.true;
    });

    it('should reset component', () => {
      component.contentError = true;
      component.trainingCardFormId = 'training:a_form_id';
      component.form = { the: 'rendered training form' };
      component.loadingContent = false;
      component.hideModalFooter = false;
      component.enketoError = 'some_error';
      sinon.resetHistory();

      component.ngOnInit();

      expect(globalActions.setEnketoError.calledOnce).to.be.true;
      expect(globalActions.setEnketoError.args[0]).to.deep.equal([ null ]);
      expect(component.contentError).to.be.false;
      expect(component.trainingCardFormId).to.be.null;
      expect(component.form).to.be.null;
      expect(component.loadingContent).to.be.true;
      expect(component.hideModalFooter).to.be.true;
    });
  });

  describe('saveForm', () => {
    it('should do nothing if already saving', fakeAsync(() => {
      const consoleDebugMock = sinon.stub(console, 'debug');
      component.enketoSaving = true;

      component.saveForm();
      tick();

      expect(consoleDebugMock.calledOnce).to.be.true;
      expect(consoleDebugMock.args[0]).to.deep.equal([
        'Attempted to call TrainingCardsComponent:saveForm more than once'
      ]);
      expect(formService.save.notCalled).to.be.true;
      expect(formService.unload.notCalled).to.be.true;
      expect(globalActions.setEnketoSavingStatus.notCalled).to.be.true;
      expect(globalActions.setSnackbarContent.notCalled).to.be.true;
      expect(globalActions.setEnketoError.notCalled).to.be.true;
      expect(matDialogRef.close.notCalled).to.be.true;
    }));

    it('should call enketo save, set content in snackbar and unload form', fakeAsync(() => {
      const consoleDebugMock = sinon.stub(console, 'debug');
      xmlFormsService.get.resolves({ _id: 'form:training:new_feature' });
      formService.save.resolves([{ _id: 'completed_training' }]);
      formService.render.resolves({
        _id: 'form:training:new_feature',
        pages: { activePages: [ { id: 'page-1' } ] },
      });

      store.overrideSelector(Selectors.getTrainingCardFormId, 'training:a_form_id');
      store.refreshState();
      tick();
      component.saveForm();
      tick();

      expect(formService.unload.calledOnce).to.be.true;
      expect(formService.unload.args[0]).to.deep.equal([{
        _id: 'form:training:new_feature',
        pages: { activePages: [ { id: 'page-1' } ] },
      }]);
      expect(formService.save.calledOnce).to.be.true;
      expect(formService.save.args[0]).to.deep.equal([
        'training:a_form_id',
        {
          _id: 'form:training:new_feature',
          pages: { activePages: [ { id: 'page-1' } ] },
        },
        geoHandle
      ]);
      expect(consoleDebugMock.callCount).to.equal(1);
      expect(consoleDebugMock.args[0]).to.deep.equal([
        'Saved form and associated docs',
        [{ _id: 'completed_training' }]
      ]);
      expect(globalActions.setEnketoSavingStatus.calledTwice).to.be.true;
      expect(globalActions.setEnketoSavingStatus.args).to.deep.equal([[ true ], [ false ]]);
      expect(globalActions.setSnackbarContent.calledOnce).to.be.true;
      expect(globalActions.setSnackbarContent.args[0]).to.deep.equal([ 'training_cards.form.saved' ]);
      expect(telemetryService.record.callCount).to.equal(3);
      expect(telemetryService.record.args[0][0]).to.equal('enketo:training:a_form_id:add:render');
      expect(telemetryService.record.args[1][0]).to.equal('enketo:training:a_form_id:add:user_edit_time');
      expect(telemetryService.record.args[2][0]).to.equal('enketo:training:a_form_id:add:save');
      expect(globalActions.setEnketoError.notCalled).to.be.true;
      expect(matDialogRef.close.calledOnce).to.be.true;
    }));

    it('should catch enketo saving error', fakeAsync(() => {
      sinon.resetHistory();
      xmlFormsService.get.resolves({ the: 'rendered training form' });
      formService.render.resolves({ the: 'rendered training form' });
      formService.save.rejects({ some: 'error' });
      store.overrideSelector(Selectors.getTrainingCardFormId, 'training:a_form_id');
      store.refreshState();
      tick();

      component.saveForm();
      tick();

      expect(formService.save.calledOnce).to.be.true;
      expect(formService.save.args[0]).to.deep.equal([
        'training:a_form_id',
        { the: 'rendered training form' },
        geoHandle
      ]);
      expect(consoleErrorMock.calledOnce).to.be.true;
      expect(consoleErrorMock.args[0]).to.deep.equal([
        'Training Cards :: Error submitting form data.',
        { some: 'error' }
      ]);
      expect(globalActions.setEnketoError.calledOnce).to.be.true;
      expect(globalActions.setEnketoError.args[0]).to.deep.equal([ 'training_cards.error.save' ]);
      expect(globalActions.setEnketoSavingStatus.calledTwice).to.be.true;
      expect(globalActions.setEnketoSavingStatus.args).to.deep.equal([[ true ], [ false ]]);
      expect(matDialogRef.close.notCalled).to.be.true;
      expect(globalActions.setSnackbarContent.notCalled).to.be.true;
    }));
  });

  describe('loadForm', () => {
    it('should load form', fakeAsync(() => {
      sinon.resetHistory();
      const xmlForm = { _id: 'training:a_form_id', some: 'content' };
      const renderedForm = { rendered: 'form', model: {}, instance: {} };
      xmlFormsService.get.resolves(xmlForm);
      formService.render.resolves(renderedForm);
      store.overrideSelector(Selectors.getTrainingCardFormId, 'training:a_form_id');
      store.refreshState();
      tick();

      expect(geolocationService.init.calledOnce).to.be.true;
      expect(xmlFormsService.get.calledOnce).to.be.true;
      expect(xmlFormsService.get.args[0]).to.deep.equal([ 'training:a_form_id' ]);
      expect(formService.render.calledOnce).to.be.true;
      expect(formService.render.args[0][0].formDoc).to.deep.equal(xmlForm);
      expect(component.form).to.equal(renderedForm);
      expect(consoleErrorMock.notCalled).to.be.true;
      expect(feedbackService.submit.notCalled).to.be.true;
      expect(telemetryService.record.calledOnce).to.be.true;
      expect(telemetryService.record.args[0][0]).to.equal('enketo:training:a_form_id:add:render');

      const resetFormError = formService.render.args[0][0].valuechangeListener;
      resetFormError();
      expect(globalActions.setEnketoError.notCalled).to.be.true; // No error so no call
      component.enketoError = 'some error';
      resetFormError();
      expect(globalActions.setEnketoError.calledOnce).to.be.true;
      expect(globalActions.setEnketoError.args[0]).to.deep.equal([ null ]);
    }));

    it('should reset geohandle on reload', fakeAsync(() => {
      store.overrideSelector(Selectors.getTrainingCardFormId, 'training:a_form_id');
      store.refreshState();
      tick();

      expect(geoHandle.cancel.notCalled).to.be.true;
      expect(geolocationService.init.calledOnce).to.be.true;

      store.overrideSelector(Selectors.getTrainingCardFormId, 'training:another_form_id');
      store.refreshState();
      tick();

      expect(geolocationService.init.calledTwice).to.be.true;
      expect(geoHandle.cancel.calledOnce).to.be.true;
    }));

    it('should catch form loading errors', fakeAsync(() => {
      xmlFormsService.get.rejects({ error: 'boom' });
      sinon.resetHistory();
      store.overrideSelector(Selectors.getTrainingCardFormId, 'training:a_form_id');
      store.refreshState();
      tick();

      expect(xmlFormsService.get.calledOnce).to.be.true;
      expect(formService.render.notCalled).to.be.true;
      expect(consoleErrorMock.calledOnce).to.be.true;
      expect(consoleErrorMock.args[0]).to.deep.equal([
        'Training Cards :: Error fetching form.',
        { error: 'boom' }
      ]);
      expect(component.errorTranslationKey).to.equal('training_cards.error.loading');
      expect(component.loadingContent).to.be.false;
      expect(component.hideModalFooter).to.be.false;
      expect(component.contentError).to.be.true;
    }));

    it('should catch enketo errors', fakeAsync(() => {
      xmlFormsService.get.resolves({ _id: 'training:a_form_id', some: 'content' });
      formService.render.rejects({ some: 'error' });
      sinon.resetHistory();
      store.overrideSelector(Selectors.getTrainingCardFormId, 'training:a_form_id');
      store.refreshState();
      tick();

      expect(xmlFormsService.get.calledOnce).to.be.true;
      expect(formService.render.calledOnce).to.be.true;
      expect(component.form).to.equal(null);
      expect(consoleErrorMock.calledOnce).to.be.true;
      expect(consoleErrorMock.args[0]).to.deep.equal([
        'Training Cards :: Error rendering form.',
        { some: 'error' }
      ]);
    }));
  });
});
