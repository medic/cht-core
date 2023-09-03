import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';
import { Subject } from 'rxjs';

import { ContactsReportComponent } from '@mm-modules/contacts/contacts-report.component';
import { GlobalActions } from '@mm-actions/global';
import { FormService } from '@mm-services/form.service';
import { GeolocationService } from '@mm-services/geolocation.service';
import { Selectors } from '@mm-selectors/index';
import { TelemetryService } from '@mm-services/telemetry.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { ContactViewModelGeneratorService } from '@mm-services/contact-view-model-generator.service';
import { EnketoComponent } from '@mm-components/enketo/enketo.component';

describe('contacts report component', () => {
  let component: ContactsReportComponent;
  let fixture: ComponentFixture<ContactsReportComponent>;
  let store: MockStore;
  let formService;
  let geolocationService;
  let geoHandle;
  let telemetryService;
  let xmlFormsService;
  let translateFromService;
  let router;
  let route;
  let contactViewModelGeneratorService;
  let routeSnapshot;

  beforeEach(() => {
    formService = {
      unload: sinon.stub(),
      save: sinon.stub(),
      render: sinon.stub().resolves(),
    };
    xmlFormsService = { get: sinon.stub().resolves({ title: 'formTitle' }) };
    geoHandle = { cancel: sinon.stub() };
    geolocationService = { init: sinon.stub().returns(geoHandle) };
    telemetryService = { record: sinon.stub() };
    translateFromService = { get: sinon.stub() };
    router = { navigate: sinon.stub() };
    routeSnapshot = {
      params: {
        id: 'random-contact',
        formId: 'pregnancy_danger_sign',
      },
      queryParams: {},
    };
    route = {
      get snapshot() {
        return routeSnapshot;
      },
      params: new Subject(),
      queryParams: new Subject(),
    };
    contactViewModelGeneratorService = { getContact: sinon.stub().resolves({ doc: { doc: {} } }) };
    const mockedSelectors = [
      { selector: Selectors.getSelectedContact, value: {} },
      { selector: Selectors.getEnketoStatus, value: {} },
      { selector: Selectors.getEnketoSavingStatus, value: false },
      { selector: Selectors.getEnketoError, value: false },
    ];

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
        ],
        declarations: [
          ContactsReportComponent,
          EnketoComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: FormService, useValue: formService },
          { provide: GeolocationService, useValue: geolocationService },
          { provide: TelemetryService, useValue: telemetryService },
          { provide: XmlFormsService, useValue: xmlFormsService },
          { provide: TranslateFromService, useValue: translateFromService },
          { provide: ActivatedRoute, useValue: route },
          { provide: Router, useValue: router },
          { provide: ContactViewModelGeneratorService, useValue: contactViewModelGeneratorService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(ContactsReportComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        fixture.detectChanges();
      });
  });

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
  });

  it('should create ContactsReportComponent', () => {
    expect(component).to.exist;
  });

  describe('cancelCallback', () => {
    it('should redirect to the parent if param id is set', fakeAsync(() => {
      let cancelCallback;
      sinon.stub(GlobalActions.prototype, 'setCancelCallback').callsFake(func => cancelCallback = func);
      routeSnapshot.params = { id: 'random-contact', formId: 'pregnancy_danger_sign' };

      component.ngOnInit();
      flush();
      cancelCallback();

      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([[ '/contacts', 'random-contact' ]]);
    }));

    it('should redirect to the contacts tab if param id is not set', fakeAsync(() => {
      let cancelCallback;
      sinon.stub(GlobalActions.prototype, 'setCancelCallback').callsFake(func => cancelCallback = func);
      routeSnapshot.params = { formId: 'pregnancy_danger_sign' };

      component.ngOnInit();
      flush();
      cancelCallback();

      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([[ '/contacts', '' ]]);
    }));
  });

  describe('loading content', () => {
    it('should initialize the component', fakeAsync(() => {
      const setShowContent = sinon.stub(GlobalActions.prototype, 'setShowContent');
      const setCancelCallback = sinon.stub(GlobalActions.prototype, 'setCancelCallback');
      const clearRightActionBar = sinon.stub(GlobalActions.prototype, 'clearRightActionBar');
      component.ngOnInit();
      flush();

      expect(setShowContent.args).to.deep.equal([[true]]);
      expect(setCancelCallback.callCount).to.equal(1);
      expect(clearRightActionBar.callCount).to.equal(1);
    }));

    it('should render with the right information', fakeAsync(() => {
      sinon.resetHistory();
      contactViewModelGeneratorService.getContact.resolves({
        doc: {
          _id: 'test_id',
          contact_type: 'test_type'
        }
      });
      component.ngAfterViewInit();
      flush();

      expect(formService.render.callCount).to.equal(1);
      expect(formService.render.args[0][0]).to.equal('#contact-report');
      expect(formService.render.args[0][1]).to.deep.equal({ title: 'formTitle' });
      expect(formService.render.args[0][2]).to.deep.equal(
        {
          source: 'contact',
          contact: {
            _id: 'test_id',
            contact_type: 'test_type'
          }
        }
      );
    }));

    it('should unsubscribe and unload form on destroy', async () => {
      const spy = sinon.spy(component.subscription, 'unsubscribe');
      component.ngOnDestroy();
      expect(spy.callCount).to.equal(1);
      expect(formService.unload.callCount).to.equal(1);
    });

    it('should respond to url changes', fakeAsync(() => {
      component.ngOnInit();
      flush();

      expect(xmlFormsService.get.callCount).to.equal(1);
      expect(xmlFormsService.get.args[0][0]).to.equal('pregnancy_danger_sign');
      expect(formService.render.callCount).to.equal(1);

      routeSnapshot = {
        params: {
          id: 'random-contact',
          formId: 'pregnancy_home_vist',
        },
        queryParams: {},
      };
      route.params.next({
        id: 'random-contact',
        formId: 'pregnancy_home_vist',
      });
      flush();
      expect(formService.render.callCount).to.equal(2);
      expect(xmlFormsService.get.callCount).to.equal(2);
      expect(xmlFormsService.get.args[1][0]).to.equal('pregnancy_home_vist');
    }));
  });

  describe('saving', () => {
    it('should not save when already saving', async () => {
      component.enketoSaving = true;
      await component.save();

      expect(formService.save.callCount).to.equal(0);
    });

    it('should catch save errors', fakeAsync(() => {
      const setEnketoSavingStatus = sinon.stub(GlobalActions.prototype, 'setEnketoSavingStatus');
      const setEnketoError = sinon.stub(GlobalActions.prototype, 'setEnketoError');
      formService.save.rejects({ some: 'error' });
      component.save();
      flush();

      expect(setEnketoSavingStatus.callCount).to.equal(2);
      expect(setEnketoSavingStatus.args).to.deep.equal([[true], [false]]);
      expect(formService.save.callCount).to.equal(1);
      expect(setEnketoError.callCount).to.equal(1);
    }));

    it('should call the right methods when saving with no errors', fakeAsync(() => {
      const setEnketoSavingStatus = sinon.stub(GlobalActions.prototype, 'setEnketoSavingStatus');
      const setSnackbarContent = sinon.stub(GlobalActions.prototype, 'setSnackbarContent');
      const setEnketoError = sinon.stub(GlobalActions.prototype, 'setEnketoError');
      formService.save.resolves({ docs: 'success' });
      component.save();
      flush();

      expect(setEnketoSavingStatus.callCount).to.equal(2);
      expect(setEnketoSavingStatus.args).to.deep.equal([[true], [false]]);
      expect(formService.save.callCount).to.equal(1);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0][0][0]).to.equal('/contacts');
      expect(router.navigate.args[0][0][1]).to.equal('random-contact');
      expect(telemetryService.record.callCount).to.equal(3);
      expect(telemetryService.record.args[2][0]).to.equal('enketo:contacts:pregnancy_danger_sign:add:save');
      expect(setEnketoError.callCount).to.equal(0);
      expect(setSnackbarContent.callCount).to.equal(1);
    }));

    it('should set a form error if form is invalid', fakeAsync(() => {
      const setEnketoError = sinon.stub(GlobalActions.prototype, 'setEnketoError');
      formService.save.rejects({ error: 'form is invalid' });
      component.save();
      flush();

      expect(setEnketoError.callCount).to.equal(1);

      store.overrideSelector(Selectors.getEnketoError, true);
      store.refreshState();
      component.save();
      flush();

      expect(setEnketoError.callCount).to.equal(3);
      expect(setEnketoError.args[1][0]).to.equal(null); //check error is reset
    }));
  });
});
