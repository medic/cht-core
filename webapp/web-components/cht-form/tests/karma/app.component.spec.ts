import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import moment from 'moment';
import { toBik_text } from 'bikram-sambat';
import sinon from 'sinon';
import { expect } from 'chai';

import { AppComponent } from '../../src/app.component';
import * as medicXpathExtensions from '../../../../src/js/enketo/medic-xpath-extensions';
import { EnketoService } from '@mm-services/enketo.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';

describe('AppComponent', () => {
  const FORM_ID = 'cht-form-id';
  const FORM_HTML = '<div>my form</div>';
  const FORM_MODEL = '<model></model>';
  const FORM_XML = '<form></form>';
  const USER = {
    contact_id: 'default_user',
    language: 'en',
  } as const;

  let chtDatasourceService;
  let enketoService;
  let enketoForm;
  let fixture;

  const getComponent = () => {
    fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  beforeEach(async () => {
    chtDatasourceService = {
      getSync: sinon.stub(),
      addExtensionLib: sinon.stub(),
      clearExtensionLibs: sinon.stub(),
    };
    enketoForm = {
      form: { },
      config: { doc: { _id: FORM_ID }, type: 'report' },
    };
    enketoService = {
      renderForm: sinon
        .stub()
        .resolves(enketoForm),
      saveReport: sinon.stub(),
      saveContact: sinon.stub(),
      unload: sinon.stub(),
    };
    await TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          AppComponent
        ],
        providers: [
          { provide: CHTDatasourceService, useValue: chtDatasourceService },
          { provide: EnketoService, useValue: enketoService },
        ]
      })
      .compileComponents();
  });

  afterEach(sinon.restore);

  it('creates component and init XPath extensions', async () => {
    const medicXpathExtensionsInit = sinon.spy(medicXpathExtensions, 'init');
    const mockChtApi = {};
    chtDatasourceService.getSync.returns(mockChtApi);
    const component = await getComponent();

    expect(component).to.exist;
    expect(medicXpathExtensionsInit.args).to.deep.equal([[{}, toBik_text, moment, mockChtApi]]);
    expect(component.formId).to.eq(FORM_ID);
    expect(component.editing).to.be.false;
    expect(component.status).to.deep.equal({
      saving: false,
      error: null
    });
    expect(component.formContext.formConfig).to.deep.include({
      doc: { _id: FORM_ID },
      type: 'report',
      html: '',
      model: '',
      repeatPaths: []
    });
  });

  it('renders form when required fields are set', fakeAsync(async () => {
    const component = await getComponent();
    const onRender = sinon.stub();
    component.onRender.subscribe(onRender);

    expect(enketoService.renderForm.called).to.be.false;
    expect(onRender.called).to.be.false;
    component.formXml = FORM_XML;
    tick();
    expect(enketoService.renderForm.called).to.be.false;
    expect(onRender.called).to.be.false;
    component.formModel = FORM_MODEL;
    tick();
    expect(enketoService.renderForm.called).to.be.false;
    expect(onRender.called).to.be.false;
    component.formHtml = FORM_HTML;
    tick();

    expect(enketoService.renderForm.callCount).to.equal(1);
    expect(onRender.callCount).to.equal(1);
    const actualContext = enketoService.renderForm.args[0][0];
    expect(actualContext).to.deep.include({
      selector: `#${FORM_ID}`,
      type: 'report',
      instanceData: undefined
    });
    expect(actualContext.contactSummary).to.be.undefined;
    expect(actualContext.editedListener).to.exist;
    expect(actualContext.valuechangeListener).to.exist;
    expect(actualContext.formConfig).to.deep.include({
      doc: { _id: FORM_ID },
      type: 'report',
      html: FORM_HTML,
      model: FORM_MODEL,
      repeatPaths: []
    });
    expect(enketoService.renderForm.args[0][1]).to.deep.equal(USER);
    expect(enketoService.unload.called).to.be.false;
  }));

  it('logs an error and does not emit onRender when rendering the form fails', fakeAsync(async () => {
    const consoleError = sinon.stub(console, 'error');
    const renderError = new Error('render failed');
    enketoService.renderForm.rejects(renderError);
    const component = await getComponent();
    const onRender = sinon.stub();
    component.onRender.subscribe(onRender);

    component.formXml = FORM_XML;
    component.formModel = FORM_MODEL;
    component.formHtml = FORM_HTML;
    tick();

    expect(enketoService.renderForm.callCount).to.equal(1);
    expect(onRender.called).to.be.false;
    expect(consoleError.calledOnceWithExactly('Error rendering form: ', renderError)).to.be.true;
  }));

  it('renders form with optional field values', fakeAsync(async () => {
    const formId = 'test-form-id';
    const formModel = '<model><instance id="contact-summary" /></model>';
    const user = {
      contact_id: 'spanish_user',
      language: 'es',
      custom: 'user field'
    };
    const contactSummary = { hello: 'world' };
    const content = { my: 'content' };

    const component = await getComponent();
    const onRender = sinon.stub();
    component.onRender.subscribe(onRender);
    component.formId = formId;
    // Trigger change detection to update the bound id attribute
    fixture.detectChanges();
    tick();
    component.user = user;
    tick();
    component.contactSummary = contactSummary;
    tick();
    component.contactType = 'person';
    tick();
    component.content = content;
    tick();
    component.extensionLibs = {
      hello: 'world',
      world: 'hello'
    };
    tick();
    component.formXml = FORM_XML;
    tick();
    component.formModel = formModel;
    tick();
    component.formHtml = FORM_HTML;
    tick();

    expect(chtDatasourceService.addExtensionLib.args).to.deep.equal([['hello', 'world'], ['world', 'hello']]);
    expect(enketoService.renderForm.callCount).to.equal(1);
    expect(onRender.callCount).to.equal(1);
    const actualContext = enketoService.renderForm.args[0][0];
    expect(actualContext).to.deep.include({
      selector: `#${formId}`,
      type: 'contact',
      instanceData: content,
      contactSummary: { id: 'contact-summary', context: contactSummary }
    });
    expect(actualContext.editedListener).to.exist;
    expect(actualContext.valuechangeListener).to.exist;
    expect(actualContext.formConfig).to.deep.include({
      doc: { _id: formId },
      type: 'contact',
      html: FORM_HTML,
      model: formModel,
      repeatPaths: []
    });
    expect(enketoService.renderForm.args[0][1]).to.deep.equal(user);
    expect(enketoService.unload.called).to.be.false;

    // Null out the optional fields and render again
    component.contactSummary = undefined;
    component.contactType = undefined;
    component.content = undefined;
    component.extensionLibs = undefined;
    tick();

    // Form is rendered again, but without optional fields
    expect(chtDatasourceService.clearExtensionLibs.calledOnceWithExactly()).to.be.true;
    expect(enketoService.renderForm.callCount).to.equal(3);
    expect(onRender.callCount).to.equal(3);
    const actualContext1 = enketoService.renderForm.args[2][0];
    expect(actualContext1).to.deep.include({
      selector: `#${formId}`,
      type: 'report',
      instanceData: undefined
    });
    expect(actualContext1.contactSummary).to.be.undefined;
    expect(actualContext1.formConfig).to.deep.include({
      doc: { _id: formId },
      type: 'report',
      html: FORM_HTML,
      model: formModel,
      repeatPaths: []
    });
    expect(enketoService.renderForm.args[2][1]).to.deep.equal(user);
    expect(enketoService.unload.args).to.deep.equal([[enketoForm.form], [enketoForm.form]]);
  }));

  it('renders form with default fields missing from the provided user', fakeAsync(async () => {
    const component = await getComponent();
    component.user = { hello: 'world' };
    tick();
    component.formXml = FORM_XML;
    tick();
    component.formModel = FORM_MODEL;
    tick();
    component.formHtml = FORM_HTML;
    tick();
    expect(enketoService.renderForm.callCount).to.equal(1);
    expect(enketoService.renderForm.args[0][1]).to.deep.equal({
      contact_id: 'default_user',
      language: 'en',
      hello: 'world'
    });
  }));

  it('waits for form id to be set on DOM when rendering', fakeAsync(async () => {
    const MutationObserver = global.MutationObserver;
    const mutationObserverMock = {
      observe: sinon.stub(),
      disconnect: sinon.stub(),
      takeRecords: sinon.stub(),
    };
    const mutationObserverConst = sinon.stub().returns(mutationObserverMock);
    global.MutationObserver = mutationObserverConst as any;

    try {
      const formId = 'test-form-id';
      const component = await getComponent();
      const onRender = sinon.stub();
      component.onRender.subscribe(onRender);

      component.formId = formId;
      component.formXml = FORM_XML;
      component.formModel = FORM_MODEL;
      component.formHtml = FORM_HTML;
      tick();
      // Trigger change detection to update the bound id attribute
      fixture.detectChanges();
      expect(mutationObserverConst.callCount).to.equal(1);
      expect(mutationObserverMock.observe.callCount).to.equal(1);
      expect(mutationObserverMock.observe.args[0]).to.deep.equal([
        $('.body').get(0)!,
        {
          subtree: true,
          attributeFilter: ['id'],
        }
      ]);
      // Manually trigger the observer callback
      mutationObserverConst.args[0][0]();
      expect(mutationObserverMock.disconnect.callCount).to.equal(1);
      tick();

      expect(enketoService.renderForm.callCount).to.equal(1);
      expect(onRender.callCount).to.equal(1);
      const actualContext = enketoService.renderForm.args[0][0];
      expect(actualContext).to.deep.include({
        selector: `#${formId}`,
        type: 'report',
        instanceData: undefined
      });
      expect(actualContext.contactSummary).to.be.undefined;
      expect(actualContext.formConfig).to.deep.include({
        doc: { _id: formId },
        type: 'report',
        html: FORM_HTML,
        model: FORM_MODEL,
        repeatPaths: []
      });
    } finally {
      global.MutationObserver = MutationObserver;
    }
  }));

  it('renders form with proper source value when contact is provided', fakeAsync(async () => {
    const content = { contact: { name: 'my contact' } };

    const component = await getComponent();
    component.content = content;
    tick();
    component.formXml = FORM_XML;
    tick();
    component.formModel = FORM_MODEL;
    tick();
    component.formHtml = FORM_HTML;
    tick();
    expect(enketoService.renderForm.callCount).to.equal(1);
    const actualContext = enketoService.renderForm.args[0][0];
    expect(actualContext).to.deep.include({
      selector: `#${FORM_ID}`,
      type: 'report',
      instanceData: { ...content, source: 'contact' }
    });
    expect(actualContext.contactSummary).to.be.undefined;
    expect(actualContext.formConfig).to.deep.include({
      doc: { _id: FORM_ID },
      type: 'report',
      html: FORM_HTML,
      model: FORM_MODEL,
      repeatPaths: []
    });
  }));

  it('renders form with given source value even if contact is provided', fakeAsync(async () => {
    const content = {
      contact: { name: 'my contact' },
      source: 'task'
    };

    const component = await getComponent();
    component.content = content;
    tick();
    component.formXml = FORM_XML;
    tick();
    component.formModel = FORM_MODEL;
    tick();
    component.formHtml = FORM_HTML;
    tick();
    expect(enketoService.renderForm.callCount).to.equal(1);
    const actualContext = enketoService.renderForm.args[0][0];
    expect(actualContext).to.deep.include({
      selector: `#${FORM_ID}`,
      type: 'report',
      instanceData: content
    });
    expect(actualContext.contactSummary).to.be.undefined;
    expect(actualContext.formConfig).to.deep.include({
      doc: { _id: FORM_ID },
      type: 'report',
      html: FORM_HTML,
      model: FORM_MODEL,
      repeatPaths: []
    });
  }));

  it('re-renders form when any field is set', fakeAsync(async () => {
    const firstFormId = 'first-form-id';
    const formId = 'test-form-id';
    const formModel = '<model><instance id="contact-summary" /></model>';
    const user = {
      contact_id: 'spanish_user',
      language: 'es',
    };
    const contactSummary = { hello: 'world' };
    const content = { my: 'content' };

    const component = await getComponent();
    const onRender = sinon.stub();
    component.onRender.subscribe(onRender);
    component.formXml = FORM_XML;
    component.formModel = formModel;
    component.formHtml = FORM_HTML;
    component.formId = firstFormId;
    // Trigger change detection to update the bound id attribute
    fixture.detectChanges();
    component.user = user;
    component.contactSummary = contactSummary;
    component.contactType = 'person';
    component.content = content;
    // Set the form ID again
    component.formId = formId;
    // Trigger change detection to update the bound id attribute
    fixture.detectChanges();
    tick();
    // The queue of renderForm calls gets processed in the tick
    expect(enketoService.renderForm.callCount).to.equal(1);
    expect(onRender.callCount).to.equal(1);
    // The last render call contains the latest values
    const actualContext = enketoService.renderForm.args[0][0];
    expect(actualContext).to.deep.include({
      selector: `#${formId}`,
      type: 'contact',
      instanceData: content,
      contactSummary: { id: 'contact-summary', context: contactSummary }
    });
    expect(actualContext.editedListener).to.exist;
    expect(actualContext.valuechangeListener).to.exist;
    expect(actualContext.formConfig).to.deep.include({
      doc: { _id: formId },
      type: 'contact',
      html: FORM_HTML,
      model: formModel,
      repeatPaths: []
    });
    expect(enketoService.renderForm.args[0][1]).to.deep.equal(user);
    expect(enketoService.unload.called).to.be.false;
  }));

  [
    null,
    undefined,
    '',
    ' ',
  ].forEach((value) => {
    it(`throws error when setting [${value}] Form Id`, fakeAsync(async () => {
      const component = await getComponent();
      expect(() => component.formId = value as unknown as string).to.throw('The Form Id must be populated.');
    }));
  });

  it(`throws error when setting null user`, fakeAsync(async () => {
    const component = await getComponent();
    expect(() => component.user = null as unknown as Record<string, any>).to.throw('The user must be populated.');
  }));

  it('sets the editing value to true when the edited listener is triggered', fakeAsync(async () => {
    const component = await getComponent();
    component.formXml = FORM_XML;
    tick();
    component.formModel = FORM_MODEL;
    tick();
    component.formHtml = FORM_HTML;
    tick();
    expect(enketoService.renderForm.callCount).to.equal(1);
    const actualContext = enketoService.renderForm.args[0][0];
    expect(actualContext.editedListener).to.exist;
    expect(component.editing).to.be.false;
    actualContext.editedListener();
    expect(component.editing).to.be.true;
  }));

  it('clears the error status value when the value change listener is triggered', fakeAsync(async () => {
    const component = await getComponent();
    component.status.error = 'some error';
    component.formXml = FORM_XML;
    tick();
    component.formModel = FORM_MODEL;
    tick();
    component.formHtml = FORM_HTML;
    tick();
    expect(enketoService.renderForm.callCount).to.equal(1);
    const actualContext = enketoService.renderForm.args[0][0];
    expect(actualContext.editedListener).to.exist;
    expect(component.status.error).to.equal('some error');
    actualContext.valuechangeListener();
    expect(component.status.error).to.be.null;
  }));

  it('submits form by completing the report and emitting the docs', fakeAsync(async () => {
    const expectedDocs = [
      { _id: 'doc1' },
      { _id: 'doc2' },
    ];
    enketoService.saveReport.resolves(expectedDocs);
    const formId = 'test-form-id';
    const formXml = '<form>custom</form>';
    const formModel = '<model><instance id="contact-summary" /></model>';
    const formHtml = '<div>custom</div>';
    const user = {
      contact_id: 'spanish_user',
      language: 'es',
    };
    const contactSummary = { hello: 'world' };
    const contact = { phone: '12345' };
    const content = { my: 'content', contact };

    const component = getComponent();
    component.formId = formId;
    // Trigger change detection to update the bound id attribute
    fixture.detectChanges();
    tick();
    component.user = user;
    tick();
    component.contactSummary = contactSummary;
    tick();
    component.content = content;
    tick();
    component.formXml = formXml;
    tick();
    component.formModel = formModel;
    tick();
    component.formHtml = formHtml;
    tick();

    expect(enketoService.renderForm.callCount).to.equal(1);

    let actualSubmittedDocs;
    component.onSubmit.subscribe((submittedDocs) => {
      actualSubmittedDocs = submittedDocs;
    });

    const submitPromise = component.submitForm();
    expect(component.status.saving).to.be.true;
    await submitPromise;
    tick();
    expect(enketoService.saveContact.called).to.be.false;
    expect(enketoService.saveReport.callCount).to.equal(1);
    expect(enketoService.saveReport.args[0]).to.deep.equal([
      enketoForm,
      { contact }
    ]);
    expect(actualSubmittedDocs).to.deep.equal(expectedDocs);
  }));

  it('strips properties set to undefined and preserves attachments when emitting docs', fakeAsync(async () => {
    const attachments = { 'user-file': { content_type: 'text/xml', data: 'not-json-serializable' } };
    const savedDocs = [
      { _id: 'doc1', keep: 'value', drop: undefined, nested: { keep: 'value', drop: undefined } },
      { _id: 'doc2', _attachments: attachments, drop: undefined },
    ];
    enketoService.saveReport.resolves(savedDocs);
    const contact = { phone: '12345' };
    const content = { my: 'content', contact };

    const component = getComponent();
    component.content = content;
    component.formXml = FORM_XML;
    component.formModel = FORM_MODEL;
    component.formHtml = FORM_HTML;
    tick();

    let actualSubmittedDocs;
    component.onSubmit.subscribe((submittedDocs) => {
      actualSubmittedDocs = submittedDocs;
    });

    await component.submitForm();
    tick();

    expect(enketoService.saveReport.callCount).to.equal(1);
    // undefined properties removed (including nested), other values retained
    expect(actualSubmittedDocs).to.deep.equal([
      { _id: 'doc1', keep: 'value', nested: { keep: 'value' } },
      { _id: 'doc2', _attachments: attachments },
    ]);
    // attachments are preserved by reference (not run through the JSON round-trip)
    expect(actualSubmittedDocs[1]._attachments).to.equal(attachments);
  }));

  it('submits contact form with default type', fakeAsync(async () => {
    const expectedDocs = [
      { _id: 'doc1' },
      { _id: 'doc2' },
    ];
    enketoService.saveContact.resolves({ preparedDocs: expectedDocs });
    const formId = 'test-form-id';
    const formXml = '<form>custom</form>';
    const formModel = '<model><instance id="contact-summary" /></model>';
    const formHtml = '<div>custom</div>';
    const user = {
      contact_id: 'spanish_user',
      language: 'es',
    };
    const contactSummary = { hello: 'world' };
    const content = { my: 'content' };

    const component = getComponent();
    component.formId = formId;
    // Trigger change detection to update the bound id attribute
    fixture.detectChanges();
    tick();
    component.user = user;
    tick();
    component.contactSummary = contactSummary;
    tick();
    component.contactType = 'person';
    tick();
    component.content = content;
    tick();
    component.formXml = formXml;
    tick();
    component.formModel = formModel;
    tick();
    component.formHtml = formHtml;
    tick();

    expect(enketoService.renderForm.callCount).to.equal(1);

    let actualSubmittedDocs;
    component.onSubmit.subscribe((submittedDocs) => {
      actualSubmittedDocs = submittedDocs;
    });

    const submitPromise = component.submitForm();
    expect(component.status.saving).to.be.true;
    await submitPromise;
    tick();
    expect(enketoService.saveReport.called).to.be.false;
    expect(enketoService.saveContact.callCount).to.equal(1);
    expect(enketoService.saveContact.args[0]).to.deep.equal([
      enketoForm,
      { type: 'person' }
    ]);
    expect(actualSubmittedDocs).to.deep.equal(expectedDocs);
  }));

  it('submits contact form with custom type', fakeAsync(async () => {
    const expectedDocs = [
      { _id: 'doc1' },
      { _id: 'doc2' },
    ];
    enketoService.saveContact.resolves({ preparedDocs: expectedDocs });
    const formId = 'test-form-id';
    const formXml = '<form>custom</form>';
    const formModel = '<model><instance id="contact-summary" /></model>';
    const formHtml = '<div>custom</div>';
    const user = {
      contact_id: 'spanish_user',
      language: 'es',
    };
    const contactSummary = { hello: 'world' };
    const content = { my: 'content' };

    const component = getComponent();
    component.formId = formId;
    // Trigger change detection to update the bound id attribute
    fixture.detectChanges();
    tick();
    component.user = user;
    tick();
    component.contactSummary = contactSummary;
    tick();
    component.contactType = 'custom_contact';
    tick();
    component.content = content;
    tick();
    component.formXml = formXml;
    tick();
    component.formModel = formModel;
    tick();
    component.formHtml = formHtml;
    tick();

    expect(enketoService.renderForm.callCount).to.equal(1);

    let actualSubmittedDocs;
    component.onSubmit.subscribe((submittedDocs) => {
      actualSubmittedDocs = submittedDocs;
    });

    const submitPromise = component.submitForm();
    expect(component.status.saving).to.be.true;
    await submitPromise;
    tick();
    expect(enketoService.saveReport.called).to.be.false;
    expect(enketoService.saveContact.callCount).to.equal(1);
    expect(enketoService.saveContact.args[0]).to.deep.equal([
      enketoForm,
      { type: 'contact', contact_type: 'custom_contact' }
    ]);
    expect(actualSubmittedDocs).to.deep.equal(expectedDocs);
  }));

  it('submits form when error thrown completing the report', fakeAsync(async () => {
    const expectedError = new Error('Validation Error');
    enketoService.saveReport.rejects(expectedError);
    const consoleErrorStub = sinon.stub(console, 'error');

    const component = getComponent();
    component.formXml = FORM_XML;
    tick();

    component.onSubmit.subscribe(() => {
      expect.fail('Should not have emitted docs');
    });

    const submitPromise = component.submitForm();
    expect(component.status.saving).to.be.true;
    await submitPromise;
    tick();
    expect(component.status.saving).to.be.false;
    expect(component.status.error).to.equal('error.report.save');
    expect(consoleErrorStub.callCount).to.equal(1);
    expect(consoleErrorStub.args[0]).to.deep.equal(['Error submitting form data: ', expectedError]);
    expect(enketoService.saveReport.callCount).to.equal(1);
    expect(enketoService.saveReport.args[0]).to.deep.equal([
      undefined,
      { contact: undefined }
    ]);
    expect(enketoService.unload.called).to.be.false;
  }));

  it('cancels form and unloads data', fakeAsync(() => {
    const expectedDocs = [
      { _id: 'doc1' },
      { _id: 'doc2' },
    ];
    enketoService.saveReport.resolves(expectedDocs);
    const formId = 'test-form-id';
    const formXml = '<form>custom</form>';
    const formModel = '<model><instance id="contact-summary" /></model>';
    const formHtml = '<div>custom</div>';
    const user = {
      contact_id: 'spanish_user',
      language: 'es',
    };
    const contactSummary = { hello: 'world' };
    const content = { my: 'content' };

    const component = getComponent();
    component.formId = formId;
    // Trigger change detection to update the bound id attribute
    fixture.detectChanges();
    tick();
    component.user = user;
    tick();
    component.contactSummary = contactSummary;
    tick();
    component.contactType = 'person';
    tick();
    component.content = content;
    tick();
    component.extensionLibs = {
      hello: 'world',
      world: 'hello'
    };
    tick();
    component.formXml = formXml;
    tick();
    component.formModel = formModel;
    tick();
    component.formHtml = formHtml;
    tick();

    expect(chtDatasourceService.addExtensionLib.args).to.deep.equal([['hello', 'world'], ['world', 'hello']]);
    expect(enketoService.renderForm.callCount).to.equal(1);

    let cancelEmitted = false;
    component.onCancel.subscribe(() => {
      cancelEmitted = true;
    });

    component.cancelForm();
    tick();
    expect(cancelEmitted).to.be.true;
    expect(chtDatasourceService.clearExtensionLibs.calledOnceWithExactly()).to.be.true;
    expect(enketoService.unload.callCount).to.equal(1);
    expect(enketoService.unload.args[0]).to.deep.equal([enketoForm.form]);
    expect(component.formId).to.equal(FORM_ID);
    expect(component.editing).to.be.false;
    expect(component.status).to.deep.equal({
      saving: false,
      error: null
    });
    // Trigger change detection to update the bound id attribute
    fixture.detectChanges();

    // Render another form to show that internal data has been reset to defaults
    component.formXml = FORM_XML;
    tick();
    expect(enketoService.renderForm.callCount).to.equal(1);
    component.formModel = FORM_MODEL;
    tick();
    expect(enketoService.renderForm.callCount).to.equal(1);
    component.formHtml = FORM_HTML;
    tick();
    expect(chtDatasourceService.addExtensionLib.callCount).to.equal(2);
    expect(enketoService.renderForm.callCount).to.equal(2);
    // New form has been rendered with default values (internal data was reset)
    const actualContext = enketoService.renderForm.args[1][0];
    expect(actualContext).to.deep.include({
      selector: `#${FORM_ID}`,
      type: 'report',
      instanceData: undefined,
      contactSummary: undefined
    });
    expect(actualContext.editedListener).to.exist;
    expect(actualContext.valuechangeListener).to.exist;
    expect(actualContext.formConfig).to.deep.include({
      doc: { _id: FORM_ID },
      type: 'report',
      html: FORM_HTML,
      model: FORM_MODEL,
      repeatPaths: []
    });
    expect(enketoService.renderForm.args[1][1]).to.deep.equal(USER);
  }));
});
