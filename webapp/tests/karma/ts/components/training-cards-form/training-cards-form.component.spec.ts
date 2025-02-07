import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { GeolocationService } from '@mm-services/geolocation.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { FormService } from '@mm-services/form.service';
import { TranslateService } from '@mm-services/translate.service';
import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { PerformanceService } from '@mm-services/performance.service';
import { FeedbackService } from '@mm-services/feedback.service';
import { ModalLayoutComponent } from '@mm-components/modal-layout/modal-layout.component';
import { PanelHeaderComponent } from '@mm-components/panel-header/panel-header.component';
import { EnketoComponent } from '@mm-components/enketo/enketo.component';
import { TrainingCardsFormComponent } from '@mm-components/training-cards-form/training-cards-form.component';

describe('TrainingCardsFormComponent', () => {
  let fixture: ComponentFixture<TrainingCardsFormComponent>;
  let component: TrainingCardsFormComponent;
  let store: MockStore;
  let geolocationService;
  let geoHandle;
  let xmlFormsService;
  let translateService;
  let formService;
  let globalActions;
  let feedbackService;
  let consoleErrorMock;
  let performanceService;
  let stopPerformanceTrackStub;

  beforeEach(() => {
    consoleErrorMock = sinon.stub(console, 'error');
    geoHandle = { cancel: sinon.stub() };
    geolocationService = { init: sinon.stub().returns(geoHandle) };
    xmlFormsService = { get: sinon.stub().resolves() };
    translateService = {
      get: sinon.stub().resolvesArg(0),
      instant: sinon.stub().returnsArg(0),
    };
    formService = {
      unload: sinon.stub(),
      save: sinon.stub(),
      render: sinon.stub().resolves(),
    };
    feedbackService = { submit: sinon.stub() };
    const mockedSelectors = [
      { selector: Selectors.getEnketoStatus, value: {} },
      { selector: Selectors.getEnketoSavingStatus, value: false },
      { selector: Selectors.getEnketoError, value: false },
      { selector: Selectors.getTrainingCardFormId, value: null },
      { selector: Selectors.getTrainingCard, value: {} },
    ];
    globalActions = {
      clearEnketoStatus: sinon.stub(GlobalActions.prototype, 'clearEnketoStatus'),
      setEnketoSavingStatus: sinon.stub(GlobalActions.prototype, 'setEnketoSavingStatus'),
      setEnketoError: sinon.stub(GlobalActions.prototype, 'setEnketoError'),
      setSnackbarContent: sinon.stub(GlobalActions.prototype, 'setSnackbarContent'),
      setTrainingCard: sinon.stub(GlobalActions.prototype, 'setTrainingCard'),
    };
    stopPerformanceTrackStub = sinon.stub();
    performanceService = { track: sinon.stub().returns({ stop: stopPerformanceTrackStub }) };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          TrainingCardsFormComponent,
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
          { provide: PerformanceService, useValue: performanceService },
          { provide: FeedbackService, useValue: feedbackService },
        ],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(TrainingCardsFormComponent);
        store = TestBed.inject(MockStore);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  });

  afterEach(() => sinon.restore());

  it('should create component', () => {
    expect(component).to.exist;
  });

  it('should unsubscribe from everything, cancel geohandle and clear enketo form', fakeAsync(() => {
    const unsubscribeStub = sinon.stub(component.subscriptions, 'unsubscribe');

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

  describe('onInit', () => {
    it('should subscribe to redux and init component', fakeAsync(() => {
      const AddSpy = sinon.spy(component.subscriptions, 'add');
      sinon.resetHistory();

      component.ngOnInit();

      expect(AddSpy.calledOnce).to.be.true;
      expect(component.contentError).to.be.false;
      expect(component.enketoError).to.be.false;
      expect(component.trainingCardFormId).to.be.null;
      expect(component.form).to.be.null;
      expect(component.loadingContent).to.be.true;

      store.overrideSelector(Selectors.getTrainingCardFormId, 'form-123');
      store.overrideSelector(
        Selectors.getEnketoStatus,
        { form: true, edited: false, saving: true, error: 'ups an error' },
      );
      store.overrideSelector(Selectors.getEnketoSavingStatus, true);
      store.overrideSelector(Selectors.getEnketoError, 'ups an error');
      store.refreshState();

      flush();

      expect(component.enketoError).to.equal('ups an error');
      expect(component.trainingCardFormId).to.equal('form-123');
      expect(component.enketoStatus).to.deep.equal({ form: true, edited: false, saving: true, error: 'ups an error' });
      expect(component.enketoSaving).to.be.true;
    }));

    it('should reset component', () => {
      component.contentError = true;
      component.trainingCardFormId = 'training:a_form_id';
      component.form = { the: 'rendered training form' };
      component.loadingContent = false;
      component.enketoError = 'some_error';
      sinon.resetHistory();

      component.ngOnInit();

      expect(globalActions.setEnketoError.calledOnce).to.be.true;
      expect(globalActions.setEnketoError.args[0]).to.deep.equal([ null ]);
      expect(component.contentError).to.be.false;
      expect(component.trainingCardFormId).to.be.null;
      expect(component.form).to.be.null;
      expect(component.loadingContent).to.be.true;
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
        'Attempted to call TrainingCardsFormComponent:saveForm more than once'
      ]);
      expect(formService.save.notCalled).to.be.true;
      expect(formService.unload.notCalled).to.be.true;
      expect(globalActions.setEnketoSavingStatus.notCalled).to.be.true;
      expect(globalActions.setSnackbarContent.notCalled).to.be.true;
      expect(globalActions.setEnketoError.notCalled).to.be.true;
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
      expect(stopPerformanceTrackStub.callCount).to.equal(3);
      expect(stopPerformanceTrackStub.args[0][0])
        .to.deep.equal({ name: 'enketo:training:a_form_id:add:render', recordApdex: true });
      expect(stopPerformanceTrackStub.args[1][0])
        .to.deep.equal({ name: 'enketo:training:a_form_id:add:user_edit_time' });
      expect(stopPerformanceTrackStub.args[2][0]).to.deep.equal({ name: 'enketo:training:a_form_id:add:save' });
      expect(globalActions.setEnketoError.notCalled).to.be.true;
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
        'TrainingCardsFormComponent :: Error submitting form data.',
        { some: 'error' }
      ]);
      expect(globalActions.setEnketoError.calledOnce).to.be.true;
      expect(globalActions.setEnketoError.args[0]).to.deep.equal([ 'training_cards.error.save' ]);
      expect(globalActions.setEnketoSavingStatus.calledTwice).to.be.true;
      expect(globalActions.setEnketoSavingStatus.args).to.deep.equal([[ true ], [ false ]]);
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
      expect(stopPerformanceTrackStub.calledOnce).to.be.true;
      expect(stopPerformanceTrackStub.args[0][0])
        .to.deep.equal({ name: 'enketo:training:a_form_id:add:render', recordApdex: true });

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
        'TrainingCardsFormComponent :: Error fetching form.',
        { error: 'boom' }
      ]);
      expect(component.errorTranslationKey).to.equal('training_cards.error.loading');
      expect(component.loadingContent).to.be.false;
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
        'TrainingCardsFormComponent :: Error rendering form.',
        { some: 'error' }
      ]);
    }));
  });
});
