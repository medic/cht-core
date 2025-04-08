import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';
import { expect } from 'chai';
import sinon from 'sinon';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';

import { ContactTypesService } from '@mm-services/contact-types.service';
import { EnketoComponent } from '@mm-components/enketo/enketo.component';
import { ContactsEditComponent } from '@mm-modules/contacts/contacts-edit.component';
import { TranslateService } from '@mm-services/translate.service';
import { PerformanceService } from '@mm-services/performance.service';
import { DbService } from '@mm-services/db.service';
import { Selectors } from '@mm-selectors/index';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { FormService, DuplicatesFoundError } from '@mm-services/form.service';
import { GlobalActions } from '@mm-actions/global';
import { TelemetryService } from '@mm-services/telemetry.service';


describe('ContactsEdit component', () => {
  let contactTypesService;
  let translateService;
  let router;
  let route;
  let dbGet;
  let createComponent;
  let fixture;
  let component;
  let formService;
  let lineageModelGeneratorService;
  let routeSnapshot;
  let stopPerformanceTrackStub;
  let performanceService;
  let telemetryService;
  const loadContactSummary = sinon.stub();

  beforeEach(() => {
    contactTypesService = {
      get: sinon.stub().resolves(),
      getChildren: sinon.stub().resolves(),
      getTypeId: sinon.stub().callsFake(contact => contact?.type === 'contact' ? contact.contact_type : contact?.type),
    };
    translateService = { get: sinon.stub().resolvesArg(0) };
    dbGet = sinon.stub().resolves();
    router = { navigate: sinon.stub() };
    routeSnapshot = { params: {}, queryParams: {} };
    route = {
      get snapshot() {
        return routeSnapshot;
      },
      params: new Subject(),
      queryParams: new Subject(),
    };
    formService = {
      render: sinon.stub(),
      unload: sinon.stub(),
      saveContact: sinon.stub(),
      loadContactSummary: loadContactSummary,
    };
    stopPerformanceTrackStub = sinon.stub();
    performanceService = { track: sinon.stub().returns({ stop: stopPerformanceTrackStub }) };
    lineageModelGeneratorService = { contact: sinon.stub().resolves({ doc: {} }) };
    telemetryService = { record: sinon.stub() };

    sinon.stub(console, 'error');

    const mockedSelectors = [
      { selector: Selectors.getEnketoStatus, value: {} },
      { selector: Selectors.getEnketoSavingStatus, value: false },
      { selector: Selectors.getEnketoEditedStatus, value: false },
      { selector: Selectors.getEnketoError, value: false },
      { selector: Selectors.getLoadingContent, value: false },
      { selector: Selectors.getCancelCallback, value: undefined },
    ];

    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        RouterTestingModule,
        EnketoComponent,
        ContactsEditComponent,
      ],
      providers: [
        provideMockStore({ selectors: mockedSelectors }),
        { provide: TranslateService, useValue: translateService },
        { provide: DbService, useValue: { get: () => ({ get: dbGet }) } },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: route },
        { provide: LineageModelGeneratorService, useValue: lineageModelGeneratorService },
        { provide: FormService, useValue: formService },
        { provide: ContactTypesService, useValue: contactTypesService },
        { provide: PerformanceService, useValue: performanceService },
        { provide: TelemetryService, useValue: telemetryService }
      ],
    });

    createComponent = () => {
      return TestBed.compileComponents().then(() => {
        fixture = TestBed.createComponent(ContactsEditComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
    };
  });

  afterEach(() => sinon.restore());

  describe('cancelCallback', () => {
    it('cancelling redirects to contacts list when query has `from` param equal to `list`', async () => {
      let cancelCallback;
      sinon.stub(GlobalActions.prototype, 'setCancelCallback').callsFake(func => cancelCallback = func);

      await createComponent();
      routeSnapshot.queryParams = { from: 'list' };
      route.queryParams.next();

      cancelCallback();

      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/contacts']]);
    });

    it('cancelling falls back to parent contact if new contact and query `from` param is not equal to `list`',
      async () => {
        let cancelCallback;
        routeSnapshot.params = { parent_id: 'parent_id' };
        sinon.stub(GlobalActions.prototype, 'setCancelCallback').callsFake(func => cancelCallback = func);

        await createComponent();
        routeSnapshot.queryParams = { from: 'something' };
        route.queryParams.next();

        cancelCallback();

        expect(router.navigate.callCount).to.equal(1);
        expect(router.navigate.args[0]).to.deep.equal([['/contacts', 'parent_id']]);
      });

    it('cancelling falls back to parent contact if new contact and query does not have `from` param', async () => {
      let cancelCallback;
      routeSnapshot.params = { parent_id: 'parent_id' };
      sinon.stub(GlobalActions.prototype, 'setCancelCallback').callsFake(func => cancelCallback = func);

      await createComponent();
      route.queryParams.next();

      cancelCallback();

      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/contacts', 'parent_id']]);
    });

    it('cancelling falls back to contact if edit contact', async () => {
      let cancelCallback;
      routeSnapshot.params = { id: 'id' };
      sinon.stub(GlobalActions.prototype, 'setCancelCallback').callsFake(func => cancelCallback = func);

      await createComponent();
      route.queryParams.next();

      cancelCallback();

      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/contacts', 'id']]);
    });
  });

  describe('initialization', () => {
    it('should initialize the component', fakeAsync(async () => {
      const setLoadingContent = sinon.stub(GlobalActions.prototype, 'setLoadingContent');
      const setShowContent = sinon.stub(GlobalActions.prototype, 'setShowContent');
      const unsetSelected = sinon.stub(GlobalActions.prototype, 'unsetSelected');
      const settingSelected = sinon.stub(GlobalActions.prototype, 'settingSelected');
      await createComponent();
      flushMicrotasks();

      expect(component.routeSnapshot).to.equal(routeSnapshot);
      expect(setLoadingContent.args).to.deep.equal([[true], [false]]);
      expect(setShowContent.args).to.deep.equal([[true]]);
      expect(unsetSelected.callCount).to.equal(1);
      expect(settingSelected.callCount).to.equal(1);
      expect(translateService.get.calledOnceWithExactly('duplicate_check.contact.duplication_message')).to.be.true;
    }));

    it('should initialize duplicate message with default if none configured for contact type', async () => {
      routeSnapshot.params = { id: 'the_patient' };
      lineageModelGeneratorService.contact.resolves({
        doc: {
          _id: 'the_patient',
          type: 'patient',
        },
      });

      await createComponent();
      await fixture.whenStable();

      expect(component.duplicateMessage).to.equal('duplicate_check.contact.duplication_message');
      expect(component.routeSnapshot).to.equal(routeSnapshot);
      expect(lineageModelGeneratorService.contact.calledOnceWithExactly('the_patient', { merge: true })).to.be.true;
      expect(translateService.get.args).to.deep.equal([
        ['duplicate_check.contact.patient.duplication_message'],
        ['duplicate_check.contact.duplication_message']
      ]);
    });

    it('should initialize duplicate message with configured contact type message', async () => {
      routeSnapshot.params = { id: 'the_patient' };
      lineageModelGeneratorService.contact.resolves({
        doc: {
          _id: 'the_patient',
          type: 'patient',
        },
      });
      translateService.get = sinon.stub().resolves('Contact type duplicate message');

      await createComponent();
      await fixture.whenStable();

      expect(component.duplicateMessage).to.equal('Contact type duplicate message');
      expect(component.routeSnapshot).to.equal(routeSnapshot);
      expect(lineageModelGeneratorService.contact.calledOnceWithExactly('the_patient', { merge: true })).to.be.true;
      expect(translateService.get.calledOnceWithExactly(
        'duplicate_check.contact.patient.duplication_message'
      )).to.be.true;
    });

    it('should unsubscribe on destroy', async () => {
      await createComponent();

      const spy = sinon.spy(component.subscription, 'unsubscribe');
      component.ngOnDestroy();
      expect(spy.callCount).to.equal(1);
      expect(formService.unload.callCount).to.equal(0);
    });

    it('should unload form on destroy', async () => {
      await createComponent();

      const spy = sinon.spy(component.subscription, 'unsubscribe');
      component.enketoContact = { formInstance: 'form instance' };
      component.ngOnDestroy();

      expect(spy.callCount).to.equal(1);
      expect(formService.unload.callCount).to.equal(1);
      expect(formService.unload.args[0]).to.deep.equal(['form instance']);
    });

    it('should respond to url changes', fakeAsync(async () => {
      routeSnapshot.params = { type: 'random', parent_id: 'the_district' };
      route.params.next({ type: 'random', parent_id: 'the_district' });

      contactTypesService.getChildren.resolves([{ id: 'random' }, { id: 'other' }]);
      dbGet
        .withArgs('the_district')
        .resolves({ _id: 'the_district', type: 'random' });
      contactTypesService.get
        .withArgs('random')
        .resolves({
          create_form: 'random_create',
          create_key: 'random',
        })
        .withArgs('other')
        .resolves({
          create_form: 'other_create',
          create_key: 'other_key',
        });
      dbGet
        .withArgs('random_create')
        .resolves({ _id: 'random_create', the: 'form' })
        .withArgs('other_create')
        .resolves({ _id: 'other_create' });

      await createComponent();
      await fixture.whenStable();

      expect(contactTypesService.get.callCount).to.equal(1);
      expect(formService.render.callCount).to.equal(1);
      expect(formService.render.args[0][0]).to.deep.include({
        selector: '#contact-form',
        formDoc: { _id: 'random_create', the: 'form' },
        instanceData: { random: { type: 'contact', contact_type: 'random', parent: 'the_district' } },
        titleKey: 'random',
      });

      routeSnapshot = { params: { type: 'other', parent_id: 'the_district' } };
      route.params.next({ type: 'other', parent_id: 'the_district' });

      await fixture.whenStable();
      flushMicrotasks();

      expect(dbGet.callCount).to.equal(4);
      expect(contactTypesService.get.callCount).to.equal(2);
      expect(formService.render.callCount).to.equal(2);
      expect(formService.render.args[1][0]).to.deep.include({
        selector: '#contact-form',
        formDoc: { _id: 'other_create' },
        instanceData: { other: { type: 'contact', contact_type: 'other', parent: 'the_district' } },
        titleKey: 'other_key',
      });
    }));
  });

  describe('loading form', () => {
    describe('for new contact', () => {
      it('should fail when no type', async () => {
        contactTypesService.get.resolves();

        await createComponent();
        await fixture.whenStable();

        expect(contactTypesService.get.callCount).to.equal(1);
        expect(contactTypesService.get.args[0]).to.deep.equal([undefined]);
        expect(dbGet.callCount).to.equal(0);
        expect(formService.render.callCount).to.equal(0);
        expect(component.enketoContact).to.deep.equal(undefined);
      });

      it('should fail when no formId', async () => {
        routeSnapshot.params = { type: 'random' };
        contactTypesService.get.resolves({});
        await createComponent();
        await fixture.whenStable();

        expect(contactTypesService.get.callCount).to.equal(1);
        expect(contactTypesService.get.args[0]).to.deep.equal(['random']);
        expect(dbGet.callCount).to.equal(0);
        expect(formService.render.callCount).to.equal(0);
        expect(component.enketoContact).to.deep.equal(undefined);
      });

      it('should fail when new contact is not a child of the parent', async () => {
        routeSnapshot.params = { type: 'the_place', parent_id: 'parent_id' };
        contactTypesService.get.resolves({
          create_form: 'the_place_create_form_id',
          create_key: 'the_place_create_key',
        });
        dbGet
          .withArgs('parent_id')
          .resolves({ _id: 'parent_id', type: 'the_place' });
        contactTypesService.getChildren.resolves([{ id: 'clinic' }]);

        await createComponent();
        await fixture.whenStable();

        expect(contactTypesService.get.callCount).to.equal(1);
        expect(contactTypesService.get.args[0]).to.deep.equal(['the_place']);
        expect(contactTypesService.getChildren.callCount).to.equal(1);
        expect(formService.render.callCount).to.equal(0);
        expect(component.enketoContact).to.deep.equal(undefined);
        expect(component.contentError).to.equal(true);
      });

      it('should fail when no form', async () => {
        routeSnapshot.params = { type: 'person' };
        contactTypesService.getChildren.resolves([{ id: 'person' }]);
        contactTypesService.get.resolves({
          create_form: 'person_create_form_id',
          create_key: 'person_create_key',
        });
        dbGet.rejects({ status: 404 });

        await createComponent();
        await fixture.whenStable();

        expect(contactTypesService.get.callCount).to.equal(1);
        expect(contactTypesService.get.args[0]).to.deep.equal(['person']);
        expect(dbGet.callCount).to.equal(1);
        expect(dbGet.args[0]).to.deep.equal(['person_create_form_id']);
        expect(formService.render.callCount).to.equal(0);
        expect(component.enketoContact).to.deep.equal(undefined);
        expect(component.contentError).to.equal(true);
      });

      it('should render form with parent', async () => {
        routeSnapshot.params = { type: 'clinic', parent_id: 'the_district' };
        contactTypesService.getChildren.resolves([{ id: 'clinic' }]);
        contactTypesService.get.resolves({
          create_form: 'clinic_create_form_id',
          create_key: 'clinic_create_key',
        });
        dbGet
          .withArgs('the_district')
          .resolves({ _id: 'the_district', type: 'clinic' });
        dbGet.resolves({ _id: 'clinic_create_form_id', the: 'form' });

        await createComponent();
        await fixture.whenStable();

        expect(contactTypesService.get.callCount).to.equal(1);
        expect(contactTypesService.get.args[0]).to.deep.equal(['clinic']);
        expect(dbGet.callCount).to.equal(2);
        expect(dbGet.args[0]).to.deep.equal(['the_district']);
        expect(dbGet.args[1]).to.deep.equal(['clinic_create_form_id']);
        expect(component.enketoContact).to.deep.equal({
          type: 'clinic',
          formInstance: undefined,
          docId: null,
        });
        expect(formService.render.callCount).to.equal(1);
        expect(formService.render.args[0][0]).to.deep.include({
          selector: '#contact-form',
          formDoc: { _id: 'clinic_create_form_id', the: 'form' },
          instanceData: { clinic: { type: 'contact', contact_type: 'clinic', parent: 'the_district' } },
          titleKey: 'clinic_create_key',
        });
        expect(component.contentError).to.equal(false);
        expect(performanceService.track.calledTwice).to.be.true;
        expect(stopPerformanceTrackStub.calledOnce).to.be.true;
        expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({
          name: 'enketo:contacts:clinic_create_form_id:add:render',
          recordApdex: true,
        });
      });

      it('should render form without parent', async () => {
        routeSnapshot.params = { type: 'district_hospital' };
        contactTypesService.getChildren.resolves([{ id: 'district_hospital' }]);
        contactTypesService.get.resolves({
          create_form: 'district_create_form_id',
          create_key: 'district_create_key',
        });
        dbGet.resolves({ _id: 'district_create_form_id', the: 'form' });

        await createComponent();
        await fixture.whenStable();


        expect(contactTypesService.get.callCount).to.equal(1);
        expect(contactTypesService.get.args[0]).to.deep.equal(['district_hospital']);
        expect(dbGet.callCount).to.equal(1);
        expect(dbGet.args[0]).to.deep.equal(['district_create_form_id']);
        expect(component.enketoContact).to.deep.equal({
          type: 'district_hospital',
          formInstance: undefined,
          docId: null,
        });
        expect(formService.render.callCount).to.equal(1);
        expect(formService.render.args[0][0]).to.deep.include({
          selector: '#contact-form',
          formDoc: { _id: 'district_create_form_id', the: 'form' },
          instanceData: { district_hospital: { type: 'contact', contact_type: 'district_hospital', parent: '' } },
          titleKey: 'district_create_key',
        });
        expect(component.contentError).to.equal(false);
        expect(performanceService.track.calledTwice).to.be.true;
        expect(stopPerformanceTrackStub.calledOnce).to.be.true;
        expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({
          name: 'enketo:contacts:district_create_form_id:add:render',
          recordApdex: true,
        });
      });
    });

    describe('for existent contact', () => {
      it('should fail when no type', async () => {
        routeSnapshot.params = { id: 'the_clinic' };
        lineageModelGeneratorService.contact.resolves({
          doc: {
            _id: 'the_clinic',
            type: 'missing_clinic_type',
          },
        });
        contactTypesService.get.resolves();


        await createComponent();
        await fixture.whenStable();

        expect(contactTypesService.get.callCount).to.equal(1);
        expect(contactTypesService.get.args[0]).to.deep.equal(['missing_clinic_type']);
        expect(dbGet.callCount).to.equal(0);
        expect(formService.render.callCount).to.equal(0);
        expect(component.enketoContact).to.deep.equal(undefined);
      });

      it('should fail when no formId', async () => {
        routeSnapshot.params = { id: 'the_person' };
        lineageModelGeneratorService.contact.resolves({
          doc: {
            _id: 'the_person',
            type: 'person_type',
          },
        });
        contactTypesService.get.resolves({});

        await createComponent();
        await fixture.whenStable();

        expect(contactTypesService.get.callCount).to.equal(1);
        expect(contactTypesService.get.args[0]).to.deep.equal(['person_type']);
        expect(dbGet.callCount).to.equal(0);
        expect(formService.render.callCount).to.equal(0);
        expect(component.enketoContact).to.deep.equal(undefined);
      });

      it('should fail when no form', async () => {
        routeSnapshot.params = { id: 'the_patient' };
        lineageModelGeneratorService.contact.resolves({
          doc: {
            _id: 'the_patient',
            type: 'patient',
          },
        });
        contactTypesService.get.resolves({
          edit_form: 'patient_edit_form',
          create_form: 'patient_create_form',
          edit_key: 'patient_edit_key',
        });
        dbGet.rejects({ status: 404 });
        await createComponent();
        await fixture.whenStable();

        expect(contactTypesService.get.callCount).to.equal(1);
        expect(contactTypesService.get.args[0]).to.deep.equal(['patient']);
        expect(dbGet.callCount).to.equal(1);
        expect(dbGet.args[0]).to.deep.equal(['patient_edit_form']);
        expect(formService.render.callCount).to.equal(0);
        expect(component.enketoContact).to.deep.equal(undefined);
        expect(component.contentError).to.equal(true);
      });

      it('should render form with edit form', async () => {
        routeSnapshot.params = { id: 'the_patient' };
        lineageModelGeneratorService.contact.resolves({
          doc: {
            _id: 'the_patient',
            type: 'patient',
          },
        });
        contactTypesService.get.resolves({
          edit_form: 'patient_edit_form',
          create_form: 'patient_create_form',
          edit_key: 'patient_edit_key',
        });
        dbGet.resolves({ _id: 'patient_edit_form', form: true });
        await createComponent();
        await fixture.whenStable();

        expect(contactTypesService.get.callCount).to.equal(1);
        expect(contactTypesService.get.args[0]).to.deep.equal(['patient']);
        expect(dbGet.callCount).to.equal(1);
        expect(dbGet.args[0]).to.deep.equal(['patient_edit_form']);
        expect(formService.render.callCount).to.equal(1);
        expect(formService.render.args[0][0]).to.deep.include({
          selector: '#contact-form',
          formDoc: { _id: 'patient_edit_form', form: true },
          instanceData: { patient: { type: 'patient', _id: 'the_patient' } },
          titleKey: 'patient_edit_key',
        });
        expect(component.enketoContact).to.deep.equal({
          docId: 'the_patient',
          formInstance: undefined,
          type: 'patient',
        });
        expect(component.contentError).to.equal(false);
        expect(performanceService.track.calledTwice).to.be.true;
        expect(stopPerformanceTrackStub.calledOnce).to.be.true;
        expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({
          name: 'enketo:contacts:patient_edit_form:edit:render',
          recordApdex: true,
        });
      });

      it('should render form with create form', async () => {
        routeSnapshot.params = { id: 'the_clinic' };
        lineageModelGeneratorService.contact.resolves({
          doc: {
            _id: 'the_clinic',
            type: 'contact',
            contact_type: 'a_clinic_type',
          },
        });
        contactTypesService.get.resolves({
          create_form: 'a_clinic_type_create_form',
          edit_key: 'edit_key',
        });
        dbGet.resolves({ _id: 'a_clinic_type_create_form', data: true });
        await createComponent();
        await fixture.whenStable();

        expect(contactTypesService.get.callCount).to.equal(1);
        expect(contactTypesService.get.args[0]).to.deep.equal(['a_clinic_type']);
        expect(dbGet.callCount).to.equal(1);
        expect(dbGet.args[0]).to.deep.equal(['a_clinic_type_create_form']);
        expect(formService.render.callCount).to.equal(1);
        expect(formService.render.args[0][0]).to.deep.include({
          selector: '#contact-form',
          formDoc: { _id: 'a_clinic_type_create_form', data: true },
          instanceData: { a_clinic_type: { type: 'contact', contact_type: 'a_clinic_type', _id: 'the_clinic' } },
          titleKey: 'edit_key',
        });
        expect(component.enketoContact).to.deep.equal({
          docId: 'the_clinic',
          formInstance: undefined,
          type: 'a_clinic_type',
        });
        expect(component.contentError).to.equal(false);
        expect(performanceService.track.calledTwice).to.be.true;
        expect(stopPerformanceTrackStub.calledOnce).to.be.true;
        expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({
          name: 'enketo:contacts:a_clinic_type_create_form:edit:render',
          recordApdex: true,
        });
      });

      it('should select correct form for correct type', async () => {
        routeSnapshot.params = { id: 'the_clinic' };
        lineageModelGeneratorService.contact.resolves({
          doc: {
            _id: 'the_clinic',
            type: 'clinic',
            contact_type: 'a_clinic_type',
          },
        });

        contactTypesService.getTypeId.returns('the correct type');
        contactTypesService.get.resolves({
          edit_form: 'the correct_edit_form',
          edit_key: 'edit_key',
        });
        dbGet.resolves({ _id: 'the correct_edit_form', data: true });

        await createComponent();
        await fixture.whenStable();

        expect(contactTypesService.get.callCount).to.equal(1);
        expect(contactTypesService.get.args[0]).to.deep.equal(['the correct type']);
        expect(dbGet.callCount).to.equal(1);
        expect(dbGet.args[0]).to.deep.equal(['the correct_edit_form']);
        expect(formService.render.callCount).to.equal(1);
        expect(formService.render.args[0][0]).to.deep.include({
          selector: '#contact-form',
          formDoc: { _id: 'the correct_edit_form', data: true },
          instanceData: { 'the correct type': { type: 'clinic', contact_type: 'a_clinic_type', _id: 'the_clinic' } },
          titleKey: 'edit_key',
        });
        expect(component.enketoContact).to.deep.equal({
          docId: 'the_clinic',
          formInstance: undefined,
          type: 'the correct type',
        });
        expect(component.contentError).to.equal(false);
        expect(performanceService.track.calledTwice).to.be.true;
        expect(stopPerformanceTrackStub.calledOnce).to.be.true;
        expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({
          name: 'enketo:contacts:the correct_edit_form:edit:render',
          recordApdex: true,
        });
      });
    });
  });

  describe('saving', () => {
    let setEnketoSavingStatus;
    let setEnketoError;

    beforeEach(() => {
      setEnketoSavingStatus = sinon.stub(GlobalActions.prototype, 'setEnketoSavingStatus');
      setEnketoError = sinon.stub(GlobalActions.prototype, 'setEnketoError');
    });

    it('should not save when already saving', async () => {
      await createComponent();

      component.enketoSaving = true;
      await component.save();

      expect(formService.saveContact.callCount).to.equal(0);
      expect(setEnketoSavingStatus.callCount).to.equal(0);
      expect(setEnketoError.callCount).to.equal(0);
    });

    it('should not save when invalid', async () => {
      await createComponent();
      await fixture.whenStable();

      component.enketoContact = {
        formInstance: {
          validate: sinon.stub().resolves(false),
        },
      };

      await component.save();
      expect(setEnketoSavingStatus.callCount).to.equal(2);
      expect(setEnketoSavingStatus.args).to.deep.equal([[true], [false]]);
      expect(setEnketoError.callCount).to.equal(1);
      expect(setEnketoError.args).to.deep.equal([[null]]);
      expect(component.enketoContact.formInstance.validate.callCount).to.equal(1);
      expect(formService.saveContact.callCount).to.equal(0);
      expect(telemetryService.record.notCalled).to.be.true;
    });

    it('should catch save errors', async () => {
      await createComponent();
      await fixture.whenStable();

      component.enketoContact = {
        formInstance: {
          validate: sinon.stub().resolves(true),
        },
        type: 'some_contact',
      };
      formService.saveContact.rejects({ some: 'error' });
      component.duplicates = [{ some: 'duplicates' }];

      await component.save();
      expect(setEnketoSavingStatus.callCount).to.equal(2);
      expect(setEnketoSavingStatus.args).to.deep.equal([[true], [false]]);
      expect(component.enketoContact.formInstance.validate.callCount).to.equal(1);
      expect(formService.saveContact.callCount).to.equal(1);
      expect(setEnketoError.callCount).to.equal(2);
      expect(telemetryService.record.notCalled).to.be.true;
      // Any duplicates should be cleared when the error is not DuplicatesFoundError
      expect(component.duplicates).to.be.empty;
    });

    it('when saving new contact', async () => {
      routeSnapshot.params = { type: 'clinic', parent_id: 'the_district' };
      contactTypesService.getChildren.resolves([{ id: 'clinic' }]);
      contactTypesService.get.resolves({
        create_form: 'clinic_create_form_id',
        create_key: 'clinic_create_key',
      });
      dbGet
        .withArgs('the_district')
        .resolves({ _id: 'the_district', type: 'clinic' });
      dbGet.resolves({ _id: 'clinic_create_form_id', the: 'form' });
      const form = {
        validate: sinon.stub().resolves(true),
      };
      formService.render.resolves(form);

      await createComponent();
      await fixture.whenStable();

      formService.saveContact.resolves({ docId: 'new_clinic_id' });

      await component.save();
      expect(performanceService.track.calledThrice).to.be.true;
      expect(stopPerformanceTrackStub.calledThrice).to.be.true;
      expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({
        name: 'enketo:contacts:clinic_create_form_id:add:render',
        recordApdex: true,
      });
      expect(stopPerformanceTrackStub.args[1][0]).to.deep.equal({
        name: 'enketo:contacts:clinic_create_form_id:add:user_edit_time',
      });
      expect(stopPerformanceTrackStub.args[2][0]).to.deep.equal({
        name: 'enketo:contacts:clinic_create_form_id:add:save',
        recordApdex: true,
      });
      expect(dbGet.callCount).to.equal(2);
      expect(dbGet.args[0]).to.deep.equal(['the_district']);
      expect(dbGet.args[1]).to.deep.equal(['clinic_create_form_id']);
      expect(setEnketoSavingStatus.callCount).to.equal(2);
      expect(setEnketoSavingStatus.args).to.deep.equal([[true], [false]]);
      expect(setEnketoError.callCount).to.equal(1);
      expect(formService.saveContact.callCount).to.equal(1);
      expect(formService.saveContact.args[0]).to.deep.equal([
        { docId: null, type: 'clinic' }, 
        { form, xmlVersion: undefined, duplicateCheck: undefined }, 
        false
      ]);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/contacts', 'new_clinic_id']]);
      expect(telemetryService.record.notCalled).to.be.true;
    });

    it('when editing existent contact of hardcoded type', async () => {
      routeSnapshot.params = { id: 'the_person' };
      lineageModelGeneratorService.contact.resolves({
        doc: {
          _id: 'the_person',
          type: 'person',
        }
      });
      contactTypesService.get.resolves({
        create_form: 'person_create_form_id',
        edit_form: 'person_edit_form_id',
        create_key: 'person_create_key',
      });
      dbGet.resolves({ _id: 'person_edit_form_id', the: 'form' });
      const form = {
        validate: sinon.stub().resolves(true),
      };
      formService.render.resolves(form);

      await createComponent();
      await fixture.whenStable();

      formService.saveContact.resolves({ docId: 'the_person' });

      await component.save();

      expect(setEnketoSavingStatus.callCount).to.equal(2);
      expect(setEnketoSavingStatus.args).to.deep.equal([[true], [false]]);
      expect(setEnketoError.callCount).to.equal(1);
      expect(formService.saveContact.callCount).to.equal(1);
      expect(formService.saveContact.args[0]).to.deep.equal([
        { docId: 'the_person', type: 'person',  },
        { form, xmlVersion: undefined, duplicateCheck: undefined }, 
        false
      ]);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/contacts', 'the_person']]);
      expect(performanceService.track.calledThrice).to.be.true;
      expect(stopPerformanceTrackStub.calledThrice).to.be.true;
      expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({
        name: 'enketo:contacts:person_edit_form_id:edit:render',
        recordApdex: true,
      });
      expect(stopPerformanceTrackStub.args[1][0]).to.deep.equal({
        name: 'enketo:contacts:person_edit_form_id:edit:user_edit_time',
      });
      expect(stopPerformanceTrackStub.args[2][0]).to.deep.equal({
        name: 'enketo:contacts:person_edit_form_id:edit:save',
        recordApdex: true,
      });
      expect(telemetryService.record.notCalled).to.be.true;
    });

    it('when editing existent contact of configurable type', async () => {
      routeSnapshot.params = { id: 'the_patient' };
      lineageModelGeneratorService.contact.resolves({
        doc: {
          _id: 'the_patient',
          type: 'contact',
          contact_type: 'patient',
        }
      });
      contactTypesService.get.resolves({
        create_form: 'patient_create_form_id',
        create_key: 'patient_create_key',
      });
      dbGet.resolves({ _id: 'patient_create_form_id', the: 'form' });
      const form = {
        validate: sinon.stub().resolves(true),
      };
      formService.render.resolves(form);

      await createComponent();
      await fixture.whenStable();

      formService.saveContact.resolves({ docId: 'the_patient' });

      await component.save();

      expect(setEnketoSavingStatus.callCount).to.equal(2);
      expect(setEnketoSavingStatus.args).to.deep.equal([[true], [false]]);
      expect(setEnketoError.callCount).to.equal(1);
      expect(formService.saveContact.callCount).to.equal(1);
      expect(formService.saveContact.args[0]).to.deep.equal([
        { docId: 'the_patient', type: 'patient' }, 
        { form, xmlVersion: undefined, duplicateCheck: undefined },
        false
      ]);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([['/contacts', 'the_patient']]);
      expect(performanceService.track.calledThrice).to.be.true;
      expect(stopPerformanceTrackStub.calledThrice).to.be.true;
      expect(stopPerformanceTrackStub.args[0][0]).to.deep.equal({
        name: 'enketo:contacts:patient_create_form_id:edit:render',
        recordApdex: true,
      });
      expect(stopPerformanceTrackStub.args[1][0]).to.deep.equal({
        name: 'enketo:contacts:patient_create_form_id:edit:user_edit_time',
      });
      expect(stopPerformanceTrackStub.args[2][0]).to.deep.equal({
        name: 'enketo:contacts:patient_create_form_id:edit:save',
        recordApdex: true,
      });
      expect(telemetryService.record.notCalled).to.be.true;
    });

    it('should catch duplicate siblings', async () => {
      routeSnapshot.params = { type: 'clinic', parent_id: 'the_district' };
      contactTypesService.getChildren.resolves([{ id: 'clinic' }]);
      contactTypesService.get.resolves({
        create_form: 'clinic_create_form_id',
        create_key: 'clinic_create_key',
      });
      dbGet
        .withArgs('the_district')
        .resolves({ _id: 'the_district', type: 'clinic' });
      dbGet.resolves({ _id: 'clinic_create_form_id', the: 'form' });
      const form = {
        validate: sinon.stub().resolves(true),
      };
      formService.render.resolves(form);

      await createComponent();
      await fixture.whenStable();

      formService.saveContact.rejects(new DuplicatesFoundError('Duplicates found', [
        {
          _id: 'sib2',
          _rev: '1',
          name: 'Sibling2',
          parent: { _id: 'parent1' },
          type: 'the_district',
          reported_date: new Date(1736845534000)
        }
      ]));

      await component.save();

      expect(setEnketoSavingStatus.callCount).to.equal(2);
      expect(setEnketoSavingStatus.args).to.deep.equal([[true], [false]]);
      expect(component.enketoContact.formInstance.validate.callCount).to.equal(1);
      expect(formService.saveContact.callCount).to.equal(1);
      expect(setEnketoError.callCount).to.equal(2);
      expect(component.duplicates.length).to.equal(1);
      expect(telemetryService.record.notCalled).to.be.true;
    });
  });

  describe('toggleDuplicatesAcknowledged', () => {
    it('should set acknowledge to true', async () => {
      routeSnapshot.params = { type: 'clinic', parent_id: 'the_district' };
      contactTypesService.getChildren.resolves([{ id: 'clinic' }]);
      contactTypesService.get.resolves({
        create_form: 'clinic_create_form_id',
        create_key: 'clinic_create_key',
      });
      dbGet
        .withArgs('the_district')
        .resolves({ _id: 'the_district', type: 'clinic' });
      dbGet.resolves({ _id: 'clinic_create_form_id', the: 'form' });
      const form = {
        validate: sinon.stub().resolves(true),
      };
      formService.render.resolves(form);
      const setEnketoError = sinon.stub(GlobalActions.prototype, 'setEnketoError');
      await createComponent();
      await fixture.whenStable();
      expect(component.duplicatesAcknowledged).to.equal(false);
      const duplicateContact = {
        _id: 'sib2',
        _rev: '1',
        name: 'Sibling2',
        parent: { _id: 'parent1' },
        type: 'the_district',
        reported_date: new Date(1736845534000)
      };

      component.enketoError = new DuplicatesFoundError('Duplicates found', []);
      component.duplicates = [duplicateContact];
      component.toggleDuplicatesAcknowledged();

      expect(setEnketoError.calledOnceWithExactly(null)).to.be.true;
      expect(component.duplicates).to.deep.equal([duplicateContact]);
      formService.saveContact.resolves({ docId: 'new_clinic_id' });

      await component.save();

      expect(component.duplicatesAcknowledged).to.equal(true);
      expect(formService.saveContact.args[0]).to.deep.equal([
        { docId: null, type: 'clinic' },
        { form, xmlVersion: undefined, duplicateCheck: undefined },
        true
      ]);
      expect(telemetryService.record.calledOnceWithExactly(
        'enketo:contacts:clinic:duplicates_acknowledged'
      )).to.be.true;
      setEnketoError.resetHistory();

      component.toggleDuplicatesAcknowledged();

      expect(component.duplicatesAcknowledged).to.equal(false);
      expect(setEnketoError.notCalled).to.be.true;
      expect(component.duplicates).to.deep.equal([duplicateContact]);

      component.toggleDuplicatesAcknowledged();
      expect(component.duplicatesAcknowledged).to.equal(true);
    });

    it('does nothing if no duplicates exist', async () => {
      routeSnapshot.params = { type: 'clinic', parent_id: 'the_district' };
      contactTypesService.getChildren.resolves([{ id: 'clinic' }]);
      contactTypesService.get.resolves({
        create_form: 'clinic_create_form_id',
        create_key: 'clinic_create_key',
      });
      dbGet
        .withArgs('the_district')
        .resolves({ _id: 'the_district', type: 'clinic' });
      dbGet.resolves({ _id: 'clinic_create_form_id', the: 'form' });
      const form = {
        validate: sinon.stub().resolves(true),
      };
      formService.render.resolves(form);
      const setEnketoError = sinon.stub(GlobalActions.prototype, 'setEnketoError');
      await createComponent();
      await fixture.whenStable();
      expect(component.duplicatesAcknowledged).to.equal(false);

      component.enketoError = new Error('Not Duplicates error');
      component.toggleDuplicatesAcknowledged();

      expect(setEnketoError.notCalled).to.be.true;
      formService.saveContact.resolves({ docId: 'new_clinic_id' });

      await component.save();

      expect(component.duplicatesAcknowledged).to.equal(true);
      expect(formService.saveContact.args[0]).to.deep.equal([
        { docId: null, type: 'clinic' },
        { form, xmlVersion: undefined, duplicateCheck: undefined },
        true
      ]);
      expect(telemetryService.record.notCalled).to.be.true;
    });
  });
});
