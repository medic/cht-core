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
import { ComponentsModule } from '@mm-components/components.module';
import { TranslateService } from '@mm-services/translate.service';
import { DbService } from '@mm-services/db.service';
import { Selectors } from '@mm-selectors/index';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { EnketoService } from '@mm-services/enketo.service';
import { ContactSaveService } from '@mm-services/contact-save.service';
import { GlobalActions } from '@mm-actions/global';


describe('ContactsEdit component', () => {
  let contactTypesService;
  let translateService;
  let router;
  let route;
  let dbGet;
  let createComponent;
  let fixture;
  let component;
  let enketoService;
  let lineageModelGeneratorService;
  let contactSaveService;
  let routeSnapshot;

  beforeEach(() => {
    contactTypesService = {
      get: sinon.stub().resolves(),
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
    enketoService = {
      renderContactForm: sinon.stub(),
      unload: sinon.stub(),
    };
    lineageModelGeneratorService = { contact: sinon.stub().resolves({ doc: { } }) };
    contactSaveService =  { save: sinon.stub() };

    sinon.stub(console, 'error');

    const mockedSelectors = [
      { selector: Selectors.getEnketoStatus, value: { } },
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
        ComponentsModule,
      ],
      providers: [
        provideMockStore({ selectors: mockedSelectors }),
        { provide: TranslateService, useValue: translateService },
        { provide: DbService, useValue: { get: () => ({ get: dbGet }) } },
        { provide: Router, useValue: router  },
        { provide: ActivatedRoute, useValue: route },
        { provide: LineageModelGeneratorService, useValue: lineageModelGeneratorService },
        { provide: EnketoService, useValue: enketoService },
        { provide: ContactTypesService, useValue: contactTypesService },
        { provide: ContactSaveService, useValue: contactSaveService },
      ],
      declarations: [
        EnketoComponent,
        ContactsEditComponent,
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
      expect(router.navigate.args[0]).to.deep.equal([[ '/contacts' ]]);
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
        expect(router.navigate.args[0]).to.deep.equal([[ '/contacts', 'parent_id' ]]);
      });

    it('cancelling falls back to parent contact if new contact and query does not have `from` param', async () => {
      let cancelCallback;
      routeSnapshot.params = { parent_id: 'parent_id' };
      sinon.stub(GlobalActions.prototype, 'setCancelCallback').callsFake(func => cancelCallback = func);

      await createComponent();
      route.queryParams.next();

      cancelCallback();

      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([[ '/contacts', 'parent_id' ]]);
    });

    it('cancelling falls back to contact if edit contact', async () => {
      let cancelCallback;
      routeSnapshot.params = { id: 'id' };
      sinon.stub(GlobalActions.prototype, 'setCancelCallback').callsFake(func => cancelCallback = func);

      await createComponent();
      route.queryParams.next();

      cancelCallback();

      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([[ '/contacts', 'id' ]]);
    });
  });

  describe('initialization', () => {
    it('should initialize the component', async () => {
      const setLoadingContent = sinon.stub(GlobalActions.prototype, 'setLoadingContent');
      const setShowContent = sinon.stub(GlobalActions.prototype, 'setShowContent');
      const unsetSelected = sinon.stub(GlobalActions.prototype, 'unsetSelected');
      const settingSelected = sinon.stub(GlobalActions.prototype, 'settingSelected');
      await createComponent();

      expect(component.routeSnapshot).to.equal(routeSnapshot);
      // Set loading content before and after form initialization.
      expect(setLoadingContent.args).to.deep.equal([[true], [false]]);
      expect(setShowContent.args).to.deep.equal([[true]]);
      expect(unsetSelected.callCount).to.equal(1);
      expect(settingSelected.callCount).to.equal(1);
    });

    it('should unsubscribe on destroy', async () => {
      await createComponent();

      const spy = sinon.spy(component.subscription, 'unsubscribe');
      component.ngOnDestroy();
      expect(spy.callCount).to.equal(1);
      expect(enketoService.unload.callCount).to.equal(0);
    });

    it('should unload form on destroy', async () => {
      await createComponent();

      const spy = sinon.spy(component.subscription, 'unsubscribe');
      component.enketoContact = { formInstance: 'form instance' };
      component.ngOnDestroy();

      expect(spy.callCount).to.equal(1);
      expect(enketoService.unload.callCount).to.equal(1);
      expect(enketoService.unload.args[0]).to.deep.equal(['form instance']);
    });

    it('should respond to url changes', fakeAsync(async () => {
      routeSnapshot.params = { type: 'random' };
      route.params.next({ type: 'random' });

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
      expect(enketoService.renderContactForm.callCount).to.equal(1);

      expect(enketoService.renderContactForm.args[0][0]).to.deep.include({
        selector: '#contact-form',
        formDoc: { _id: 'random_create', the: 'form' },
        instanceData: { random: { type: 'contact', contact_type: 'random', parent: '' } },
        titleKey: 'random',
      });

      routeSnapshot = { params: { type: 'other' } };
      route.params.next({ type: 'other' });

      await fixture.whenStable();
      flushMicrotasks();

      expect(dbGet.callCount).to.equal(2);
      expect(contactTypesService.get.callCount).to.equal(2);
      expect(enketoService.renderContactForm.callCount).to.equal(2);
      expect(enketoService.renderContactForm.args[1][0]).to.deep.include({
        selector: '#contact-form',
        formDoc: { _id: 'other_create' },
        instanceData: { other: { type: 'contact', contact_type: 'other', parent: '' } },
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
        expect(enketoService.renderContactForm.callCount).to.equal(0);
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
        expect(enketoService.renderContactForm.callCount).to.equal(0);
        expect(component.enketoContact).to.deep.equal(undefined);
      });

      it('should fail when no form', async () => {
        routeSnapshot.params = { type: 'person' };
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
        expect(enketoService.renderContactForm.callCount).to.equal(0);
        expect(component.enketoContact).to.deep.equal(undefined);
        expect(component.contentError).to.equal(true);
      });

      it('should render form with parent', async () => {
        routeSnapshot.params = { type: 'clinic', parent_id: 'the_district' };
        contactTypesService.get.resolves({
          create_form: 'clinic_create_form_id',
          create_key: 'clinic_create_key',
        });
        dbGet.resolves({ _id: 'clinic_create_form_id', the: 'form' });

        await createComponent();
        await fixture.whenStable();

        expect(contactTypesService.get.callCount).to.equal(1);
        expect(contactTypesService.get.args[0]).to.deep.equal(['clinic']);
        expect(dbGet.callCount).to.equal(1);
        expect(dbGet.args[0]).to.deep.equal(['clinic_create_form_id']);
        expect(component.enketoContact).to.deep.equal({
          type: 'clinic',
          formInstance: undefined,
          docId: null,
        });
        expect(enketoService.renderContactForm.callCount).to.equal(1);
        expect(enketoService.renderContactForm.args[0][0]).to.deep.include({
          selector: '#contact-form',
          formDoc: { _id: 'clinic_create_form_id', the: 'form' },
          instanceData: { clinic: { type: 'contact', contact_type: 'clinic', parent: 'the_district' } },
          titleKey: 'clinic_create_key',
        });
        expect(component.contentError).to.equal(false);
      });

      it('should render form without parent', async () => {
        routeSnapshot.params = { type: 'district_hospital' };
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
        expect(enketoService.renderContactForm.callCount).to.equal(1);
        expect(enketoService.renderContactForm.args[0][0]).to.deep.include({
          selector: '#contact-form',
          formDoc: { _id: 'district_create_form_id', the: 'form' },
          instanceData: { district_hospital: { type: 'contact', contact_type: 'district_hospital', parent: '' } },
          titleKey: 'district_create_key',
        });
        expect(component.contentError).to.equal(false);
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
        expect(enketoService.renderContactForm.callCount).to.equal(0);
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
        expect(enketoService.renderContactForm.callCount).to.equal(0);
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
        expect(enketoService.renderContactForm.callCount).to.equal(0);
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
        expect(enketoService.renderContactForm.callCount).to.equal(1);
        expect(enketoService.renderContactForm.args[0][0]).to.deep.include({
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
        expect(enketoService.renderContactForm.callCount).to.equal(1);
        expect(enketoService.renderContactForm.args[0][0]).to.deep.include({
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
        expect(enketoService.renderContactForm.callCount).to.equal(1);
        expect(enketoService.renderContactForm.args[0][0]).to.deep.include({
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

      expect(contactSaveService.save.callCount).to.equal(0);
      expect(setEnketoSavingStatus.callCount).to.equal(0);
      expect(setEnketoError.callCount).to.equal(0);
    });

    it('should not save when invalid', async() => {
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
      expect(contactSaveService.save.callCount).to.equal(0);
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
      contactSaveService.save.rejects({ some: 'error' });

      await component.save();
      expect(setEnketoSavingStatus.callCount).to.equal(2);
      expect(setEnketoSavingStatus.args).to.deep.equal([[true], [false]]);
      expect(component.enketoContact.formInstance.validate.callCount).to.equal(1);
      expect(contactSaveService.save.callCount).to.equal(1);
      expect(setEnketoError.callCount).to.equal(2);
    });

    it('when saving new contact', async () => {
      routeSnapshot.params = { type: 'clinic', parent_id: 'the_district' };
      contactTypesService.get.resolves({
        create_form: 'clinic_create_form_id',
        create_key: 'clinic_create_key',
      });
      dbGet.resolves({ _id: 'clinic_create_form_id', the: 'form' });
      const form = {
        validate: sinon.stub().resolves(true),
      };
      enketoService.renderContactForm.resolves(form);

      await createComponent();
      await fixture.whenStable();

      contactSaveService.save.resolves({ docId: 'new_clinic_id' });

      await component.save();

      expect(setEnketoSavingStatus.callCount).to.equal(2);
      expect(setEnketoSavingStatus.args).to.deep.equal([[true], [false]]);
      expect(setEnketoError.callCount).to.equal(1);
      expect(contactSaveService.save.callCount).to.equal(1);
      expect(contactSaveService.save.args[0]).to.deep.equal([ form, null, 'clinic', undefined ]);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([
        ['/contacts', 'new_clinic_id'],
        { state: { usageAnalyticsValue: 'clinic' } },
      ]);
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
      enketoService.renderContactForm.resolves(form);

      await createComponent();
      await fixture.whenStable();

      contactSaveService.save.resolves({ docId: 'the_person' });

      await component.save();

      expect(setEnketoSavingStatus.callCount).to.equal(2);
      expect(setEnketoSavingStatus.args).to.deep.equal([[true], [false]]);
      expect(setEnketoError.callCount).to.equal(1);
      expect(contactSaveService.save.callCount).to.equal(1);
      expect(contactSaveService.save.args[0]).to.deep.equal([ form, 'the_person', 'person', undefined ]);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([
        ['/contacts', 'the_person'],
        { state: { usageAnalyticsValue: 'person' } },
      ]);
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
      enketoService.renderContactForm.resolves(form);

      await createComponent();
      await fixture.whenStable();

      contactSaveService.save.resolves({ docId: 'the_patient' });

      await component.save();

      expect(setEnketoSavingStatus.callCount).to.equal(2);
      expect(setEnketoSavingStatus.args).to.deep.equal([[true], [false]]);
      expect(setEnketoError.callCount).to.equal(1);
      expect(contactSaveService.save.callCount).to.equal(1);
      expect(contactSaveService.save.args[0]).to.deep.equal([ form, 'the_patient', 'patient', undefined ]);
      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([
        ['/contacts', 'the_patient'],
        { state: { usageAnalyticsValue: 'patient' } },
      ]);
    });
  });
});
