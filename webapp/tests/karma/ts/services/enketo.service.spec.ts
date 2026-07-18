import { fakeAsync, flush, TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { provideMockStore } from '@ngrx/store/testing';
import { HttpClient } from '@angular/common/http';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';

import { DbService } from '@mm-services/db.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { EnketoPrepopulationDataService } from '@mm-services/enketo-prepopulation-data.service';
import { TranslateService } from '@mm-services/translate.service';
import { EnketoService, FormValidationError } from '@mm-services/enketo.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { FormConfig } from '@mm-services/form/form-config';
import * as FileManager from '../../../../src/js/enketo/file-manager.js';
import { WebappEnketoFormContext } from '@mm-services/form.service';
import { REPORT_ATTACHMENT_NAME } from '@mm-services/get-report-content.service';
import { DOC_TYPES } from '@medic/constants';
import events from 'enketo-core/src/js/event';
import { Qualifier } from '@medic/cht-datasource';

describe('Enketo service', () => {
  // return a mock form ready for putting in #dbContent
  const mockEnketoDoc = formInternalId => {
    return {
      _id: `form:${formInternalId}`,
      internalId: formInternalId,
      _attachments: { xml: { something: true } },
    };
  };

  const loadXML = (name) => require(`./enketo-xml/${name}.xml`).default;

  const VISIT_MODEL = loadXML('visit');
  const VISIT_MODEL_WITH_CONTACT_SUMMARY = loadXML('visit-contact-summary');

  const buildFormConfig = ({
    doc = mockEnketoDoc('myform'),
    type = 'report',
    xml = '<data/>',
    html = $('<div>my form</div>'),
    model = VISIT_MODEL,
  }: Record<string, any> = {}) => new FormConfig(doc, type, xml, html, model);

  let service;

  let enketoInit;
  let dbGetAttachment;
  let createObjectURL;
  let TranslateFrom;
  let form;
  let EnketoForm;
  let EnketoPrepopulationData;
  let translateService;
  let extractLineageService;
  let chtDatasourceService;

  beforeEach(() => {
    enketoInit = sinon.stub();
    dbGetAttachment = sinon.stub();
    createObjectURL = sinon.stub();
    TranslateFrom = sinon.stub();
    form = {
      validate: sinon.stub(),
      getDataStr: sinon.stub(),
      resetView: sinon.stub(),
      view: {
        $: { on: sinon.stub() },
        html: document.createElement('div'),
      },
      init: enketoInit,
      langs: {
        setAll: () => { },
        $formLanguages: $('<select><option value="en">en</option></select>'),
      },
      calc: { update: () => { } },
      output: { update: () => { } },
    };
    EnketoForm = sinon.stub();
    EnketoPrepopulationData = sinon.stub();
    window.EnketoForm = EnketoForm;
    window.URL.createObjectURL = createObjectURL;
    EnketoForm.returns(form);
    translateService = {
      instant: sinon.stub().returnsArg(0),
      get: sinon.stub(),
    };
    extractLineageService = { extract: ExtractLineageService.prototype.extract };
    chtDatasourceService = { bind: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        {
          provide: DbService,
          useValue: {
            get: () => ({ getAttachment: dbGetAttachment })
          }
        },
        { provide: TranslateFromService, useValue: { get: TranslateFrom } },
        { provide: EnketoPrepopulationDataService, useValue: { get: EnketoPrepopulationData } },
        { provide: TranslateService, useValue: translateService },
        { provide: ExtractLineageService, useValue: extractLineageService },
        { provide: CHTDatasourceService, useValue: chtDatasourceService },
        { provide: HttpClient, useValue: {} },
      ],
    });

    TranslateFrom.returns('translated');
    window.CHTCore = {};
  });

  afterEach(() => {
    sinon.restore();
    delete window.CHTCore;
  });

  describe('renderForm', () => {
    beforeEach(() => {
      service = TestBed.inject(EnketoService);
    });

    it('return error when form initialisation fails', fakeAsync(async () => {
      EnketoPrepopulationData.returns('<xml></xml>');
      const expectedErrorDetail = [ 'nope', 'still nope' ];
      enketoInit.returns(expectedErrorDetail);

      const formContext = {
        selector: $('<div></div>'),
        formConfig: buildFormConfig({ html: $('<div>my form</div>'), model: VISIT_MODEL }),
      };
      const userSettings = { language: 'en' };

      try {
        await service.renderForm(formContext, userSettings);
        flush();
        expect.fail('Should throw error');
      } catch (error) {
        expect(enketoInit.callCount).to.equal(1);
        expect(error.message).to.equal('["nope","still nope"]');
      }
    }));

    it('return form when everything works', () => {
      expect(form.editStatus).to.be.undefined;
      enketoInit.returns([]);
      EnketoPrepopulationData.returns('<xml></xml>');
      const formContext = {
        selector: $('<div></div>'),
        formConfig: buildFormConfig({ html: $('<div>my form</div>'), model: VISIT_MODEL }),
      };
      const userSettings = { language: 'en' };
      return service.renderForm(formContext, userSettings).then(() => {
        expect(EnketoPrepopulationData.callCount).to.equal(1);
        expect(enketoInit.callCount).to.equal(1);
        expect(form.editStatus).to.equal(false);
      });
    });

    it('replaces img src with obj urls', async () => {
      dbGetAttachment.resolves('myobjblob');
      createObjectURL.returns('myobjurl');
      enketoInit.returns([]);
      EnketoPrepopulationData.returns('<xml></xml>');
      const wrapper = $('<div><div class="container"></div><form></form></div>');
      const formContext = {
        selector: wrapper,
        formConfig: buildFormConfig({ html: $('<div><img data-media-src="myimg"></div>'), model: VISIT_MODEL }),
      };
      const userSettings = { language: 'en' };
      await service.renderForm(formContext, userSettings);
      await Promise.resolve();  // need to wait for async get attachment to complete
      const img = wrapper.find('img').first();
      expect(img.css('visibility')).to.satisfy(val => {
        // different browsers return different values but both are equivalent
        return val === '' || val === 'visible';
      });
      expect(enketoInit.callCount).to.equal(1);
      expect(createObjectURL.callCount).to.equal(1);
      expect(createObjectURL.args[0][0]).to.equal('myobjblob');
    });

    it('leaves img wrapped and hides loader if failed to load', fakeAsync(() => {
      const consoleErrorMock = sinon.stub(console, 'error');
      dbGetAttachment.rejects('not found');
      createObjectURL.returns('myobjurl');
      enketoInit.returns([]);
      EnketoPrepopulationData.returns('<xml></xml>');
      const wrapper = $('<div><div class="container"></div><form></form></div>');
      const formContext = {
        selector: wrapper,
        formConfig: buildFormConfig({ html: $('<div><img data-media-src="myimg"></div>'), model: VISIT_MODEL }),
      };
      const userSettings = { language: 'en' };
      return service.renderForm(formContext, userSettings).then(() => {
        flush();
        const img = wrapper.find('img').first();
        expect(img.attr('src')).to.equal(undefined);
        expect(img.attr('data-media-src')).to.equal('myimg');
        expect(img.css('visibility')).to.equal('hidden');
        const loader = img.closest('div');
        expect(loader.hasClass('loader')).to.equal(true);
        expect(loader.is(':hidden')).to.equal(true);
        expect(enketoInit.callCount).to.equal(1);
        expect(createObjectURL.callCount).to.equal(0);
        expect(consoleErrorMock.callCount).to.equal(1);
        expect(consoleErrorMock.args[0][0]).to.equal('Error fetching media file');
      });
    }));

    it('passes users language to Enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      enketoInit.returns([]);
      EnketoPrepopulationData.returns(data);
      const formContext = {
        selector: $('<div></div>'),
        formConfig: buildFormConfig({ html: $('<div>my form</div>'), model: 'my model' }),
        instanceData: data
      };
      const userSettings = { name: 'Jim', language: 'sw' };
      return service.renderForm(formContext, userSettings).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][2].language).to.equal('sw');
      });
    });

    it('passes xml instance data through to Enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';

      enketoInit.returns([]);
      EnketoPrepopulationData.returns(data);
      const formContext = {
        selector: $('<div></div>'),
        formConfig: buildFormConfig({ html: $('<div>my form</div>'), model: 'my model' }),
        instanceData: data
      };
      const userSettings = { language: 'en' };
      return service.renderForm(formContext, userSettings).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].modelStr).to.equal('my model');
        expect(EnketoForm.args[0][1].instanceStr).to.equal(data);
      });
    });

    it('passes json instance data through to Enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      const instanceData = {
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      enketoInit.returns([]);
      EnketoPrepopulationData.returns(data);
      const formContext = {
        selector: $('<div></div>'),
        formConfig: buildFormConfig({ html: $('<div>my form</div>'), model: VISIT_MODEL }),
        instanceData
      };
      const userSettings = { language: 'en' };
      return service.renderForm(formContext, userSettings).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].modelStr).to.equal(VISIT_MODEL);
        expect(EnketoForm.args[0][1].instanceStr).to.equal(data);
      });
    });

    it('passes contact summary data to enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      const instanceData = {
        contact: {
          _id: 'fffff',
          patient_id: '44509'
        },
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      enketoInit.returns([]);
      EnketoPrepopulationData.returns(data);
      const formConfig = buildFormConfig({
        html: $('<div>my form</div>'),
        model: VISIT_MODEL_WITH_CONTACT_SUMMARY,
      });
      const formContext = new WebappEnketoFormContext('#div', formConfig, instanceData);
      formContext.contactSummary = { id: 'contact-summary', context: { pregnant: true } };
      const userSettings = { language: 'en' };
      return service.renderForm(formContext, userSettings).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].external.length).to.equal(1);
        const summary = EnketoForm.args[0][1].external[0];
        expect(summary.id).to.equal('contact-summary');
        const xmlStr = new XMLSerializer().serializeToString(summary.xml);
        expect(xmlStr).to.equal('<context><pregnant>true</pregnant></context>');
      });
    });

    it('passes contact summary data to enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      const instanceData = {
        contact: {
          _id: 'fffff',
          patient_id: '44509'
        },
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      enketoInit.returns([]);
      EnketoPrepopulationData.returns(data);
      const formConfig = buildFormConfig({
        html: $('<div>my form</div>'),
        model: VISIT_MODEL_WITH_CONTACT_SUMMARY,
      });
      const formContext = new WebappEnketoFormContext('#div', formConfig, instanceData);
      formContext.userContactSummary =  { id: 'user-contact-summary', context: { chw: true } };
      const userSettings = { language: 'en' };
      return service.renderForm(formContext, userSettings).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].external.length).to.equal(1);
        const summary = EnketoForm.args[0][1].external[0];
        expect(summary.id).to.equal('user-contact-summary');
        const xmlStr = new XMLSerializer().serializeToString(summary.xml);
        expect(xmlStr).to.equal('<context><chw>true</chw></context>');
      });
    });

    it('passes both contact summary and user contact summary data to enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      const instanceData = {
        contact: {
          _id: 'fffff',
          patient_id: '44509'
        },
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      enketoInit.returns([]);
      EnketoPrepopulationData.returns(data);
      const formConfig = buildFormConfig({
        html: $('<div>my form</div>'),
        model: VISIT_MODEL_WITH_CONTACT_SUMMARY,
      });
      const formContext = new WebappEnketoFormContext('#div', formConfig, instanceData);
      formContext.contactSummary =  { id: 'contact-summary', context: { pregnant: true } };
      formContext.userContactSummary =  { id: 'user-contact-summary', context: { chw: true } };
      const userSettings = { language: 'en' };
      return service.renderForm(formContext, userSettings).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].external.length).to.equal(2);
        const contactSummary = EnketoForm.args[0][1].external[0];
        expect(contactSummary.id).to.equal('contact-summary');
        expect(new XMLSerializer().serializeToString(contactSummary.xml))
          .to.equal('<context><pregnant>true</pregnant></context>');
        const userContactSummary = EnketoForm.args[0][1].external[1];
        expect(userContactSummary.id).to.equal('user-contact-summary');
        expect(new XMLSerializer().serializeToString(userContactSummary.xml))
          .to.equal('<context><chw>true</chw></context>');
      });
    });

    describe('form title', () => {
      beforeEach(() => {
        service.setFormTitle = sinon.stub();
        dbGetAttachment.resolves('<form/>');
        translateService.get.callsFake((key) => `translated key ${key}`);
        TranslateFrom.callsFake((sentence) => `translated sentence ${sentence}`);
      });

      const callbackMock = () => { };
      const instanceData = {
        health_center: {
          type: 'contact',
          contact_type: 'health_center',
          parent: 'parent',
        },
      };
      const formDoc = {
        ...mockEnketoDoc('myform'),
        title: 'New Area',
      };

      it('should translate titleKey when provided', async () => {
        const formContext = {
          selector: $('<div></div>'),
          formConfig: buildFormConfig({ doc: formDoc, html: $('<div>my form</div>'), model: VISIT_MODEL }),
          instanceData,
          editedListener: callbackMock,
          valuechangeListener: callbackMock,
          titleKey: 'contact.type.health_center.new',
        };
        const userSettings = { language: 'en' };
        await service.renderForm(formContext, userSettings);

        expect(service.setFormTitle.callCount).to.be.equal(1);
        expect(service.setFormTitle.args[0][1])
          .to.be.equal('translated key contact.type.health_center.new');
      });

      it('should fallback to translate document title when the titleKey is not available', async () => {
        const formContext = {
          selector: $('<div></div>'),
          formConfig: buildFormConfig({ doc: formDoc, html: $('<div>my form</div>'), model: VISIT_MODEL }),
          instanceData,
          editedListener: callbackMock,
          valuechangeListener: callbackMock,
        };
        const userSettings = { language: 'en' };
        await service.renderForm(formContext, userSettings);

        expect(service.setFormTitle.callCount).to.be.equal(1);
        expect(service.setFormTitle.args[0][1]).to.be.equal('translated sentence New Area');
      });
    });
  });

  describe('saveReport', () => {
    beforeEach(() => {
      service = TestBed.inject(EnketoService);
      sinon.stub(FileManager, 'getCurrentFiles').returns([]);
    });

    const saveReport = (defaultData, { xml = '<data/>', doc = {} }: Record<string, any> = {}) => {
      const config = buildFormConfig({ type: 'report', xml, doc });
      return service.saveReport({ config, form }, defaultData);
    };

    it('rejects on invalid form', async () => {
      form.validate.resolves(false);
      const dispatchEventStub = sinon.stub(form.view.html, 'dispatchEvent');

      await expect(saveReport({ contact: { _id: '123', phone: '555' } }))
        .to.be.rejectedWith(FormValidationError, 'Form is invalid');

      expect(form.validate.callCount).to.equal(1);
      expect(dispatchEventStub).to.not.have.been.called;
    });

    it('builds the report doc', async () => {
      const dispatchEventStub = sinon.stub(form.view.html, 'dispatchEvent');
      form.validate.resolves(true);
      form.getDataStr.returns(loadXML('sally-lmp'));

      const [report, ...additional] = await saveReport(
        { contact: { _id: '123', phone: '555' } },
        { doc: { internalId: 'V', xmlVersion: { time: '1', sha256: 'imahash' } } }
      );

      expect(form.validate.callCount).to.equal(1);
      expect(form.getDataStr.callCount).to.equal(1);
      expect(additional).to.be.empty;
      expect(report).excluding(['_id', 'reported_date']).to.deep.equal({
        contact: { _id: '123' },
        content_type: 'xml',
        fields: {
          lmp: '10',
          name: 'Sally'
        },
        form: 'V',
        form_version: {
          sha256: 'imahash',
          time: '1'
        },
        from: '555',
        hidden_fields: [],
        type: DOC_TYPES.DATA_RECORD,
        _attachments: undefined,
      });
      expect(report._id).to.not.be.empty;
      expect(report.reported_date).to.be.a('number');
      expect(dispatchEventStub).to.have.been.calledOnceWithExactly(events.BeforeSave());
    });

    it('removes the legacy content field and attachment', async () => {
      form.validate.resolves(true);
      form.getDataStr.returns('<data></data>');

      const [report] = await saveReport(
        {
          _id: 'existing-report',
          [REPORT_ATTACHMENT_NAME]: '<legacy>xml</legacy>',
          contact: { _id: '123', phone: '555' },
          _attachments: { [REPORT_ATTACHMENT_NAME]: { content_type: 'application/octet-stream', data: 'legacy' } },
        },
        { doc: { internalId: 'V' } }
      );

      expect(report._id).to.equal('existing-report');
      expect(report[REPORT_ATTACHMENT_NAME]).to.be.undefined;
      // content was the only attachment, so _attachments is dropped entirely
      expect(report._attachments).to.be.undefined;
    });

    it('records hidden fields', async () => {
      form.validate.resolves(true);
      form.getDataStr.returns(loadXML('hidden-field'));

      const [report] = await saveReport(
        { contact: { _id: '123', phone: '555' } },
        { doc: { internalId: 'V' } }
      );

      expect(report.fields.secret_code_name).to.equal('S4L');
      expect(report.hidden_fields).to.deep.equal(['secret_code_name']);
    });

    it('creates db-doc sub-docs and lists them as hidden fields', async () => {
      form.validate.resolves(true);
      form.getDataStr.returns(loadXML('extra-docs'));

      const [report, thing1, thing2, ...additional] = await saveReport(
        { contact: { _id: '123', phone: '555' } },
        { doc: { internalId: 'V' } }
      );

      expect(additional).to.be.empty;
      const doc1 = { some_property_1: 'some_value_1', type: 'thing_1' };
      const doc2 = { some_property_2: 'some_value_2', type: 'thing_2' };
      expect(report).excluding(['_id', 'reported_date']).to.deep.equal({
        contact: { _id: '123' },
        content_type: 'xml',
        fields: {
          doc1,
          doc2,
          lmp: '10',
          name: 'Sally',
          secret_code_name: 'S4L'
        },
        form: 'V',
        form_version: undefined,
        from: '555',
        hidden_fields: ['secret_code_name', 'doc1', 'doc2'],
        type: DOC_TYPES.DATA_RECORD,
        _attachments: undefined,
      });
      expect(report._id).to.not.be.empty;
      expect(report.reported_date).to.be.a('number');

      expect(thing1).excluding(['_id', 'reported_date']).to.deep.equal({ ...doc1, form_version: undefined });
      expect(thing1._id).to.not.be.empty;
      expect(thing1.reported_date).to.be.a('number');
      expect(thing2).excluding(['_id', 'reported_date']).to.deep.equal({ ...doc2, form_version: undefined });
      expect(thing2._id).to.not.be.empty;
      expect(thing2.reported_date).to.be.a('number');
    });

    it('populates db-doc-ref elements with the referenced doc id', async () => {
      form.validate.resolves(true);
      form.getDataStr.returns(loadXML('extra-docs-with-references'));

      const [report, thing1, thing2, ...additional] = await saveReport(
        { contact: { _id: '123', phone: '555' } },
        { doc: { internalId: 'V' } }
      );

      expect(additional).to.be.empty;
      const doc1 = {
        my_parent_1: report._id,
        my_self_1: thing1._id,
        my_sibling_1: thing2._id,
        some_property_1: 'some_value_1',
        type: 'thing_1'
      };
      const doc2 = {
        my_parent_2: report._id,
        my_self_2: thing2._id,
        my_sibling_2: thing1._id,
        some_property_2: 'some_value_2',
        type: 'thing_2'
      };
      expect(report).excluding(['reported_date']).to.deep.equal({
        _id: report._id,
        contact: { _id: '123' },
        content_type: 'xml',
        fields: {
          doc1,
          doc2,
          my_child_01: thing1._id,
          my_child_02: thing2._id,
          my_self_0: report._id,
          lmp: '10',
          name: 'Sally',
          secret_code_name: 'S4L'
        },
        form: 'V',
        form_version: undefined,
        from: '555',
        hidden_fields: ['secret_code_name', 'doc1', 'doc2'],
        type: DOC_TYPES.DATA_RECORD,
        _attachments: undefined,
      });
      expect(report._id).to.not.be.empty;
      expect(report.reported_date).to.be.a('number');

      expect(thing1).excluding(['reported_date']).to.deep.equal({
        ...doc1, _id: report.fields.my_child_01, form_version: undefined
      });
      expect(thing1._id).to.not.be.empty;
      expect(thing1.reported_date).to.be.a('number');
      expect(thing2).excluding(['reported_date']).to.deep.equal({
        ...doc2, _id: report.fields.my_child_02, form_version: undefined
      });
      expect(thing2._id).to.not.be.empty;
      expect(thing2.reported_date).to.be.a('number');
    });

    it('populates db-doc-ref elements inside repeats', async () => {
      form.validate.resolves(true);
      form.getDataStr.returns(loadXML('db-doc-ref-in-repeat'));

      const [report, thing1, thing2, thing3, ...additional] = await saveReport(
        { contact: { _id: '123', phone: '555' } },
        { xml: '<data><repeat nodeset="/data/repeat_section"></repeat></data>', doc: { internalId: 'V' } }
      );

      expect(additional).to.be.empty;
      const doc1 = {
        my_parent: report._id,
        some_property: 'some_value_1',
        type: 'repeater',
      };
      const doc2 = {
        my_parent: report._id,
        some_property: 'some_value_2',
        type: 'repeater',
      };
      const doc3 = {
        my_parent: report._id,
        some_property: 'some_value_3',
        type: 'repeater',
      };
      expect(report).excluding(['reported_date']).to.deep.equal({
        _id: report._id,
        contact: { _id: '123' },
        content_type: 'xml',
        fields: {
          repeat_section: [
            { extra: 'data1', repeat_doc: doc1, repeat_doc_ref: thing1._id },
            { extra: 'data2', repeat_doc: doc2, repeat_doc_ref: thing2._id },
            { extra: 'data3', repeat_doc: doc3, repeat_doc_ref: thing3._id }
          ],
          lmp: '10',
          name: 'Sally',
          secret_code_name: 'S4L'
        },
        form: 'V',
        form_version: undefined,
        from: '555',
        hidden_fields: ['secret_code_name', 'repeat_section.repeat_doc'],
        type: DOC_TYPES.DATA_RECORD,
        _attachments: undefined,
      });
      expect(report._id).to.not.be.empty;
      expect(report.reported_date).to.be.a('number');

      expect(thing1).excluding(['reported_date']).to.deep.equal({
        ...doc1, _id: report.fields.repeat_section[0].repeat_doc_ref, form_version: undefined
      });
      expect(thing1._id).to.not.be.empty;
      expect(thing1.reported_date).to.be.a('number');
      expect(thing2).excluding(['reported_date']).to.deep.equal({
        ...doc2, _id: report.fields.repeat_section[1].repeat_doc_ref, form_version: undefined
      });
      expect(thing2._id).to.not.be.empty;
      expect(thing2.reported_date).to.be.a('number');
      expect(thing3).excluding(['reported_date']).to.deep.equal({
        ...doc3, _id: report.fields.repeat_section[2].repeat_doc_ref, form_version: undefined
      });
      expect(thing3._id).to.not.be.empty;
      expect(thing3.reported_date).to.be.a('number');
    });

    describe('attachments', () => {
      let getCurrentFiles;

      beforeEach(() => {
        getCurrentFiles = FileManager.getCurrentFiles as sinon.SinonStub;
      });

      it('builds file attachments from the current files', async () => {
        form.validate.resolves(true);
        form.getDataStr.returns(loadXML('file-field'));
        const file0 = { name: 'my_image', type: 'image' };
        const file1 = { name: 'my_file', type: 'file' };
        getCurrentFiles.returns([file0, file1]);

        const [report] = await saveReport(
          { contact: { _id: 'my-user', phone: '8989' } },
          { doc: { internalId: 'my-form' } }
        );

        const imageAttachment = report._attachments['user-file-my_image'];
        expect(imageAttachment.content_type).to.equal('image');
        expect(imageAttachment.data).to.be.an.instanceof(Blob);
        const fileAttachment = report._attachments['user-file-my_file'];
        expect(fileAttachment.content_type).to.equal('file');
        expect(fileAttachment.data).to.be.an.instanceof(Blob);
      });

      it('builds binary attachments and clears the binary field value', async () => {
        form.validate.resolves(true);
        form.getDataStr.returns(loadXML('binary-field'));

        const [report] = await saveReport(
          { contact: { _id: 'my-user', phone: '8989' } },
          { doc: { internalId: 'my-form' } }
        );

        expect(report.fields).to.deep.equal({
          name: 'Mary',
          age: '10',
          gender: 'f',
          my_file: '',
        });
        expect(report._attachments['user-file/my-form/my_file']).to.deep.equal({
          data: 'some image data',
          content_type: 'image/png',
        });
      });

      it('retains custom attachments and referenced file attachments, dropping unreferenced ones', async () => {
        form.validate.resolves(true);
        // The <photo> field references the "referenced.png" file attachment; nothing references "orphan.png".
        form.getDataStr.returns('<data><photo>referenced.png</photo></data>');

        const [report] = await saveReport(
          {
            contact: { _id: '123', phone: '555' },
            _attachments: {
              'some-custom-attachment': { content_type: 'text/plain', data: 'c' },
              'user-file-referenced.png': { content_type: 'image/png', data: 'a' },
              'user-file-orphan.png': { content_type: 'image/png', data: 'b' },
            },
          },
          { doc: { internalId: 'my-form' } }
        );

        // Custom (non user-file) attachments are kept
        expect(report._attachments['some-custom-attachment']).to.deep.equal({ content_type: 'text/plain', data: 'c' });
        // user-file attachments still referenced by a field are kept
        expect(report._attachments['user-file-referenced.png']).to.deep.equal({ content_type: 'image/png', data: 'a' });
        // user-file attachments no longer referenced by any field are dropped
        expect(report._attachments['user-file-orphan.png']).to.be.undefined;
      });
    });
  });

  describe('saveContact', () => {
    let getContact;

    beforeEach(() => {
      getContact = sinon.stub();
      chtDatasourceService.bind.returns(getContact);
      service = TestBed.inject(EnketoService);
      sinon.stub(FileManager, 'getCurrentFiles').returns([]);
      form.validate.resolves(true);
    });

    const saveContact = (defaultData, doc = { internalId: 'contact-form', xmlVersion: '1' }) => {
      const config = buildFormConfig({ type: 'contact', doc });
      return service.saveContact({ config, form }, defaultData);
    };

    it('rejects on invalid form', async () => {
      const dispatchEventStub = sinon.stub(form.view.html, 'dispatchEvent');
      form.validate.resolves(false);
      form.getDataStr.returns('<data><clinic><name>A Clinic</name></clinic></data>');
      const config = buildFormConfig({ type: 'contact', doc: { internalId: 'contact-form' } });

      await expect(service.saveContact({ config, form }, { type: 'clinic' })).to.be.rejectedWith(FormValidationError);
      expect(form.validate.callCount).to.equal(1);
      expect(dispatchEventStub).to.not.have.been.called;
    });

    it('builds the contact doc from the group named after the contact type', async () => {
      const dispatchEventStub = sinon.stub(form.view.html, 'dispatchEvent');
      const xml = `
        <data>
          <not-clinic>
            <name>Not Clinic</name>
          </not-clinic>
          <clinic>
            <name>New Clinic</name>
          </clinic>
        </data>`;

      form.getDataStr.returns(xml);
      const { docId, preparedDocs } = await saveContact({ contact_type: 'clinic', type: 'contact' });

      expect(preparedDocs).excluding(['reported_date']).to.deep.equal([{
        _id: docId,
        name: 'New Clinic',
        type: 'contact',
        form_version: '1',
        contact_type: 'clinic',
        contact: undefined,
        parent: undefined,
        _attachments: undefined,
      }]);
      expect(preparedDocs[0]._id).to.not.be.empty;
      expect(preparedDocs[0].reported_date).to.be.a('number');
      expect(dispatchEventStub).to.have.been.calledOnceWithExactly(events.BeforeSave());
    });

    it('throws when the group named after the contact type is missing', async () => {
      const xml = '<data><person><name>A Person</name></person></data>';
      form.getDataStr.returns(xml);

      await expect(saveContact({ type: 'clinic' })).to.be.rejectedWith(
        'Failed to save contact form because the data for the contact is not contained in the clinic group.'
      );
    });

    it('creates an inline sibling doc for a parent field set to NEW', async () => {
      const xml = `
        <data>
          <clinic>
            <name>New Clinic</name>
            <parent>NEW</parent>
          </clinic>
          <parent>
            <name>New Parent Place</name>
            <type>district_hospital</type>
          </parent>
        </data>`;
      form.getDataStr.returns(xml);

      const { docId, preparedDocs: [clinic, districtHospital, ...additional] } = await saveContact({ type: 'clinic' });

      expect(additional).to.be.empty;
      expect(clinic).excluding(['reported_date']).to.deep.equal({
        _id: docId,
        name: 'New Clinic',
        type: 'clinic',
        form_version: '1',
        contact_type: undefined,
        contact: undefined,
        parent: { _id: districtHospital._id },
        _attachments: undefined,
      });
      expect(clinic._id).to.not.be.empty;
      expect(clinic.reported_date).to.be.a('number');
      expect(districtHospital).excluding(['reported_date']).to.deep.equal({
        _id: clinic.parent._id,
        name: 'New Parent Place',
        type: 'district_hospital',
        form_version: '1',
        contact: undefined,
        parent: undefined,
      });
      expect(districtHospital._id).to.not.be.empty;
      expect(districtHospital.reported_date).to.be.a('number');
    });

    it('preserves the _id and reported_date when editing an existing contact', async () => {
      form.getDataStr.returns('<data><clinic><name>Edited Clinic</name></clinic></data>');

      const { docId, preparedDocs } = await saveContact({
        _id: 'existing-clinic',
        reported_date: 1234,
        type: 'clinic',
        form_version: '0',
      });

      expect(docId).to.equal('existing-clinic');
      expect(preparedDocs).to.deep.equal([{
        _id: 'existing-clinic',
        reported_date: 1234,
        name: 'Edited Clinic',
        type: 'clinic',
        form_version: '1',
        contact_type: undefined,
        contact: undefined,
        parent: undefined,
        _attachments: undefined,
      }]);
    });

    it('creates an inline sibling doc for a contact field set to NEW', async () => {
      const xml = `
        <data>
          <clinic>
            <name>New Clinic</name>
            <contact>NEW</contact>
          </clinic>
          <contact>
            <name>New CHW</name>
            <type>person</type>
            <parent>PARENT</parent>
          </contact>
        </data>`;
      form.getDataStr.returns(xml);

      const { docId, preparedDocs: [clinic, chw, ...additional] } = await saveContact({ type: 'clinic' });

      expect(additional).to.be.empty;
      expect(clinic).excluding(['reported_date']).to.deep.equal({
        _id: docId,
        name: 'New Clinic',
        type: 'clinic',
        form_version: '1',
        contact_type: undefined,
        parent: undefined,
        contact: { _id: chw._id, parent: { _id: docId } },
        _attachments: undefined,
      });
      expect(chw).excluding(['reported_date', '_id']).to.deep.equal({
        name: 'New CHW',
        type: 'person',
        form_version: '1',
        parent: { _id: docId },
        contact: undefined,
      });
      expect(getContact.callCount).to.equal(0);
    });

    it('creates a child doc from a repeat/child element', async () => {
      const xml = `
        <data>
          <clinic><name>New Clinic</name></clinic>
          <repeat>
            <child>
              <name>Child One</name>
              <type>person</type>
            </child>
          </repeat>
        </data>`;
      form.getDataStr.returns(xml);

      const { docId, preparedDocs: [clinic, child, ...additional] } = await saveContact({ type: 'clinic' });

      expect(additional).to.be.empty;
      expect(clinic._id).to.equal(docId);
      expect(child._id).to.not.equal(clinic._id);
      expect(child).excluding(['reported_date', '_id']).to.deep.equal({
        name: 'Child One',
        type: 'person',
        form_version: '1',
        parent: { _id: clinic._id },
        contact: undefined,
      });
    });

    it('does not write parent/contact siblings when the contact has no parent/contact value set', async () => {
      const xml = `
        <data>
          <clinic><name>New Clinic</name></clinic>
          <parent><name>Unused Parent</name><type>district_hospital</type></parent>
          <contact><name>Unused Contact</name><type>person</type></contact>
        </data>`;
      form.getDataStr.returns(xml);

      const { preparedDocs: [clinic, ...additional] } = await saveContact({ type: 'clinic' });

      expect(additional).to.be.empty;
      expect(clinic.parent).to.be.undefined;
      expect(clinic.contact).to.be.undefined;
      expect(getContact.callCount).to.equal(0);
    });

    it('writes all parent, contact and child siblings for a new contact', async () => {
      const xml = `
        <data>
          <clinic>
            <name>New Clinic</name>
            <parent><_id>NEW</_id></parent>
            <contact><_id>NEW</_id></contact>
          </clinic>
          <parent><name>New Parent</name><type>district_hospital</type></parent>
          <contact><name>New Contact</name><parent>PARENT</parent></contact>
          <repeat>
            <child><name>Child A</name><type>person</type></child>
            <child><name>Child B</name><type>person</type></child>
          </repeat>
        </data>`;
      form.getDataStr.returns(xml);

      const {
        docId,
        preparedDocs: [clinic, parent, contact, childA, childB, ...additional],
      } = await saveContact({ type: 'clinic' });

      expect(additional).to.be.empty;
      expect(clinic).excluding(['reported_date']).to.deep.equal({
        _id: docId,
        name: 'New Clinic',
        type: 'clinic',
        parent: { _id: parent._id },
        contact: { _id: contact._id, parent: { _id: docId, parent: { _id: parent._id } } },
        form_version: '1',
        contact_type: undefined,
        _attachments: undefined,
      });
      expect(parent).excluding(['reported_date', '_id']).to.deep.equal({
        name: 'New Parent', type: 'district_hospital', form_version: '1', parent: undefined, contact: undefined,
      });
      expect(contact).excluding(['reported_date', '_id']).to.deep.equal({
        name: 'New Contact',
        type: 'person',
        form_version: '1',
        parent: { _id: docId, parent: { _id: parent._id } },
        contact: undefined,
      });
      expect(childA).excluding(['reported_date', '_id']).to.deep.equal({
        name: 'Child A',
        type: 'person',
        form_version: '1',
        parent: { _id: clinic._id, parent: { _id: parent._id } },
        contact: undefined,
      });
      expect(childB).excluding(['reported_date', '_id']).to.deep.equal({
        name: 'Child B',
        type: 'person',
        form_version: '1',
        parent: { _id: clinic._id, parent: { _id: parent._id } },
        contact: undefined,
      });
      expect(getContact.callCount).to.equal(0);
    });

    it('fetches parent and contact from the datasource when ids are set with no sibling groups', async () => {
      const xml = `
        <data>
          <clinic>
            <name>New Clinic</name>
            <parent>parent-id</parent>
            <contact>contact-id</contact>
          </clinic>
        </data>`;
      form.getDataStr.returns(xml);
      getContact.onCall(0).resolves({ _id: 'parent-id', type: 'district_hospital', parent: { _id: 'grandparent-id' } });
      getContact.onCall(1).resolves({ _id: 'contact-id', type: 'person', parent: { _id: 'grandparent-id' } });

      const { docId, preparedDocs: [clinic, ...additional] } = await saveContact({ type: 'clinic' });

      expect(additional).to.be.empty;
      expect(clinic).excluding(['reported_date']).to.deep.equal({
        _id: docId,
        name: 'New Clinic',
        type: 'clinic',
        parent: { _id: 'parent-id', parent: { _id: 'grandparent-id' } },
        contact: { _id: 'contact-id', parent: { _id: 'grandparent-id' } },
        form_version: '1',
        contact_type: undefined,
        _attachments: undefined,
      });
      expect(getContact.args).to.deep.equal([[Qualifier.byUuid('parent-id')], [Qualifier.byUuid('contact-id')]]);
    });

    it('keeps the existing parent/contact lineage on edit when the values are unchanged', async () => {
      const xml = `
        <data>
          <clinic>
            <name>Edited Clinic</name>
            <parent>p1</parent>
            <contact>c1</contact>
          </clinic>
        </data>`;
      form.getDataStr.returns(xml);

      const { preparedDocs: [clinic, ...additional] } = await saveContact({
        _id: 'existing-clinic',
        reported_date: 9,
        type: 'clinic',
        parent: { _id: 'p1', parent: { _id: 'gp1' } },
        contact: { _id: 'c1' },
      });

      expect(additional).to.be.empty;
      expect(clinic).to.deep.equal({
        _id: 'existing-clinic',
        name: 'Edited Clinic',
        reported_date: 9,
        type: 'clinic',
        parent: { _id: 'p1', parent: { _id: 'gp1' } },
        contact: { _id: 'c1' },
        form_version: '1',
        contact_type: undefined,
        _attachments: undefined,
      });
      expect(getContact).to.not.have.been.called;
    });

    describe('attachments', () => {
      let getCurrentFiles;

      beforeEach(() => getCurrentFiles = FileManager.getCurrentFiles as sinon.SinonStub);

      it('builds file attachments from the current files', async () => {
        form.getDataStr.returns('<data><clinic><name>Clinic</name></clinic></data>');
        getCurrentFiles.returns([
          { name: 'my_image', type: 'image' },
          { name: 'my_file', type: 'file' },
        ]);

        const { preparedDocs: [clinic] } = await saveContact({ type: 'clinic' });

        const imageAttachment = clinic._attachments['user-file-my_image'];
        expect(imageAttachment.content_type).to.equal('image');
        expect(imageAttachment.data).to.be.an.instanceof(Blob);
        const fileAttachment = clinic._attachments['user-file-my_file'];
        expect(fileAttachment.content_type).to.equal('file');
        expect(fileAttachment.data).to.be.an.instanceof(Blob);
      });

      it('builds binary attachments and clears the binary field value', async () => {
        form.getDataStr.returns(
          '<data><clinic><name>Clinic</name><my_file type="binary">some image data</my_file></clinic></data>'
        );

        const { preparedDocs: [clinic] } = await saveContact({ type: 'clinic' });

        expect(clinic.my_file).to.equal('');
        expect(clinic._attachments['user-file/contact-form/clinic/my_file']).to.deep.equal({
          data: 'some image data',
          content_type: 'image/png',
        });
      });

      it('retains custom attachments and referenced file attachments, dropping unreferenced ones', async () => {
        // The <photo> field references "referenced.png"; nothing references "orphan.png".
        form.getDataStr.returns('<data><clinic><name>Clinic</name><photo>referenced.png</photo></clinic></data>');

        const { preparedDocs: [clinic] } = await saveContact({
          type: 'clinic',
          _attachments: {
            'some-custom-attachment': { content_type: 'text/plain', data: 'c' },
            'user-file-referenced.png': { content_type: 'image/png', data: 'a' },
            'user-file-orphan.png': { content_type: 'image/png', data: 'b' },
          },
        });

        expect(clinic._attachments['some-custom-attachment']).to.deep.equal({ content_type: 'text/plain', data: 'c' });
        expect(clinic._attachments['user-file-referenced.png'])
          .to.deep.equal({ content_type: 'image/png', data: 'a' });
        expect(clinic._attachments['user-file-orphan.png']).to.be.undefined;
      });
    });
  });

  describe('unload', () => {
    beforeEach(() => {
      service = TestBed.inject(EnketoService);
    });

    it('resets the view of the current form', async () => {
      enketoInit.returns([]);
      EnketoPrepopulationData.returns('<xml></xml>');
      const formContext = {
        selector: $('<div></div>'),
        formConfig: buildFormConfig({ html: $('<div>my form</div>'), model: VISIT_MODEL }),
      };
      const userSettings = { language: 'en' };

      const enketoForm = await service.renderForm(formContext, userSettings);

      service.unload(enketoForm.form);
      expect(form.resetView.callCount).to.equal(1);
      expect(service.getCurrentForm()).to.be.undefined;
    });

    it('does nothing when the given form is not the current form', () => {
      service.unload({ resetView: sinon.stub() });
      expect(form.resetView.callCount).to.equal(0);
    });
  });
});
