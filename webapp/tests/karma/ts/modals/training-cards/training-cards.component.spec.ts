import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subject } from 'rxjs';
import { expect } from 'chai';
import sinon from 'sinon';


import { MmModal, MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';
import { TrainingCardsComponent } from '@mm-modals/training-cards/training-cards.component';
import { GeolocationService } from '@mm-services/geolocation.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { EnketoService } from '@mm-services/enketo.service';
import { TranslateService } from '@mm-services/translate.service';
import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';

describe('TrainingCardsComponent', () => {
  let fixture:ComponentFixture<TrainingCardsComponent>;
  let component:TrainingCardsComponent;
  let bsModalRef;
  let modalSuperCloseStub;
  let geolocationService;
  let geoHandle;
  let xmlFormsService;
  let translateService;
  let enketoService;
  let globalActions;

  beforeEach(() => {
    bsModalRef = {
      hide: sinon.stub(),
      onHidden: new Subject(),
      onHide: new Subject(),
    };

    modalSuperCloseStub = sinon.stub(MmModalAbstract.prototype, 'close');
    geoHandle = { cancel: sinon.stub() };
    geolocationService = { init: sinon.stub().returns(geoHandle) };
    xmlFormsService = { get: sinon.stub().resolves() };
    translateService = {
      get: sinon.stub().resolvesArg(0),
      instant: sinon.stub().returnsArg(0),
    };
    enketoService = {
      unload: sinon.stub(),
      save: sinon.stub(),
      render: sinon.stub().resolves(),
    };
    const mockedSelectors = [
      { selector: Selectors.getEnketoStatus, value: {} },
      { selector: Selectors.getEnketoSavingStatus, value: false },
      { selector: Selectors.getEnketoError, value: false },
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
          MmModal,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: BsModalRef, useValue: bsModalRef },
          { provide: GeolocationService, useValue: geolocationService },
          { provide: XmlFormsService, useValue: xmlFormsService },
          { provide: TranslateService, useValue: translateService },
          { provide: EnketoService, useValue: enketoService }
        ],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(TrainingCardsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  });

  afterEach(() => sinon.restore());

  it('should create component', () => {
    expect(component).to.exist;
  });

  it('should unsubscribe from everything, cancel geohandle and clear enketo form', () => {
    const unsubscribeStub = sinon.stub(component.subscription, 'unsubscribe');

    component.ngOnDestroy();

    expect(unsubscribeStub.calledOnce).to.be.true;
    expect(geoHandle.cancel.calledOnce).to.be.true;
    expect(enketoService.unload.calledOnce).to.be.true;
    expect(globalActions.clearEnketoStatus.calledOnce).to.be.true;
  });

  it('should close modal when canceling', () => {
    component.close();

    expect(modalSuperCloseStub.calledOnce).to.be.true;
  });

  describe('onInit', () => {
    it('should subscribe to redux and init component', () => {
      const AddSpy = sinon.spy(component.subscription, 'add');
      sinon.resetHistory();

      component.ngOnInit();

      expect(AddSpy.calledOnce).to.be.true;
      expect(component.contentError).to.be.false;
      expect(component.formInternalId).to.be.null;
      expect(component.form).to.be.null;
      expect(component.loadingContent).to.be.true;
      expect(component.hideModalFooter).to.be.true;
    });

    it('should reset component', () => {
      component.contentError = true;
      component.formInternalId = 'training_form_id';
      component.form = { the: 'rendered training form' };
      component.loadingContent = false;
      component.hideModalFooter = false;
      component.enketoError = 'some_error';
      sinon.resetHistory();

      component.ngOnInit();

      expect(globalActions.setEnketoError.calledOnce).to.be.true;
      expect(globalActions.setEnketoError.args[0]).to.deep.equal([ null ]);
      expect(component.contentError).to.be.false;
      expect(component.formInternalId).to.be.null;
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
      expect(enketoService.save.notCalled).to.be.true;
      expect(enketoService.unload.notCalled).to.be.true;
      expect(globalActions.setEnketoSavingStatus.notCalled).to.be.true;
      expect(globalActions.setSnackbarContent.notCalled).to.be.true;
      expect(globalActions.setEnketoError.notCalled).to.be.true;
      expect(modalSuperCloseStub.notCalled).to.be.true;
    }));

    it('should call enketo save, set content in snackbar and unload form', fakeAsync(() => {
      component.form = { the: 'rendered training form' };
      component.formInternalId = 'training_form_id';
      enketoService.save.resolves([{ _id: 'completed_training' }]);
      const consoleDebugMock = sinon.stub(console, 'debug');

      component.saveForm();
      tick();

      expect(enketoService.save.calledOnce).to.be.true;
      expect(enketoService.save.args[0]).to.deep.equal([
        'training_form_id',
        { the: 'rendered training form' },
        geoHandle
      ]);
      expect(consoleDebugMock.callCount).to.equal(1);
      expect(consoleDebugMock.args[0]).to.deep.equal([
        'Saved form and associated docs',
        [{ _id: 'completed_training' }]
      ]);
      expect(enketoService.unload.calledOnce).to.be.true;
      expect(enketoService.unload.args[0]).to.deep.equal([{ the: 'rendered training form' }]);
      expect(globalActions.setEnketoSavingStatus.calledTwice).to.be.true;
      expect(globalActions.setEnketoSavingStatus.args).to.deep.equal([[ true ], [ false ]]);
      expect(globalActions.setSnackbarContent.calledOnce).to.be.true;
      expect(globalActions.setSnackbarContent.args[0]).to.deep.equal([ 'training_cards.form.saved' ]);
      expect(globalActions.setEnketoError.notCalled).to.be.true;
      expect(modalSuperCloseStub.calledOnce).to.be.true;
    }));

    it('should catch enketo saving error', fakeAsync(() => {
      const consoleErrorMock = sinon.stub(console, 'error');
      component.form = { the: 'rendered training form' };
      component.formInternalId = 'training_form_id';
      enketoService.save.rejects({ some: 'error' });

      component.saveForm();
      tick();

      expect(enketoService.save.calledOnce).to.be.true;
      expect(enketoService.save.args[0]).to.deep.equal([
        'training_form_id',
        { the: 'rendered training form' },
        geoHandle
      ]);
      expect(consoleErrorMock.calledOnce).to.be.true;
      expect(consoleErrorMock.args[0]).to.deep.equal([
        'Error submitting form data: ',
        { some: 'error' }
      ]);
      expect(globalActions.setEnketoError.calledOnce).to.be.true;
      expect(globalActions.setEnketoError.args[0]).to.deep.equal([ 'training_cards.error.save' ]);
      expect(globalActions.setEnketoSavingStatus.calledTwice).to.be.true;
      expect(globalActions.setEnketoSavingStatus.args).to.deep.equal([[ true ], [ false ]]);
      expect(enketoService.unload.notCalled).to.be.true;
      expect(modalSuperCloseStub.notCalled).to.be.true;
      expect(globalActions.setSnackbarContent.notCalled).to.be.true;
    }));
  });

  describe('loadForm', () => {
    it('should load form', fakeAsync(() => {
      sinon.resetHistory();

      component.formInternalId = 'training_form_id';
      const xmlForm = { _id: 'training_form_id', some: 'content' };
      const renderedForm = { rendered: 'form', model: {}, instance: {} };
      const consoleErrorMock = sinon.stub(console, 'error');
      xmlFormsService.get.resolves(xmlForm);
      enketoService.render.resolves(renderedForm);

      component.ngAfterViewInit();
      tick();

      expect(geolocationService.init.calledOnce).to.be.true;
      expect(xmlFormsService.get.calledOnce).to.be.true;
      expect(xmlFormsService.get.args[0]).to.deep.equal([ 'training_form_id' ]);
      expect(enketoService.render.calledOnce).to.be.true;
      expect(enketoService.render.args[0][1]).to.deep.equal(xmlForm);
      expect(enketoService.render.args[0][2]).to.equal(undefined);
      expect(component.form).to.equal(renderedForm);
      expect(consoleErrorMock.notCalled).to.be.true;

      const resetFormError = enketoService.render.args[0][4];
      resetFormError();
      expect(globalActions.setEnketoError.notCalled).to.be.true; // No error so no call
      component.enketoError = 'some error';
      resetFormError();
      expect(globalActions.setEnketoError.calledOnce).to.be.true;
      expect(globalActions.setEnketoError.args[0]).to.deep.equal([ null ]);
    }));

    it('should reset geohandle on reload', fakeAsync(() => {
      expect(geoHandle.cancel.notCalled).to.be.true;
      expect(geolocationService.init.calledOnce).to.be.true;

      component.ngAfterViewInit();
      tick();

      expect(geolocationService.init.calledTwice).to.be.true;
      expect(geoHandle.cancel.calledOnce).to.be.true;
    }));

    it('should catch form loading errors', fakeAsync(() => {
      sinon.resetHistory();

      const consoleErrorMock = sinon.stub(console, 'error');
      xmlFormsService.get.rejects({ error: 'boom' });

      component.ngAfterViewInit();
      tick();

      expect(xmlFormsService.get.calledOnce).to.be.true;
      expect(enketoService.render.notCalled).to.be.true;
      expect(consoleErrorMock.calledOnce).to.be.true;
      expect(consoleErrorMock.args[0]).to.deep.equal([
        'Error fetching form.',
        { error: 'boom' }
      ]);
    }));

    it('should catch enketo errors', fakeAsync(() => {
      sinon.resetHistory();
      const consoleErrorMock = sinon.stub(console, 'error');
      xmlFormsService.get.resolves({ _id: 'training_form_id', some: 'content' });
      enketoService.render.rejects({ some: 'error' });

      component.ngAfterViewInit();
      tick();

      expect(xmlFormsService.get.calledOnce).to.be.true;
      expect(enketoService.render.calledOnce).to.be.true;
      expect(component.form).to.equal(undefined);
      expect(consoleErrorMock.calledOnce).to.be.true;
      expect(consoleErrorMock.args[0]).to.deep.equal([
        'Error rendering form.',
        { some: 'error' }
      ]);
    }));
  });
});
