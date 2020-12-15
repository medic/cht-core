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
  let contactTypes;
  let translateHelperService;
  //let store;
  let router;
  let route;
  let dbGet;
  let createComponent;
  let fixture;
  //let component;
  let enketoService;

  beforeEach(() => {
    contactTypes = { get: sinon.stub().resolves({}) };
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
        { provide: ContactTypesService, useValue: contactTypes },
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
        //component = fixture.componentInstance;
        fixture.detectChanges();
        //store = TestBed.inject(MockStore);
      });
    };
  });

  afterEach(() => sinon.restore());

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
