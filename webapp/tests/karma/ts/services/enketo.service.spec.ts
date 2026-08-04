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
import { EnketoService, ExternalInstance, FormValidationError } from '@mm-services/enketo.service';
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
  const VISIT_MODEL_WITH_EXTERNAL_DATASET = loadXML('visit-external-dataset');

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
        expect(EnketoForm.args[0][1].external).to.deep.equal([]);
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

    it('spreads externalInstances into options.external', () => {
      enketoInit.returns([]);
      EnketoPrepopulationData.returns('<xml></xml>');
      const externalDoc = new DOMParser().parseFromString('<root><item><name>a</name></item></root>', 'text/xml');
      const externalInstances: ExternalInstance[] = [{ id: 'items', xml: externalDoc }];
      const formConfig = buildFormConfig({
        html: $('<div>my form</div>'),
        model: VISIT_MODEL_WITH_EXTERNAL_DATASET,
      });
      const formContext = new WebappEnketoFormContext('#div', formConfig);
      formContext.contactSummary = { id: 'contact-summary', context: { pregnant: true } };
      formContext.externalInstances = externalInstances;
      const userSettings = { language: 'en' };
      return service.renderForm(formContext, userSettings).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        const external = EnketoForm.args[0][1].external;
        expect(external[0].id).to.equal('contact-summary');
        expect(external[1]).to.deep.equal(externalInstances[0]);
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
    const repeatXml = '<data><repeat nodeset="/data/repeat_section"></repeat></data>';

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

      expect(thing1).excluding(['_id', 'reported_date']).to.deep.equal({
        ...doc1,
        form_version: undefined,
        _attachments: undefined,
      });
      expect(thing1._id).to.not.be.empty;
      expect(thing1.reported_date).to.be.a('number');
      expect(thing2).excluding(['_id', 'reported_date']).to.deep.equal({
        ...doc2,
        form_version: undefined,
        _attachments: undefined,
      });
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
        ...doc1, _id: report.fields.my_child_01, form_version: undefined, _attachments: undefined
      });
      expect(thing1._id).to.not.be.empty;
      expect(thing1.reported_date).to.be.a('number');
      expect(thing2).excluding(['reported_date']).to.deep.equal({
        ...doc2, _id: report.fields.my_child_02, form_version: undefined, _attachments: undefined
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
        ...doc1, _id: report.fields.repeat_section[0].repeat_doc_ref, form_version: undefined, _attachments: undefined
      });
      expect(thing1._id).to.not.be.empty;
      expect(thing1.reported_date).to.be.a('number');
      expect(thing2).excluding(['reported_date']).to.deep.equal({
        ...doc2, _id: report.fields.repeat_section[1].repeat_doc_ref, form_version: undefined, _attachments: undefined
      });
      expect(thing2._id).to.not.be.empty;
      expect(thing2.reported_date).to.be.a('number');
      expect(thing3).excluding(['reported_date']).to.deep.equal({
        ...doc3, _id: report.fields.repeat_section[2].repeat_doc_ref, form_version: undefined, _attachments: undefined
      });
      expect(thing3._id).to.not.be.empty;
      expect(thing3.reported_date).to.be.a('number');
    });

    it('creates a db-doc for each repeated db-doc element', async () => {
      form.validate.resolves(true);
      form.getDataStr.returns(loadXML('extra-docs-with-repeat'));

      const [report, thing1, thing2, thing3, ...additional] = await saveReport(
        { contact: { _id: '123', phone: '555' } },
        { doc: { internalId: 'V' } }
      );

      expect(additional).to.be.empty;
      const doc1 = { my_parent: report._id, some_property: 'some_value_1', type: 'repeater' };
      const doc2 = { my_parent: report._id, some_property: 'some_value_2', type: 'repeater' };
      const doc3 = { my_parent: report._id, some_property: 'some_value_3', type: 'repeater' };
      expect(report).excluding(['reported_date']).to.deep.equal({
        _id: report._id,
        contact: { _id: '123' },
        content_type: 'xml',
        fields: {
          name: 'Sally',
          lmp: '10',
          secret_code_name: 'S4L',
          // The three repeated <repeat_doc> elements are not declared as a repeat path, so only the last one survives
          // deserialization of the report fields (each still becomes its own db-doc below).
          repeat_doc: doc3,
        },
        form: 'V',
        form_version: undefined,
        from: '555',
        hidden_fields: ['secret_code_name', 'repeat_doc'],
        type: DOC_TYPES.DATA_RECORD,
        _attachments: undefined,
      });
      expect(thing1).excluding(['reported_date']).to.deep.equal({
        ...doc1,
        _id: thing1._id,
        form_version: undefined,
        _attachments: undefined,
      });
      expect(thing2).excluding(['reported_date']).to.deep.equal({
        ...doc2,
        _id: thing2._id,
        form_version: undefined,
        _attachments: undefined,
      });
      expect(thing3).excluding(['reported_date']).to.deep.equal({
        ...doc3,
        _id: thing3._id,
        form_version: undefined,
        _attachments: undefined,
      });
    });

    it('populates db-doc-ref elements inside deeply-nested repeats', async () => {
      form.validate.resolves(true);
      form.getDataStr.returns(loadXML('db-doc-ref-in-deep-repeat'));

      const [report, thing1, thing2, thing3, ...additional] = await saveReport(
        { contact: { _id: '123', phone: '555' } },
        { xml: repeatXml, doc: { internalId: 'V' } }
      );

      expect(additional).to.be.empty;
      const doc1 = { my_parent: report._id, some_property: 'some_value_1', type: 'repeater' };
      const doc2 = { my_parent: report._id, some_property: 'some_value_1', type: 'repeater' };
      const doc3 = { my_parent: report._id, some_property: 'some_value_1', type: 'repeater' };
      expect(report).excluding(['reported_date']).to.deep.equal({
        _id: report._id,
        contact: { _id: '123' },
        content_type: 'xml',
        fields: {
          name: 'Sally',
          lmp: '10',
          secret_code_name: 'S4L',
          repeat_section: [
            {
              extra: 'data1',
              other: { deep: { structure: { repeat_doc: doc1 } } },
              some: { deep: { structure: { repeat_doc_ref: thing1._id } } },
            },
            {
              extra: 'data2',
              other: { deep: { structure: { repeat_doc: doc2 } } },
              some: { deep: { structure: { repeat_doc_ref: thing2._id } } },
            },
            {
              extra: 'data3',
              other: { deep: { structure: { repeat_doc: doc3 } } },
              some: { deep: { structure: { repeat_doc_ref: thing3._id } } },
            },
          ],
        },
        form: 'V',
        form_version: undefined,
        from: '555',
        hidden_fields: ['secret_code_name', 'repeat_section.other.deep.structure.repeat_doc'],
        type: DOC_TYPES.DATA_RECORD,
        _attachments: undefined,
      });
      expect(thing1).excluding(['reported_date']).to.deep.equal({
        ...doc1,
        _id: thing1._id,
        form_version: undefined,
        _attachments: undefined,
      });
      expect(thing2).excluding(['reported_date']).to.deep.equal({
        ...doc2,
        _id: thing2._id,
        form_version: undefined,
        _attachments: undefined,
      });
      expect(thing3).excluding(['reported_date']).to.deep.equal({
        ...doc3,
        _id: thing3._id,
        form_version: undefined,
        _attachments: undefined,
      });
    });

    it('populates db-doc-ref elements that reference a db-doc outside the repeat', async () => {
      form.validate.resolves(true);
      form.getDataStr.returns(loadXML('db-doc-ref-outside-of-repeat'));

      const [report, separateDoc, ...additional] = await saveReport(
        { contact: { _id: '123', phone: '555' } },
        { xml: repeatXml, doc: { internalId: 'V' } }
      );

      expect(additional).to.be.empty;
      const separate = { my_parent: report._id, some_property: 'some_value_1', type: 'separat5e' };
      expect(report).excluding(['reported_date']).to.deep.equal({
        _id: report._id,
        contact: { _id: '123' },
        content_type: 'xml',
        fields: {
          name: 'Sally',
          lmp: '10',
          secret_code_name: 'S4L',
          separate_doc: separate,
          // Every repeat instance references the single db-doc defined outside the repeat.
          repeat_section: [
            { extra: 'data1', repeat_doc_ref: separateDoc._id },
            { extra: 'data2', repeat_doc_ref: separateDoc._id },
            { extra: 'data3', repeat_doc_ref: separateDoc._id },
          ],
        },
        form: 'V',
        form_version: undefined,
        from: '555',
        hidden_fields: ['secret_code_name', 'separate_doc'],
        type: DOC_TYPES.DATA_RECORD,
        _attachments: undefined,
      });
      expect(separateDoc).excluding(['reported_date'])
        .to.deep.equal({ ...separate, _id: separateDoc._id, form_version: undefined, _attachments: undefined });
    });

    it('creates a db-doc from each repeat instance when the repeat itself is the db-doc', async () => {
      form.validate.resolves(true);
      form.getDataStr.returns(loadXML('db-doc-ref-same-as-repeat'));

      const [report, doc1, doc2, doc3, ...additional] = await saveReport(
        { contact: { _id: '123', phone: '555' } },
        { xml: repeatXml, doc: { internalId: 'V' } }
      );

      expect(additional).to.be.empty;
      const repeat1 = {
        extra: 'data1', type: 'repeater', some_property: 'some_value_1', my_parent: report._id,
        repeat_doc_ref: doc1._id,
      };
      const repeat2 = {
        extra: 'data2', type: 'repeater', some_property: 'some_value_2', my_parent: report._id,
        repeat_doc_ref: doc2._id,
      };
      const repeat3 = {
        extra: 'data3', type: 'repeater', some_property: 'some_value_3', my_parent: report._id,
        child: { repeat_doc_ref: doc3._id },
      };
      expect(report).excluding(['reported_date']).to.deep.equal({
        _id: report._id,
        contact: { _id: '123' },
        content_type: 'xml',
        fields: {
          name: 'Sally',
          lmp: '10',
          secret_code_name: 'S4L',
          repeat_section: [repeat1, repeat2, repeat3],
          // A db-doc-ref outside any repeat resolves to the first (closest) repeat_section db-doc.
          repeat_doc_ref: doc1._id,
        },
        form: 'V',
        form_version: undefined,
        from: '555',
        hidden_fields: ['secret_code_name', 'repeat_section'],
        type: DOC_TYPES.DATA_RECORD,
        _attachments: undefined,
      });
      expect(doc1).excluding(['reported_date']).to.deep.equal({
        ...repeat1,
        _id: doc1._id,
        form_version: undefined,
        _attachments: undefined,
      });
      expect(doc2).excluding(['reported_date']).to.deep.equal({
        ...repeat2,
        _id: doc2._id,
        form_version: undefined,
        _attachments: undefined,
      });
      expect(doc3).excluding(['reported_date']).to.deep.equal({
        ...repeat3,
        _id: doc3._id,
        form_version: undefined,
        _attachments: undefined,
      });
    });

    it('leaves db-doc-ref elements with unresolvable references untouched', async () => {
      form.validate.resolves(true);
      form.getDataStr.returns(loadXML('db-doc-ref-broken-ref'));

      const [report, doc1, doc2, doc3, ...additional] = await saveReport(
        { contact: { _id: '123', phone: '555' } },
        { xml: repeatXml, doc: { internalId: 'V' } }
      );

      expect(additional).to.be.empty;
      const repeat1 = {
        extra: 'data1', type: 'repeater', some_property: 'some_value_1', my_parent: report._id,
        repeat_doc_ref: 'value1',
      };
      const repeat2 = {
        extra: 'data2', type: 'repeater', some_property: 'some_value_2', my_parent: report._id,
        repeat_doc_ref: 'value2', ing: 'something',
      };
      const repeat3 = {
        extra: 'data3', type: 'repeater', some_property: 'some_value_3', my_parent: report._id,
        repeat_doc_ref: 'value3',
      };
      expect(report).excluding(['reported_date']).to.deep.equal({
        _id: report._id,
        contact: { _id: '123' },
        content_type: 'xml',
        fields: {
          name: 'Sally',
          lmp: '10',
          secret_code_name: 'S4L',
          // None of the db-doc-refs point at a real element, so each keeps its original literal value.
          repeat_section: [repeat1, repeat2, repeat3],
        },
        form: 'V',
        form_version: undefined,
        from: '555',
        hidden_fields: ['secret_code_name', 'repeat_section'],
        type: DOC_TYPES.DATA_RECORD,
        _attachments: undefined,
      });
      expect(doc1).excluding(['reported_date']).to.deep.equal({
        ...repeat1,
        _id: doc1._id,
        form_version: undefined,
        _attachments: undefined,
      });
      expect(doc2).excluding(['reported_date']).to.deep.equal({
        ...repeat2,
        _id: doc2._id,
        form_version: undefined,
        _attachments: undefined,
      });
      expect(doc3).excluding(['reported_date']).to.deep.equal({
        ...repeat3,
        _id: doc3._id,
        form_version: undefined,
        _attachments: undefined,
      });
    });

    it('populates a local (./) db-doc-ref with the sibling db-doc in the same repeat', async () => {
      form.validate.resolves(true);
      form.getDataStr.returns(loadXML('db-doc-ref-in-repeats-with-local-references'));

      const [report, thing1, thing2, thing3, ...additional] = await saveReport(
        { contact: { _id: '123', phone: '555' } },
        { xml: repeatXml, doc: { internalId: 'V' } }
      );

      expect(additional).to.be.empty;
      const doc1 = { my_parent: report._id, some_property: 'some_value_1', type: 'repeater' };
      const doc2 = { my_parent: report._id, some_property: 'some_value_2', type: 'repeater' };
      const doc3 = { my_parent: report._id, some_property: 'some_value_3', type: 'repeater' };
      expect(report).excluding(['reported_date']).to.deep.equal({
        _id: report._id,
        contact: { _id: '123' },
        content_type: 'xml',
        fields: {
          name: 'Sally',
          lmp: '10',
          secret_code_name: 'S4L',
          repeat_section: [
            { extra: 'data1', repeat_doc: doc1, repeat_doc_ref: thing1._id },
            { extra: 'data2', repeat_doc: doc2, repeat_doc_ref: thing2._id },
            { extra: 'data3', repeat_doc: doc3, repeat_doc_ref: thing3._id },
          ],
        },
        form: 'V',
        form_version: undefined,
        from: '555',
        hidden_fields: ['secret_code_name', 'repeat_section.repeat_doc'],
        type: DOC_TYPES.DATA_RECORD,
        _attachments: undefined,
      });
      expect(thing1).excluding(['reported_date']).to.deep.equal({
        ...doc1,
        _id: thing1._id,
        form_version: undefined,
        _attachments: undefined,
      });
      expect(thing2).excluding(['reported_date']).to.deep.equal({
        ...doc2,
        _id: thing2._id,
        form_version: undefined,
        _attachments: undefined,
      });
      expect(thing3).excluding(['reported_date']).to.deep.equal({
        ...doc3,
        _id: thing3._id,
        form_version: undefined,
        _attachments: undefined,
      });
    });

    it('resolves a db-doc-ref to the db-doc when a non-db-doc sibling shares the element name', async () => {
      form.validate.resolves(true);
      form.getDataStr.returns(loadXML('db-doc-ref-in-deep-repeats-extra-repeats'));

      const [report, thing1, thing2, thing3, ...additional] = await saveReport(
        { contact: { _id: '123', phone: '555' } },
        { xml: repeatXml, doc: { internalId: 'V' } }
      );

      expect(additional).to.be.empty;
      const doc = { my_parent: report._id, some_property: 'some_value_1', type: 'repeater' };
      const buildRepeat = (extra: string, refId: string) => ({
        extra,
        other: { deep: { structure: { repeat_doc: doc } } },
        some: { deep: { structure: { repeat_doc_ref: refId } } },
      });
      expect(report).excluding(['reported_date']).to.deep.equal({
        _id: report._id,
        contact: { _id: '123' },
        content_type: 'xml',
        fields: {
          name: 'Sally',
          lmp: '10',
          secret_code_name: 'S4L',
          repeat_section: [
            buildRepeat('data1', thing1._id),
            buildRepeat('data2', thing2._id),
            buildRepeat('data3', thing3._id),
          ],
        },
        form: 'V',
        form_version: undefined,
        from: '555',
        hidden_fields: ['secret_code_name', 'repeat_section.other.deep.structure.repeat_doc'],
        type: DOC_TYPES.DATA_RECORD,
        _attachments: undefined,
      });
      expect(thing1).excluding(['reported_date']).to.deep.equal({
        ...doc,
        _id: thing1._id,
        form_version: undefined,
        _attachments: undefined,
      });
      expect(thing2).excluding(['reported_date']).to.deep.equal({
        ...doc,
        _id: thing2._id,
        form_version: undefined,
        _attachments: undefined,
      });
      expect(thing3).excluding(['reported_date']).to.deep.equal({
        ...doc,
        _id: thing3._id,
        form_version: undefined,
        _attachments: undefined,
      });
    });

    it('populates a deeply-nested local db-doc-ref, skipping the non-db-doc sibling', async () => {
      form.validate.resolves(true);
      form.getDataStr.returns(loadXML('db-doc-ref-in-deep-repeats-with-local-references'));

      const [report, thing1, thing2, thing3, ...additional] = await saveReport(
        { contact: { _id: '123', phone: '555' } },
        { xml: repeatXml, doc: { internalId: 'V' } }
      );

      expect(additional).to.be.empty;
      const doc = { my_parent: report._id, some_property: 'some_value_1', type: 'repeater' };
      const buildRepeat = (extra: string, refId: string) => ({
        extra,
        other: { deep: { structure: { repeat_doc: doc } } },
        some: { deep: { structure: { repeat_doc_ref: refId } } },
      });
      expect(report).excluding(['reported_date']).to.deep.equal({
        _id: report._id,
        contact: { _id: '123' },
        content_type: 'xml',
        fields: {
          name: 'Sally',
          lmp: '10',
          secret_code_name: 'S4L',
          repeat_section: [
            buildRepeat('data1', thing1._id),
            buildRepeat('data2', thing2._id),
            buildRepeat('data3', thing3._id),
          ],
        },
        form: 'V',
        form_version: undefined,
        from: '555',
        hidden_fields: ['secret_code_name', 'repeat_section.other.deep.structure.repeat_doc'],
        type: DOC_TYPES.DATA_RECORD,
        _attachments: undefined,
      });
      expect(thing1).excluding(['reported_date']).to.deep.equal({
        ...doc,
        _id: thing1._id,
        form_version: undefined,
        _attachments: undefined,
      });
      expect(thing2).excluding(['reported_date']).to.deep.equal({
        ...doc,
        _id: thing2._id,
        form_version: undefined,
        _attachments: undefined,
      });
      expect(thing3).excluding(['reported_date']).to.deep.equal({
        ...doc,
        _id: thing3._id,
        form_version: undefined,
        _attachments: undefined,
      });
    });

    describe('attachments', () => {
      let getCurrentFiles;

      beforeEach(() => {
        getCurrentFiles = FileManager.getCurrentFiles as sinon.SinonStub;
      });

      it('builds file attachments from the current files referenced by a field', async () => {
        form.validate.resolves(true);
        form.getDataStr.returns(loadXML('file-field'));
        // Only "some image name.png" is referenced by the <my_file> field
        const file0 = { name: 'some image name.png', type: 'image' };
        const file1 = { name: 'not_referenced', type: 'file' };
        getCurrentFiles.returns([file0, file1]);

        const [report] = await saveReport(
          { contact: { _id: 'my-user', phone: '8989' } },
          { doc: { internalId: 'my-form' } }
        );

        expect(Object.keys(report._attachments)).to.deep.equal(['user-file-some image name.png']);
        const imageAttachment = report._attachments['user-file-some image name.png'];
        expect(imageAttachment.content_type).to.equal('image');
        expect(imageAttachment.data).to.be.an.instanceof(Blob);
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
        expect(report._attachments['user-file/my_file']).to.deep.equal({
          data: 'some image data',
          content_type: 'image/png',
        });
      });

      it('names binary attachments by the full field path, not the root node name', async () => {
        form.validate.resolves(true);
        form.getDataStr.returns(loadXML('deep-file-fields'));

        const [report] = await saveReport(
          { contact: { _id: 'my-user', phone: '8989' } },
          { doc: { internalId: 'my-form' } }
        );

        expect(report.fields).to.deep.equal({
          name: 'Mary',
          age: '10',
          gender: 'f',
          my_file: '',
          sub_element: { sub_sub_element: { other_file: '' } },
        });
        // Attachment names use the field's path relative to the owning doc - not the root node name
        // ("my-root-element") - even for a deeply-nested field.
        expect(Object.keys(report._attachments)).to.have.members([
          'user-file/my_file',
          'user-file/sub_element/sub_sub_element/other_file',
        ]);
        expect(report._attachments['user-file/my_file']).to.deep.equal({
          data: 'some image data',
          content_type: 'image/png',
        });
        expect(report._attachments['user-file/sub_element/sub_sub_element/other_file']).to.deep.equal({
          data: 'some other data',
          content_type: 'image/png',
        });
      });

      it('includes the repeat index in binary attachment names', async () => {
        form.validate.resolves(true);
        form.getDataStr.returns(loadXML('plain-repeat-binary'));

        const [report, ...additional] = await saveReport(
          { contact: { _id: 'my-user', phone: '8989' } },
          { xml: '<root><repeat nodeset="/my-form/my_repeat"></repeat></root>', doc: { internalId: 'my-form' } }
        );

        expect(additional).to.be.empty;
        expect(report.fields).to.deep.equal({
          name: 'Sally',
          my_repeat: [{ photo: '' }, { photo: '' }],
        });
        expect(report._attachments).to.deep.equal({
          'user-file/my_repeat[1]/photo': { data: 'repeat_photo_data_0', content_type: 'image/png' },
          'user-file/my_repeat[2]/photo': { data: 'repeat_photo_data_1', content_type: 'image/png' },
        });
      });

      it('routes binary attachments to the db-doc that owns the field', async () => {
        form.validate.resolves(true);
        form.getDataStr.returns(loadXML('db-doc-with-binary'));

        const [report, doc1, doc2, ...additional] = await saveReport(
          { contact: { _id: 'my-user', phone: '8989' } },
          { doc: { internalId: 'my-form' } }
        );

        expect(additional).to.be.empty;
        // Only the main doc's own binary field is attached to the main doc
        expect(report._attachments).to.deep.equal({
          'user-file/main_photo': { data: 'main_photo_data', content_type: 'image/png' },
        });
        expect(report.fields.main_photo).to.equal('');
        expect(report.fields.doc1.photo1).to.equal('');
        expect(report.fields.doc2.photo2).to.equal('');
        // Each sub-doc gets the binary attachment for the field it contains
        expect(doc1._attachments).to.deep.equal({
          'user-file/photo1': { data: 'sub_photo_data_1', content_type: 'image/png' },
        });
        expect(doc1.photo1).to.equal('');
        expect(doc2._attachments).to.deep.equal({
          'user-file/photo2': { data: 'sub_photo_data_2', content_type: 'image/png' },
        });
        expect(doc2.photo2).to.equal('');
      });

      it('routes file attachments to the db-doc that references the file', async () => {
        form.validate.resolves(true);
        form.getDataStr.returns(loadXML('db-doc-with-file-field'));
        getCurrentFiles.returns([
          { name: 'main_upload.png', type: 'image/png' },
          { name: 'sub_upload.png', type: 'image/png' },
        ]);

        const [report, doc1, ...additional] = await saveReport(
          { contact: { _id: 'my-user', phone: '8989' } },
          { doc: { internalId: 'my-form' } }
        );

        expect(additional).to.be.empty;
        expect(report.fields.main_file).to.equal('main_upload.png');
        expect(report.fields.doc1.sub_file).to.equal('sub_upload.png');
        expect(Object.keys(report._attachments)).to.deep.equal(['user-file-main_upload.png']);
        expect(doc1.sub_file).to.equal('sub_upload.png');
        expect(Object.keys(doc1._attachments)).to.deep.equal(['user-file-sub_upload.png']);
      });

      it('routes file attachments to the db-doc instance inside each repeat', async () => {
        form.validate.resolves(true);
        form.getDataStr.returns(loadXML('db-doc-in-repeat-with-files'));
        getCurrentFiles.returns([
          { name: 'repeat_upload_1.png', type: 'image/png' },
          { name: 'repeat_upload_2.png', type: 'image/png' },
        ]);

        const [report, repeatDoc1, repeatDoc2, ...additional] = await saveReport(
          { contact: { _id: 'my-user', phone: '8989' } },
          {
            xml: '<data><repeat nodeset="/my-form/repeat_section"></repeat></data>',
            doc: { internalId: 'my-form' },
          }
        );

        expect(additional).to.be.empty;
        // Neither upload is referenced outside of a db-doc, so the main report gets no attachments
        expect(report._attachments).to.be.undefined;
        expect(Object.keys(repeatDoc1._attachments)).to.deep.equal(['user-file-repeat_upload_1.png']);
        expect(Object.keys(repeatDoc2._attachments)).to.deep.equal(['user-file-repeat_upload_2.png']);
      });

      it('drops a file attachment when the db-doc field referencing it has been cleared', async () => {
        form.validate.resolves(true);
        form.getDataStr.returns(loadXML('db-doc-with-file-field-cleared'));
        getCurrentFiles.returns([{ name: 'main_upload.png', type: 'image/png' }]);

        const [report, doc1, ...additional] = await saveReport(
          {
            contact: { _id: 'my-user', phone: '8989' },
            _attachments: { 'user-file-sub_upload.png': { content_type: 'image/png', data: 'old' } },
          },
          { doc: { internalId: 'my-form' } }
        );

        expect(additional).to.be.empty;
        expect(Object.keys(report._attachments)).to.deep.equal(['user-file-main_upload.png']);
        expect(doc1._attachments).to.be.undefined;
      });

      it('does not attach an upload to the main report when only a db-doc field references it', async () => {
        form.validate.resolves(true);
        form.getDataStr.returns(loadXML('db-doc-orphan-file'));
        getCurrentFiles.returns([{ name: 'known_upload.png', type: 'image/png' }]);

        const [report, doc1, ...additional] = await saveReport(
          { contact: { _id: 'my-user', phone: '8989' } },
          { doc: { internalId: 'my-form' } }
        );

        expect(additional).to.be.empty;
        expect(report._attachments).to.be.undefined;
        expect(Object.keys(doc1._attachments)).to.deep.equal(['user-file-known_upload.png']);
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
              'user-file/existing_binary': { content_type: 'image/png', data: 'd' },
              'user-file-referenced.png': { content_type: 'image/png', data: 'a' },
              'user-file-orphan.png': { content_type: 'image/png', data: 'b' },
            },
          },
          { doc: { internalId: 'my-form' } }
        );

        // Custom (non user-file) attachments are kept
        expect(report._attachments['some-custom-attachment']).to.deep.equal({ content_type: 'text/plain', data: 'c' });
        // Binary attachments are kept even when the form has no binary field for them
        expect(report._attachments['user-file/existing_binary'])
          .to.deep.equal({ content_type: 'image/png', data: 'd' });
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
        _attachments: undefined,
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
        _attachments: undefined,
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
        _attachments: undefined,
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
        name: 'New Parent',
        type: 'district_hospital',
        form_version: '1',
        parent: undefined,
        contact: undefined,
        _attachments: undefined,
      });
      expect(contact).excluding(['reported_date', '_id']).to.deep.equal({
        name: 'New Contact',
        type: 'person',
        form_version: '1',
        parent: { _id: docId, parent: { _id: parent._id } },
        contact: undefined,
        _attachments: undefined,
      });
      expect(childA).excluding(['reported_date', '_id']).to.deep.equal({
        name: 'Child A',
        type: 'person',
        form_version: '1',
        parent: { _id: clinic._id, parent: { _id: parent._id } },
        contact: undefined,
        _attachments: undefined,
      });
      expect(childB).excluding(['reported_date', '_id']).to.deep.equal({
        name: 'Child B',
        type: 'person',
        form_version: '1',
        parent: { _id: clinic._id, parent: { _id: parent._id } },
        contact: undefined,
        _attachments: undefined,
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

      it('builds file attachments from the current files referenced by a field', async () => {
        form.getDataStr.returns(`
          <data>
            <clinic>
              <name>Clinic</name>
              <my_image type="file">my_image.png</my_image>
            </clinic>
          </data>`);
        getCurrentFiles.returns([
          { name: 'my_image.png', type: 'image' },
          { name: 'not_referenced.pdf', type: 'file' },
        ]);

        const { preparedDocs: [clinic] } = await saveContact({ type: 'clinic' });

        expect(Object.keys(clinic._attachments)).to.deep.equal(['user-file-my_image.png']);
        const imageAttachment = clinic._attachments['user-file-my_image.png'];
        expect(imageAttachment.content_type).to.equal('image');
        expect(imageAttachment.data).to.be.an.instanceof(Blob);
      });

      it('builds binary attachments named relative to the contact type group', async () => {
        form.getDataStr.returns(
          '<data><clinic><name>Clinic</name><my_file type="binary">some image data</my_file></clinic></data>'
        );

        const { preparedDocs: [clinic] } = await saveContact({ type: 'clinic' });

        expect(clinic.my_file).to.equal('');
        expect(clinic._attachments['user-file/my_file']).to.deep.equal({
          data: 'some image data',
          content_type: 'image/png',
        });
      });

      it('keeps a binary attachment saved by the create form when the edit form omits the field', async () => {
        // Contacts are created and edited by two different forms, and the edit form need not contain every
        // field the create form has. Binary data is never loaded back into a form, so the stored attachment
        // is all there is - it must survive the edit either way.
        const existing = { content_type: 'image/png', data: 'saved by the create form' };
        const editForm = { internalId: 'contact:clinic:edit', xmlVersion: '1' };

        form.getDataStr.returns('<data><clinic><name>Clinic</name></clinic></data>');
        const { preparedDocs: [withoutField] } = await saveContact(
          { type: 'clinic', _attachments: { 'user-file/my_file': existing } },
          editForm
        );
        expect(withoutField._attachments).to.deep.equal({ 'user-file/my_file': existing });

        form.getDataStr.returns(
          '<data><clinic><name>Clinic</name><my_file type="binary"></my_file></clinic></data>'
        );
        const { preparedDocs: [withField] } = await saveContact(
          { type: 'clinic', _attachments: { 'user-file/my_file': existing } },
          editForm
        );
        expect(withField._attachments).to.deep.equal({ 'user-file/my_file': existing });
      });

      it('keeps a file attachment whose field is absent from the edit form', async () => {
        // A contact type's edit form may hold only a subset of its create form's fields. The photo value
        // carries over from the existing doc, so its upload must not be treated as orphaned.
        form.getDataStr.returns('<data><clinic><name>Clinic</name></clinic></data>');
        const photo = { content_type: 'image/png', data: 'blob' };

        const { preparedDocs: [clinic] } = await saveContact(
          { type: 'clinic', photo: 'p.png', _attachments: { 'user-file-p.png': photo } },
          { internalId: 'contact:clinic:edit', xmlVersion: '1' }
        );

        expect(clinic.photo).to.equal('p.png');
        expect(clinic._attachments).to.deep.equal({ 'user-file-p.png': photo });
      });

      it('routes attachments to the sibling and child docs that own the field', async () => {
        form.getDataStr.returns(`
          <data>
            <clinic>
              <name>Clinic</name>
              <parent>NEW</parent>
              <contact>NEW</contact>
              <clinic_photo type="binary">clinic image data</clinic_photo>
              <clinic_file type="file">clinic_file.png</clinic_file>
            </clinic>
            <parent>
              <name>New Parent</name>
              <parent_photo type="binary">parent image data</parent_photo>
              <parent_file type="file">parent_upload.png</parent_file>
            </parent>
            <contact>
              <name>New Contact</name>
              <contact_photo type="binary">contact image data</contact_photo>
              <contact_file type="file">contact_upload.png</contact_file>
            </contact>
            <repeat>
              <child>
                <name>Child One</name>
                <type>person</type>
                <child_photo type="binary">child1 image data</child_photo>
                <child_file type="file">child1_upload.png</child_file>
              </child>
            </repeat>
            <repeat>
              <child>
                <name>Child Two</name>
                <type>person</type>
                <child_photo type="binary">child2 image data</child_photo>
                <child_file type="file">child2_upload.png</child_file>
              </child>
            </repeat>
          </data>`);
        getCurrentFiles.returns([
          { name: 'parent_upload.png', type: 'image/png' },
          { name: 'contact_upload.png', type: 'image/png' },
          { name: 'clinic_file.png', type: 'image/png' },
          { name: 'child1_upload.png', type: 'image/png' },
          { name: 'child2_upload.png', type: 'image/png' },
        ]);

        const {
          preparedDocs: [clinic, parent, contact, child1, child2, ...additional]
        } = await saveContact({ type: 'clinic' });

        expect(additional).to.be.empty;
        expect(clinic).to.deep.include({
          name: 'Clinic',
          clinic_photo: '',
          clinic_file: 'clinic_file.png'
        });
        expect(Object.keys(clinic._attachments)).to.deep.equal(['user-file-clinic_file.png', 'user-file/clinic_photo']);
        expect(clinic._attachments['user-file-clinic_file.png'].data).to.be.an.instanceof(Blob);
        expect(clinic._attachments['user-file/clinic_photo'].data).to.equal('clinic image data');
        expect(parent).to.deep.include({
          name: 'New Parent',
          parent_photo: '',
          parent_file: 'parent_upload.png'
        });
        expect(Object.keys(parent._attachments)).to.deep.equal(
          ['user-file-parent_upload.png', 'user-file/parent_photo']
        );
        expect(parent._attachments['user-file/parent_photo'].data).to.deep.equal('parent image data');
        expect(parent._attachments['user-file-parent_upload.png'].data).to.be.an.instanceof(Blob);
        expect(contact).to.deep.include({
          name: 'New Contact',
          contact_photo: '',
          contact_file: 'contact_upload.png'
        });
        expect(Object.keys(contact._attachments)).to.deep.equal(
          ['user-file-contact_upload.png', 'user-file/contact_photo']
        );
        expect(contact._attachments['user-file/contact_photo'].data).to.deep.equal('contact image data');
        expect(contact._attachments['user-file-contact_upload.png'].data).to.be.an.instanceof(Blob);
        expect(child1).to.deep.include({
          name: 'Child One',
          child_photo: '',
          child_file: 'child1_upload.png'
        });
        expect(Object.keys(child1._attachments)).to.deep.equal(
          ['user-file-child1_upload.png', 'user-file/child_photo']
        );
        expect(child1._attachments['user-file/child_photo'].data).to.deep.equal('child1 image data');
        expect(child1._attachments['user-file-child1_upload.png'].data).to.be.an.instanceof(Blob);
        expect(child2).to.deep.include({
          name: 'Child Two',
          child_photo: '',
          child_file: 'child2_upload.png'
        });
        expect(Object.keys(child2._attachments)).to.deep.equal(
          ['user-file-child2_upload.png', 'user-file/child_photo']
        );
        expect(child2._attachments['user-file/child_photo'].data).to.deep.equal('child2 image data');
        expect(child2._attachments['user-file-child2_upload.png'].data).to.be.an.instanceof(Blob);
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
