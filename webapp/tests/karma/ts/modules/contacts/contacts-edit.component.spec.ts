import { TestBed } from '@angular/core/testing';
import { provideMockStore/*, MockStore*/ } from '@ngrx/store/testing';
import { Subject } from 'rxjs';
import { expect } from 'chai';
import sinon from 'sinon';
import { ActivatedRoute, Router } from '@angular/router';

import { ContactTypesService } from '@mm-services/contact-types.service';
import { EnketoComponent } from '@mm-components/enketo/enketo.component';
import { ContactsEditComponent } from '@mm-modules/contacts/contacts-edit.component';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { ComponentsModule } from '@mm-components/components.module';
import { TranslateHelperService } from '@mm-services/translate-helper.service';
import { DbService } from '@mm-services/db.service';
import { Selectors } from '@mm-selectors/index';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { EnketoService } from '@mm-services/enketo.service';
import { ContactSaveService } from '@mm-services/contact-save.service';
import { GlobalActions } from '@mm-actions/global';


describe('ContactsEdit component', () => {
  let contactTypesService;
  let translateHelperService;
  //let store;
  let router;
  let route;
  let dbGet;
  let createComponent;
  let fixture;
  let component;
  let enketoService;

  beforeEach(() => {
    contactTypesService = { get: sinon.stub().resolves() };
    translateHelperService = { get: sinon.stub().resolvesArg(0) };
    dbGet = sinon.stub().resolves();
    router = { navigate: sinon.stub() };
    route = {
      snapshot: { params: {}, queryParams: {} },
      params: new Subject(),
      queryParams: new Subject(),
    };
    enketoService = {
      renderContactForm: sinon.stub(),
      unload: sinon.stub(),
    };

    const mockedSelectors = [
      { selector: Selectors.getEnketoStatus, value: {  } },
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
        { provide: TranslateHelperService, useValue: translateHelperService },
        { provide: DbService, useValue: { get: () => ({ get: dbGet }) } },
        { provide: Router, useValue: router  },
        { provide: ActivatedRoute, useValue: route },
        { provide: LineageModelGeneratorService, useValue: { contact: sinon.stub().resolves({ doc: {}}) } },
        { provide: EnketoService, useValue: enketoService },
        { provide: ContactTypesService, useValue: contactTypesService },
        { provide: ContactSaveService, useValue: { save: sinon.stub() } },
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
        //store = TestBed.inject(MockStore);
      });
    };
  });

  afterEach(() => sinon.restore());

  describe('cancelCallback', () => {

    it('cancelling redirects to contacts list when query has `from` param equal to `list`', async () => {
      let cancelCallback;
      sinon.stub(GlobalActions.prototype, 'setCancelCallback').callsFake(func => cancelCallback = func);

      await createComponent();
      route.snapshot.queryParams = { from: 'list' };
      route.queryParams.next();

      cancelCallback();

      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([[ '/contacts' ]]);
    });

    it('cancelling falls back to parent contact if new contact and query `from` param is not equal to `list`',
      async () => {
        let cancelCallback;
        route.snapshot.params = { parent_id: 'parent_id' };
        sinon.stub(GlobalActions.prototype, 'setCancelCallback').callsFake(func => cancelCallback = func);

        await createComponent();
        route.snapshot.queryParams = { from: 'something' };
        route.queryParams.next();

        cancelCallback();

        expect(router.navigate.callCount).to.equal(1);
        expect(router.navigate.args[0]).to.deep.equal([[ '/contacts', 'parent_id' ]]);
      });

    it('cancelling falls back to parent contact if new contact and query does not have `from` param', async () => {
      let cancelCallback;
      route.snapshot.params = { parent_id: 'parent_id' };
      sinon.stub(GlobalActions.prototype, 'setCancelCallback').callsFake(func => cancelCallback = func);

      await createComponent();
      route.queryParams.next();

      cancelCallback();

      expect(router.navigate.callCount).to.equal(1);
      expect(router.navigate.args[0]).to.deep.equal([[ '/contacts', 'parent_id' ]]);
    });

    it('cancelling falls back to contact if edit contact', async () => {
      let cancelCallback;
      route.snapshot.params = { id: 'id' };
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
      await createComponent();

      expect(component.routeSnapshot).to.equal(route.snapshot);
      expect(setLoadingContent.args[0]).to.deep.equal([true]);
      expect(setShowContent.args).to.deep.equal([[true]]);
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
  });

  describe('loading form', () => {
    describe('for new contact', () => {
      it('should fail when no type', async () => {
        await createComponent();
        await component.ngAfterViewInit();

        expect(contactTypesService.get.callCount).to.equal(1);
        expect(contactTypesService.args[0]).to.deep.equal([undefined]);
        expect(dbGet.callCount).to.equal(0);
        expect(enketoService.renderContactForm.callCount).to.equal(0);
        expect(component.enketoContact).to.deep.equal({
          type: 'contact',
          formInstance: false,
          docId: undefined,
        });
      });

      it('should fail when no formid', async () => {
        route.snapshot.params = { type: 'random' };
        await createComponent();
        await component.ngAfterViewInit();

        expect(contactTypesService.get.callCount).to.equal(1);
        expect(contactTypesService.args[0]).to.deep.equal(['random']);
        expect(dbGet.callCount).to.equal(0);
        expect(enketoService.renderContactForm.callCount).to.equal(0);
        expect(component.enketoContact).to.deep.equal({
          type: 'contact',
          formInstance: false,
          docId: undefined,
        });
      });

      it('should fail when no form', async () => {
        route.snapshot.params = { type: 'person' };
        contactTypesService.get.resolves({});
        await createComponent();
        await component.ngAfterViewInit();

        expect(contactTypesService.get.callCount).to.equal(1);
        expect(contactTypesService.args[0]).to.deep.equal(['person']);
        expect(dbGet.callCount).to.equal(0);
        expect(enketoService.renderContactForm.callCount).to.equal(0);
        expect(component.enketoContact).to.deep.equal({
          type: 'contact',
          formInstance: false,
          docId: undefined,
        });

      });

      it('should render form', () => {

      });
    });

    describe('for existent contact', () => {
      it('should fail when no type', () => {

      });

      it('should fail when no formid', () => {

      });

      it('should fail when no form', () => {

      });

      it('should render form', () => {

      });
    });
  });

  describe('saving', () => {
    it('should not save when already saving', () => {

    });

    it('should not save when invalid', () => {

    });

    it('should catch save errors', () => {

    });

    it('when saving new contact', () => {

    });

    it('when editing existent contact', () => {

    });
  });
});
