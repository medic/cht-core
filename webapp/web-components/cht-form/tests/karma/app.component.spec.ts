import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import moment from 'moment';
import { toBik_text } from 'bikram-sambat';
import sinon from 'sinon';
import { expect } from 'chai';

import { AppComponent } from '../../src/app.component';
import * as medicXpathExtensions from '../../../../src/js/enketo/medic-xpath-extensions';
import { EnketoService } from '@mm-services/enketo.service';

describe('AppComponent', () => {
  const FORM_ID = 'cht-form-id';
  const FORM_HTML = '<div>my form</div>';
  const FORM_MODEL = '<model></model>';
  const FORM_XML = '<form></form>';
  const USER = {
    contact_id: 'default_user',
    language: 'en',
  } as const;

  let enketoService;

  const getComponent = () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  beforeEach(async () => {
    enketoService = {
      renderForm: sinon
        .stub()
        .resolves(),
      getCurrentForm: sinon.stub(),
      completeNewReport: sinon.stub(),
      unload: sinon.stub(),
    };
    await TestBed
      .configureTestingModule({
        declarations: [AppComponent],
        imports: [TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } })],
        providers: [
          { provide: EnketoService, useValue: enketoService },
        ]
      })
      .compileComponents();
  });

  afterEach(sinon.restore);

  it('creates component and init XPath extensions', async () => {
    const medicXpathExtensionsInit = sinon.spy(medicXpathExtensions, 'init');
    const component = await getComponent();

    expect(component).to.exist;
    expect(medicXpathExtensionsInit.callCount).to.equal(1);
    expect(medicXpathExtensionsInit.args[0]).to.deep.equal([
      {},
      toBik_text,
      moment,
      {}
    ]);
    expect(component.formId).to.eq(FORM_ID);
    expect(component.editing).to.be.false;
    expect(component.status).to.deep.equal({
      saving: false,
      error: null
    });
  });

  it('renders form when required fields are set', fakeAsync(async () => {
    const component = await getComponent();
    expect(enketoService.renderForm.called).to.be.false;
    component.formXml = FORM_XML;
    tick();
    expect(enketoService.renderForm.called).to.be.false;
    component.formModel = FORM_MODEL;
    tick();
    expect(enketoService.renderForm.called).to.be.false;
    component.formHtml = FORM_HTML;
    tick();

    expect(enketoService.getCurrentForm.callCount).to.equal(3);
    expect(enketoService.renderForm.callCount).to.equal(1);
    const actualContext = enketoService.renderForm.args[0][0];
    expect(actualContext).to.deep.include({
      selector: `#${FORM_ID}`,
      type: 'report',
      formDoc: { _id: FORM_ID },
      instanceData: null,
      contactSummary: undefined
    });
    expect(actualContext.editedListener).to.exist;
    expect(actualContext.valuechangeListener).to.exist;
    expect(enketoService.renderForm.args[0][1]).to.deep.equal({
      html: $(FORM_HTML),
      model: FORM_MODEL,
      hasContactSummary: false
    });
    expect(enketoService.renderForm.args[0][2]).to.deep.equal(USER);
    expect(enketoService.unload.called).to.be.false;
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
    component.formId = formId;
    tick();
    component.user = user;
    tick();
    component.contactSummary = contactSummary;
    tick();
    component.content = content;
    tick();
    component.formXml = FORM_XML;
    tick();
    component.formModel = formModel;
    tick();
    component.formHtml = FORM_HTML;
    tick();

    expect(enketoService.renderForm.callCount).to.equal(1);
    const actualContext = enketoService.renderForm.args[0][0];
    expect(actualContext).to.deep.include({
      selector: `#${formId}`,
      type: 'report',
      formDoc: { _id: formId },
      instanceData: content,
      contactSummary: { context: contactSummary }
    });
    expect(actualContext.editedListener).to.exist;
    expect(actualContext.valuechangeListener).to.exist;
    expect(enketoService.renderForm.args[0][1]).to.deep.equal({
      html: $(FORM_HTML),
      model: formModel,
      hasContactSummary: true
    });
    expect(enketoService.renderForm.args[0][2]).to.deep.equal(user);
    expect(enketoService.unload.called).to.be.false;

    // Null out the optional fields and render again
    component.contactSummary = undefined;
    component.content = null;
    tick();

    // Form is rendered again, but without instanceData or contactSummary
    expect(enketoService.renderForm.callCount).to.equal(3);
    const actualContext1 = enketoService.renderForm.args[2][0];
    expect(actualContext1).to.deep.include({
      selector: `#${formId}`,
      type: 'report',
      formDoc: { _id: formId },
      instanceData: null,
      contactSummary: undefined
    });
    expect(enketoService.renderForm.args[2][1]).to.deep.equal({
      html: $(FORM_HTML),
      model: formModel,
      hasContactSummary: true
    });
    expect(enketoService.renderForm.args[2][2]).to.deep.equal(user);
    expect(enketoService.unload.called).to.be.false;
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
    expect(enketoService.renderForm.args[0][2]).to.deep.equal({
      contact_id: 'default_user',
      language: 'en',
      hello: 'world'
    });
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
      formDoc: { _id: FORM_ID },
      instanceData: { ...content, source: 'contact' },
      contactSummary: undefined
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
      formDoc: { _id: FORM_ID },
      instanceData: content,
      contactSummary: undefined
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
    const currentForm = { _id: 'current-form' };
    enketoService.getCurrentForm.returns(currentForm);

    const component = await getComponent();
    component.formXml = FORM_XML;
    component.formModel = formModel;
    component.formHtml = FORM_HTML;
    component.formId = firstFormId;
    component.user = user;
    component.contactSummary = contactSummary;
    component.content = content;
    // Set the form ID again
    component.formId = formId;
    tick();
    // The queue of renderForm calls gets processed in the tick
    expect(enketoService.renderForm.callCount).to.equal(8);
    // The last render call contains the latest values
    const actualContext = enketoService.renderForm.args[7][0];
    expect(actualContext).to.deep.include({
      selector: `#${formId}`,
      type: 'report',
      formDoc: { _id: formId },
      instanceData: content,
      contactSummary: { context: contactSummary }
    });
    expect(actualContext.editedListener).to.exist;
    expect(actualContext.valuechangeListener).to.exist;
    expect(enketoService.renderForm.args[7][1]).to.deep.equal({
      html: $(FORM_HTML),
      model: formModel,
      hasContactSummary: true
    });
    expect(enketoService.renderForm.args[7][2]).to.deep.equal(user);
    expect(enketoService.unload.callCount).to.equal(8);
    enketoService.unload.args.forEach((args) => expect(args).to.deep.equal([currentForm]));
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

    it(`throws error when setting [${value}] Form HTML`, fakeAsync(async () => {
      const component = await getComponent();
      expect(() => component.formHtml = value as unknown as string).to.throw('The Form HTML must be populated.');
    }));

    it(`throws error when setting [${value}] Form Model`, fakeAsync(async () => {
      const component = await getComponent();
      expect(() => component.formModel = value as unknown as string).to.throw('The Form Model must be populated.');
    }));

    it(`throws error when setting [${value}] Form XML`, fakeAsync(async () => {
      const component = await getComponent();
      expect(() => component.formXml = value as unknown as string).to.throw('The Form XML must be populated.');
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
    enketoService.completeNewReport.resolves(expectedDocs);
    const currentForm = { _id: 'current-form' };
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
    component.editing = true;

    expect(enketoService.getCurrentForm.callCount).to.equal(7);
    expect(enketoService.renderForm.callCount).to.equal(1);
    enketoService.getCurrentForm
      .onCall(7)
      .returns(currentForm);
    enketoService.getCurrentForm
      .onCall(8)
      .returns(currentForm);

    let actualSubmittedDocs;
    component.onSubmit.subscribe((submittedDocs) => {
      actualSubmittedDocs = submittedDocs;
    });

    const submitPromise = component.submitForm();
    expect(component.status.saving).to.be.true;
    await submitPromise;
    tick();
    expect(component.editing).to.be.false;
    expect(enketoService.getCurrentForm.callCount).to.equal(9);
    expect(enketoService.completeNewReport.callCount).to.equal(1);
    const expectedFormDoc = {
      xml: formXml,
      doc: {}
    };
    expect(enketoService.completeNewReport.args[0]).to.deep.equal([
      formId,
      currentForm,
      expectedFormDoc,
      null
    ]);
    expect(enketoService.unload.callCount).to.equal(1);
    expect(enketoService.unload.args[0]).to.deep.equal([currentForm]);
    expect(actualSubmittedDocs).to.deep.equal(expectedDocs);
    expect(component.formId).to.equal(FORM_ID);

    // Render another form to show that internal data has been reset to defaults
    component.formXml = FORM_XML;
    tick();
    expect(enketoService.renderForm.callCount).to.equal(1);
    component.formModel = FORM_MODEL;
    tick();
    expect(enketoService.renderForm.callCount).to.equal(1);
    component.formHtml = FORM_HTML;
    tick();
    expect(enketoService.getCurrentForm.callCount).to.equal(12);
    expect(enketoService.renderForm.callCount).to.equal(2);
    // New form has been rendered with default values (internal data was reset)
    const actualContext = enketoService.renderForm.args[1][0];
    expect(actualContext).to.deep.include({
      selector: `#${FORM_ID}`,
      type: 'report',
      formDoc: { _id: FORM_ID },
      instanceData: null,
      contactSummary: undefined
    });
    expect(actualContext.editedListener).to.exist;
    expect(actualContext.valuechangeListener).to.exist;
    expect(enketoService.renderForm.args[1][1]).to.deep.equal({
      html: $(FORM_HTML),
      model: FORM_MODEL,
      hasContactSummary: false
    });
    expect(enketoService.renderForm.args[1][2]).to.deep.equal(USER);
  }));

  it('submits form when error thrown completing the report', fakeAsync(async () => {
    const expectedError = new Error('Validation Error');
    enketoService.completeNewReport.rejects(expectedError);
    const currentForm = { _id: 'current-form' };
    const consoleErrorStub = sinon.stub(console, 'error');

    const component = getComponent();
    component.formXml = FORM_XML;
    tick();

    enketoService.getCurrentForm
      .onCall(1)
      .returns(currentForm);
    enketoService.getCurrentForm
      .onCall(2)
      .returns(currentForm);

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
    expect(enketoService.getCurrentForm.callCount).to.equal(2);
    expect(enketoService.completeNewReport.callCount).to.equal(1);
    const expectedFormDoc = {
      xml: FORM_XML,
      doc: {}
    };
    expect(enketoService.completeNewReport.args[0]).to.deep.equal([
      FORM_ID,
      currentForm,
      expectedFormDoc,
      null
    ]);
    expect(enketoService.unload.called).to.be.false;
  }));

  it('cancels form and unloads data', fakeAsync(async () => {
    const expectedDocs = [
      { _id: 'doc1' },
      { _id: 'doc2' },
    ];
    enketoService.completeNewReport.resolves(expectedDocs);
    const currentForm = { _id: 'current-form' };
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
    component.editing = true;
    component.status = { saving: true, error: 'some error' };

    expect(enketoService.getCurrentForm.callCount).to.equal(7);
    expect(enketoService.renderForm.callCount).to.equal(1);
    enketoService.getCurrentForm
      .onCall(7)
      .returns(currentForm);

    let cancelEmitted = false;
    component.onCancel.subscribe(() => {
      cancelEmitted = true;
    });

    component.cancelForm();
    tick();
    expect(cancelEmitted).to.be.true;
    expect(enketoService.getCurrentForm.callCount).to.equal(8);

    expect(enketoService.unload.callCount).to.equal(1);
    expect(enketoService.unload.args[0]).to.deep.equal([currentForm]);
    expect(component.formId).to.equal(FORM_ID);
    expect(component.editing).to.be.false;
    expect(component.status).to.deep.equal({
      saving: false,
      error: null
    });

    // Render another form to show that internal data has been reset to defaults
    component.formXml = FORM_XML;
    tick();
    expect(enketoService.renderForm.callCount).to.equal(1);
    component.formModel = FORM_MODEL;
    tick();
    expect(enketoService.renderForm.callCount).to.equal(1);
    component.formHtml = FORM_HTML;
    tick();
    expect(enketoService.getCurrentForm.callCount).to.equal(11);
    expect(enketoService.renderForm.callCount).to.equal(2);
    // New form has been rendered with default values (internal data was reset)
    const actualContext = enketoService.renderForm.args[1][0];
    expect(actualContext).to.deep.include({
      selector: `#${FORM_ID}`,
      type: 'report',
      formDoc: { _id: FORM_ID },
      instanceData: null,
      contactSummary: undefined
    });
    expect(actualContext.editedListener).to.exist;
    expect(actualContext.valuechangeListener).to.exist;
    expect(enketoService.renderForm.args[1][1]).to.deep.equal({
      html: $(FORM_HTML),
      model: FORM_MODEL,
      hasContactSummary: false
    });
    expect(enketoService.renderForm.args[1][2]).to.deep.equal(USER);
  }));
});
