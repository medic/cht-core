import { fakeAsync, flush, TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { provideMockStore } from '@ngrx/store/testing';
import * as _ from 'lodash-es';
import { HttpClient } from '@angular/common/http';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';

import { DbService } from '@mm-services/db.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { EnketoPrepopulationDataService } from '@mm-services/enketo-prepopulation-data.service';
import { AttachmentService } from '@mm-services/attachment.service';
import { TranslateService } from '@mm-services/translate.service';
import { EnketoService } from '@mm-services/enketo.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import * as FileManager from '../../../../src/js/enketo/file-manager.js';
import { WebappEnketoFormContext } from '@mm-services/form.service';
import { Qualifier, Report } from '@medic/cht-datasource';
import { DOC_TYPES } from '@medic/constants';
import events from 'enketo-core/src/js/event';

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

  let service;

  let enketoInit;
  let dbGetAttachment;
  let dbAllDocs;
  let getReport;
  let createObjectURL;
  let TranslateFrom;
  let form;
  let AddAttachment;
  let removeAttachment;
  let EnketoForm;
  let EnketoPrepopulationData;
  let translateService;
  let extractLineageService;
  let chtDatasourceService;

  beforeEach(() => {
    enketoInit = sinon.stub();
    dbGetAttachment = sinon.stub();
    dbAllDocs = sinon.stub().resolves({ rows: [] });
    getReport = sinon.stub();
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
    AddAttachment = sinon.stub();
    removeAttachment = sinon.stub();
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
    chtDatasourceService = {
      bind: sinon.stub().withArgs(Report.v1.get).returns(getReport)
    };

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        {
          provide: DbService,
          useValue: {
            get: () => ({ getAttachment: dbGetAttachment, allDocs: dbAllDocs })
          }
        },
        { provide: TranslateFromService, useValue: { get: TranslateFrom } },
        { provide: EnketoPrepopulationDataService, useValue: { get: EnketoPrepopulationData } },
        { provide: AttachmentService, useValue: { add: AddAttachment, remove: removeAttachment } },
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
        formDoc: mockEnketoDoc('myform')
      };
      const doc = {
        html: $('<div>my form</div>'),
        model: VISIT_MODEL,
      };
      const userSettings = { language: 'en' };

      try {
        await service.renderForm(formContext, doc, userSettings);
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
        formDoc: mockEnketoDoc('myform')
      };
      const doc = {
        html: $('<div>my form</div>'),
        model: VISIT_MODEL,
      };
      const userSettings = { language: 'en' };
      return service.renderForm(formContext, doc, userSettings).then(() => {
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
        formDoc: mockEnketoDoc('myform')
      };
      const doc = {
        html: $('<div><img data-media-src="myimg"></div>'),
        model: VISIT_MODEL,
      };
      const userSettings = { language: 'en' };
      await service.renderForm(formContext, doc, userSettings);
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
        formDoc: mockEnketoDoc('myform')
      };
      const doc = {
        html: $('<div><img data-media-src="myimg"></div>'),
        model: VISIT_MODEL,
      };
      const userSettings = { language: 'en' };
      return service.renderForm(formContext, doc, userSettings).then(() => {
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
        formDoc: mockEnketoDoc('myform'),
        instanceData: data
      };
      const doc = {
        html: $('<div>my form</div>'),
        model: 'my model',
      };
      const userSettings = { name: 'Jim', language: 'sw' };
      return service.renderForm(formContext, doc, userSettings).then(() => {
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
        formDoc: mockEnketoDoc('myform'),
        instanceData: data
      };
      const doc = {
        html: $('<div>my form</div>'),
        model: 'my model',
      };
      const userSettings = { language: 'en' };
      return service.renderForm(formContext, doc, userSettings).then(() => {
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
        formDoc: mockEnketoDoc('myform'),
        instanceData
      };
      const doc = {
        html: $('<div>my form</div>'),
        model: VISIT_MODEL,
      };
      const userSettings = { language: 'en' };
      return service.renderForm(formContext, doc, userSettings).then(() => {
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
      const formContext = new WebappEnketoFormContext('#div', 'report', mockEnketoDoc('myform'), instanceData);
      formContext.contactSummary = { id: 'contact-summary', context: { pregnant: true } };
      const doc = {
        html: $('<div>my form</div>'),
        model: VISIT_MODEL_WITH_CONTACT_SUMMARY,
      };
      const userSettings = { language: 'en' };
      return service.renderForm(formContext, doc, userSettings).then(() => {
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
      const formContext = new WebappEnketoFormContext('#div', 'report', mockEnketoDoc('myform'), instanceData);
      formContext.userContactSummary =  { id: 'user-contact-summary', context: { chw: true } };
      const doc = {
        html: $('<div>my form</div>'),
        model: VISIT_MODEL_WITH_CONTACT_SUMMARY,
      };
      const userSettings = { language: 'en' };
      return service.renderForm(formContext, doc, userSettings).then(() => {
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
      const formContext = new WebappEnketoFormContext('#div', 'report', mockEnketoDoc('myform'), instanceData);
      formContext.contactSummary =  { id: 'contact-summary', context: { pregnant: true } };
      formContext.userContactSummary =  { id: 'user-contact-summary', context: { chw: true } };
      const doc = {
        html: $('<div>my form</div>'),
        model: VISIT_MODEL_WITH_CONTACT_SUMMARY,
      };
      const userSettings = { language: 'en' };
      return service.renderForm(formContext, doc, userSettings).then(() => {
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
          formDoc,
          instanceData,
          editedListener: callbackMock,
          valuechangeListener: callbackMock,
          titleKey: 'contact.type.health_center.new',
        };
        const doc = {
          html: $('<div>my form</div>'),
          model: VISIT_MODEL,
          title: 'New Area',
        };
        const userSettings = { language: 'en' };
        await service.renderForm(formContext, doc, userSettings);

        expect(service.setFormTitle.callCount).to.be.equal(1);
        expect(service.setFormTitle.args[0][1])
          .to.be.equal('translated key contact.type.health_center.new');
      });

      it('should fallback to translate document title when the titleKey is not available', async () => {
        const formContext = {
          selector: $('<div></div>'),
          formDoc,
          instanceData,
          editedListener: callbackMock,
          valuechangeListener: callbackMock,
        };
        const doc = {
          html: $('<div>my form</div>'),
          model: VISIT_MODEL,
          title: 'New Area',
        };
        const userSettings = { language: 'en' };
        await service.renderForm(formContext, doc, userSettings);

        expect(service.setFormTitle.callCount).to.be.equal(1);
        expect(service.setFormTitle.args[0][1]).to.be.equal('translated sentence New Area');
      });
    });
  });

  describe('completeNewReport', () => {
    beforeEach(() => {
      service = TestBed.inject(EnketoService);
    });

    it('rejects on invalid form', () => {
      const inputRelevant = { dataset: { relevant: 'true' } };
      const inputNonRelevant = { dataset: { relevant: 'false' } };
      const inputNoDataset = {};
      const toArray = sinon.stub().returns([inputRelevant, inputNoDataset, inputNonRelevant]);
      // @ts-ignore
      sinon.stub($.fn, 'find').returns({ toArray });
      form.validate.resolves(false);
      form.relevant = { update: sinon.stub() };
      const dispatchEventStub = sinon.stub(form.view.html, 'dispatchEvent');
      return service
        .completeNewReport('V', form, {}, { _id: '123', phone: '555' })
        .then(() => expect.fail('expected to reject'))
        .catch(actual => {
          expect(actual.message).to.equal('Form is invalid');
          expect(form.validate.callCount).to.equal(1);
          expect(inputRelevant.dataset.relevant).to.equal('true');
          expect(inputNonRelevant.dataset.relevant).to.equal('false');
          // @ts-ignore
          expect(inputNoDataset.dataset).to.be.undefined;
          expect(dispatchEventStub).to.not.have.been.called;
        });
    });

    it('creates report', () => {
      form.validate.resolves(true);
      const content = loadXML('sally-lmp');
      form.getDataStr.returns(content);
      const dispatchEventStub = sinon.stub(form.view.html, 'dispatchEvent');
      return service
        .completeNewReport('V', form, { doc: { } }, { _id: '123', phone: '555' })
        .then(actual => {
          actual = actual[0];
          expect(form.validate.callCount).to.equal(1);
          expect(form.getDataStr.callCount).to.equal(1);
          expect(actual._id).to.match(/(\w+-)\w+/);
          expect(actual._id.startsWith('training:user-jim:')).to.be.false;
          expect(actual.fields.name).to.equal('Sally');
          expect(actual.fields.lmp).to.equal('10');
          expect(actual.form).to.equal('V');
          expect(actual.type).to.equal('data_record');
          expect(actual.content_type).to.equal('xml');
          expect(actual.contact._id).to.equal('123');
          expect(actual.from).to.equal('555');
          expect(AddAttachment.callCount).to.equal(0);
          expect(removeAttachment.callCount).to.equal(1);
          expect(removeAttachment.args[0]).excludingEvery('_rev').to.deep.equal([actual, 'content']);
          expect(dispatchEventStub).to.have.been.calledOnceWithExactly(events.BeforeSave());
        });
    });

    it('saves form version if found', () => {
      const formDoc = {
        doc: { _id: 'abc', xmlVersion: { time: '1', sha256: 'imahash' } },
        xml: '<form/>'
      };
      form.validate.resolves(true);
      const content = loadXML('sally-lmp');
      form.getDataStr.returns(content);
      return service
        .completeNewReport('V', form, formDoc, { _id: '123', phone: '555' })
        .then(actual => {
          actual = actual[0];
          expect(actual.form_version).to.deep.equal({ time: '1', sha256: 'imahash' });
        });
    });

    it('creates report with hidden fields', () => {
      form.validate.resolves(true);
      const content = loadXML('hidden-field');
      form.getDataStr.returns(content);
      return service
        .completeNewReport('V', form, { doc: { } }, { _id: '123', phone: '555' })
        .then(actual => {
          actual = actual[0];
          expect(form.validate.callCount).to.equal(1);
          expect(form.getDataStr.callCount).to.equal(1);
          expect(actual._id).to.match(/(\w+-)\w+/);
          expect(actual.fields.name).to.equal('Sally');
          expect(actual.fields.lmp).to.equal('10');
          expect(actual.fields.secret_code_name).to.equal('S4L');
          expect(actual.form).to.equal('V');
          expect(actual.type).to.equal('data_record');
          expect(actual.content_type).to.equal('xml');
          expect(actual.contact._id).to.equal('123');
          expect(actual.from).to.equal('555');
          expect(actual.hidden_fields).to.deep.equal(['secret_code_name']);
        });
    });

    it('creates extra docs', () => {
      const startTime = Date.now() - 1;

      form.validate.resolves(true);
      const content = loadXML('extra-docs');
      form.getDataStr.returns(content);

      return service
        .completeNewReport('V', form, { doc: { } }, { _id: '123', phone: '555' })
        .then(actual => {
          const endTime = Date.now() + 1;

          expect(form.validate.callCount).to.equal(1);
          expect(form.getDataStr.callCount).to.equal(1);

          expect(actual.length).to.equal(3);

          const actualReport = actual[0];
          expect(actualReport._id).to.match(/(\w+-)\w+/);
          expect(actualReport.fields.name).to.equal('Sally');
          expect(actualReport.fields.lmp).to.equal('10');
          expect(actualReport.fields.secret_code_name).to.equal('S4L');
          expect(actualReport.form).to.equal('V');
          expect(actualReport.type).to.equal('data_record');
          expect(actualReport.content_type).to.equal('xml');
          expect(actualReport.contact._id).to.equal('123');
          expect(actualReport.from).to.equal('555');
          expect(actualReport.hidden_fields).to.have.members(['secret_code_name', 'doc1', 'doc2']);

          expect(actualReport.fields.doc1).to.deep.equal({
            _id: actual[1]._id,
            some_property_1: 'some_value_1',
            type: 'thing_1',
          });
          expect(actualReport.fields.doc2).to.deep.equal({
            _id: actual[2]._id,
            some_property_2: 'some_value_2',
            type: 'thing_2',
          });

          const actualThing1 = actual[1];
          expect(actualThing1._id).to.match(/(\w+-)\w+/);
          expect(actualThing1.reported_date).to.be.within(startTime, endTime);
          expect(actualThing1.some_property_1).to.equal('some_value_1');

          const actualThing2 = actual[2];
          expect(actualThing2._id).to.match(/(\w+-)\w+/);
          expect(actualThing2.reported_date).to.be.within(startTime, endTime);
          expect(actualThing2.some_property_2).to.equal('some_value_2');

          expect(_.uniq(_.map(actual, '_id')).length).to.equal(3);
        });
    });

    it('creates extra docs with references', () => {
      form.validate.resolves(true);
      const content = loadXML('extra-docs-with-references');
      form.getDataStr.returns(content);

      return service
        .completeNewReport('V', form, { doc: { } }, { _id: '123', phone: '555' })
        .then(actual => {
          expect(form.validate.callCount).to.equal(1);
          expect(form.getDataStr.callCount).to.equal(1);

          expect(actual.length).to.equal(3);
          const reportId = actual[0]._id;
          const doc1_id = actual[1]._id;
          const doc2_id = actual[2]._id;

          const actualReport = actual[0];

          expect(actualReport._id).to.match(/(\w+-)\w+/);
          expect(actualReport.fields.name).to.equal('Sally');
          expect(actualReport.fields.lmp).to.equal('10');
          expect(actualReport.fields.secret_code_name).to.equal('S4L');
          expect(actualReport.fields.my_self_0).to.equal(reportId);
          expect(actualReport.fields.my_child_01).to.equal(doc1_id);
          expect(actualReport.fields.my_child_02).to.equal(doc2_id);
          expect(actualReport.form).to.equal('V');
          expect(actualReport.type).to.equal('data_record');
          expect(actualReport.content_type).to.equal('xml');
          expect(actualReport.contact._id).to.equal('123');
          expect(actualReport.from).to.equal('555');
          expect(actualReport.hidden_fields).to.have.members(['secret_code_name', 'doc1', 'doc2']);

          expect(actualReport.fields.doc1).to.deep.equal({
            _id: doc1_id,
            type: 'thing_1',
            some_property_1: 'some_value_1',
            my_self_1: doc1_id,
            my_parent_1: reportId,
            my_sibling_1: doc2_id
          });
          expect(actualReport.fields.doc2).to.deep.equal({
            _id: doc2_id,
            type: 'thing_2',
            some_property_2: 'some_value_2',
            my_self_2: doc2_id,
            my_parent_2: reportId,
            my_sibling_2: doc1_id
          });

          const actualThing1 = actual[1];
          expect(actualThing1._id).to.match(/(\w+-)\w+/);
          expect(actualThing1.some_property_1).to.equal('some_value_1');
          expect(actualThing1.my_self_1).to.equal(doc1_id);
          expect(actualThing1.my_parent_1).to.equal(reportId);
          expect(actualThing1.my_sibling_1).to.equal(doc2_id);

          const actualThing2 = actual[2];
          expect(actualThing2._id).to.match(/(\w+-)\w+/);
          expect(actualThing2.some_property_2).to.equal('some_value_2');
          expect(actualThing2.my_self_2).to.equal(doc2_id);
          expect(actualThing2.my_parent_2).to.equal(reportId);
          expect(actualThing2.my_sibling_2).to.equal(doc1_id);

          expect(_.uniq(_.map(actual, '_id')).length).to.equal(3);
        });
    });

    it('creates extra docs with repeats', () => {
      form.validate.resolves(true);
      const content = loadXML('extra-docs-with-repeat');
      form.getDataStr.returns(content);

      return service
        .completeNewReport('V', form, { doc: { } }, { _id: '123', phone: '555' })
        .then(actual => {
          expect(form.validate.callCount).to.equal(1);
          expect(form.getDataStr.callCount).to.equal(1);

          expect(actual.length).to.equal(4);
          const reportId = actual[0]._id;

          const actualReport = actual[0];

          expect(actualReport._id).to.match(/(\w+-)\w+/);
          expect(actualReport.fields.name).to.equal('Sally');
          expect(actualReport.fields.lmp).to.equal('10');
          expect(actualReport.fields.secret_code_name).to.equal('S4L');
          expect(actualReport.form).to.equal('V');
          expect(actualReport.type).to.equal('data_record');
          expect(actualReport.content_type).to.equal('xml');
          expect(actualReport.contact._id).to.equal('123');
          expect(actualReport.from).to.equal('555');
          expect(actualReport.hidden_fields).to.have.members(['secret_code_name', 'repeat_doc']);

          for (let i = 1; i <= 3; ++i) {
            const repeatDocN = actual[i];
            expect(repeatDocN._id).to.match(/(\w+-)\w+/);
            expect(repeatDocN.my_parent).to.equal(reportId);
            expect(repeatDocN.some_property).to.equal('some_value_' + i);
          }

          expect(_.uniq(_.map(actual, '_id')).length).to.equal(4);
        });
    });

    it('db-doc-ref with repeats', () => {
      form.validate.resolves(true);
      const content = loadXML('db-doc-ref-in-repeat');
      form.getDataStr.returns(content);
      const formDoc = {
        xml: `
          <data>
            <repeat nodeset="/data/repeat_section"></repeat>
          </data>
        `,
        doc: { _id: 'abc' }
      };

      return service
        .completeNewReport('V', form, formDoc, { _id: '123', phone: '555' })
        .then(actual => {
          expect(form.validate.callCount).to.equal(1);
          expect(form.getDataStr.callCount).to.equal(1);

          expect(actual.length).to.equal(4);
          const doc = actual[0];

          expect(doc).to.deep.nested.include({
            form: 'V',
            'fields.name': 'Sally',
            'fields.lmp': '10',
            'fields.secret_code_name': 'S4L',
            'fields.repeat_section[0].extra': 'data1',
            'fields.repeat_section[0].repeat_doc_ref': actual[1]._id,
            'fields.repeat_section[1].extra': 'data2',
            'fields.repeat_section[1].repeat_doc_ref': actual[2]._id,
            'fields.repeat_section[2].extra': 'data3',
            'fields.repeat_section[2].repeat_doc_ref': actual[3]._id,
          });
        });
    });

    it('db-doc-ref with deep repeats', () => {
      form.validate.resolves(true);
      const content = loadXML('db-doc-ref-in-deep-repeat');
      form.getDataStr.returns(content);

      const formDoc = {
        xml: `
          <data>
            <repeat nodeset="/data/repeat_section"></repeat>
          </data>
        `,
        doc: { _id: 'abc' }
      };

      return service
        .completeNewReport('V', form, formDoc, { _id: '123', phone: '555' })
        .then(actual => {
          expect(form.validate.callCount).to.equal(1);
          expect(form.getDataStr.callCount).to.equal(1);

          expect(actual.length).to.equal(4);
          const doc = actual[0];

          expect(doc).to.deep.nested.include({
            form: 'V',
            'fields.name': 'Sally',
            'fields.lmp': '10',
            'fields.secret_code_name': 'S4L',
            'fields.repeat_section[0].extra': 'data1',
            'fields.repeat_section[0].some.deep.structure.repeat_doc_ref': actual[1]._id,
            'fields.repeat_section[1].extra': 'data2',
            'fields.repeat_section[1].some.deep.structure.repeat_doc_ref': actual[2]._id,
            'fields.repeat_section[2].extra': 'data3',
            'fields.repeat_section[2].some.deep.structure.repeat_doc_ref': actual[3]._id,
          });
        });
    });

    it('db-doc-ref with deep repeats and non-db-doc repeats', () => {
      form.validate.resolves(true);
      const content = loadXML('db-doc-ref-in-deep-repeats-extra-repeats');
      form.getDataStr.returns(content);

      const formDoc = {
        xml: `
          <data>
            <repeat nodeset="/data/repeat_section"></repeat>
          </data>
        `,
        doc: { _id: 'abc' }
      };

      return service
        .completeNewReport('V', form, formDoc, { _id: '123', phone: '555' })
        .then(actual => {
          expect(form.validate.callCount).to.equal(1);
          expect(form.getDataStr.callCount).to.equal(1);

          expect(actual.length).to.equal(4);
          const doc = actual[0];

          expect(doc).to.deep.nested.include({
            form: 'V',
            'fields.name': 'Sally',
            'fields.lmp': '10',
            'fields.secret_code_name': 'S4L',
            'fields.repeat_section[0].extra': 'data1',
            'fields.repeat_section[0].some.deep.structure.repeat_doc_ref': actual[1]._id,
            'fields.repeat_section[1].extra': 'data2',
            'fields.repeat_section[1].some.deep.structure.repeat_doc_ref': actual[2]._id,
            'fields.repeat_section[2].extra': 'data3',
            'fields.repeat_section[2].some.deep.structure.repeat_doc_ref': actual[3]._id,
          });
        });
    });

    it('db-doc-ref with repeats and local references', () => {
      form.validate.resolves(true);
      const content = loadXML('db-doc-ref-in-repeats-with-local-references');
      form.getDataStr.returns(content);
      const formDoc = {
        xml: `
          <data>
            <repeat nodeset="/data/repeat_section"></repeat>
          </data>
        `,
        doc: { _id: 'abc' }
      };

      return service
        .completeNewReport('V', form, formDoc, { _id: '123', phone: '555' })
        .then(actual => {
          expect(form.validate.callCount).to.equal(1);
          expect(form.getDataStr.callCount).to.equal(1);

          expect(actual.length).to.equal(4);
          const doc = actual[0];

          expect(doc).to.deep.nested.include({
            form: 'V',
            'fields.name': 'Sally',
            'fields.lmp': '10',
            'fields.secret_code_name': 'S4L',
            'fields.repeat_section[0].extra': 'data1',
            'fields.repeat_section[0].repeat_doc_ref': actual[1]._id,
            'fields.repeat_section[1].extra': 'data2',
            'fields.repeat_section[1].repeat_doc_ref': actual[2]._id,
            'fields.repeat_section[2].extra': 'data3',
            'fields.repeat_section[2].repeat_doc_ref': actual[3]._id,
          });
        });
    });

    it('db-doc-ref with deep repeats and local references', () => {
      form.validate.resolves(true);
      const content = loadXML('db-doc-ref-in-deep-repeats-with-local-references');
      form.getDataStr.returns(content);
      const formDoc = {
        xml: `
          <data>
            <repeat nodeset="/data/repeat_section"></repeat>
          </data>
        `,
        doc: { _id: 'abc' }
      };

      return service
        .completeNewReport('V', form, formDoc, { _id: '123', phone: '555' })
        .then(actual => {
          expect(form.validate.callCount).to.equal(1);
          expect(form.getDataStr.callCount).to.equal(1);

          expect(actual.length).to.equal(4);
          const doc = actual[0];

          expect(doc).to.deep.nested.include({
            form: 'V',
            'fields.name': 'Sally',
            'fields.lmp': '10',
            'fields.secret_code_name': 'S4L',
            'fields.repeat_section[0].extra': 'data1',
            'fields.repeat_section[0].some.deep.structure.repeat_doc_ref': actual[1]._id,
            'fields.repeat_section[1].extra': 'data2',
            'fields.repeat_section[1].some.deep.structure.repeat_doc_ref': actual[2]._id,
            'fields.repeat_section[2].extra': 'data3',
            'fields.repeat_section[2].some.deep.structure.repeat_doc_ref': actual[3]._id,
          });
        });
    });

    it('db-doc-ref with repeats with refs outside of repeat', () => {
      form.validate.resolves(true);
      const content = loadXML('db-doc-ref-outside-of-repeat');
      form.getDataStr.returns(content);
      const formDoc = {
        xml: `
        <data>
          <repeat nodeset="/data/repeat_section"></repeat>
        </data>
        `,
        doc: { _id: 'abc' }
      };

      return service
        .completeNewReport('V', form, formDoc, { _id: '123', phone: '555' })
        .then(actual => {
          expect(form.validate.callCount).to.equal(1);
          expect(form.getDataStr.callCount).to.equal(1);

          expect(actual.length).to.equal(2);
          const doc = actual[0];

          expect(doc).to.deep.nested.include({
            form: 'V',
            'fields.name': 'Sally',
            'fields.lmp': '10',
            'fields.secret_code_name': 'S4L',
            'fields.repeat_section[0].extra': 'data1',
            'fields.repeat_section[0].repeat_doc_ref': actual[1]._id,
            'fields.repeat_section[1].extra': 'data2',
            'fields.repeat_section[1].repeat_doc_ref': actual[1]._id,
            'fields.repeat_section[2].extra': 'data3',
            'fields.repeat_section[2].repeat_doc_ref': actual[1]._id,
          });
        });
    });

    it('db-doc-ref with repeats with db-doc as repeat', () => {
      form.validate.resolves(true);
      const content = loadXML('db-doc-ref-same-as-repeat');
      form.getDataStr.returns(content);
      const formDoc = {
        xml: `
          <data>
            <repeat nodeset="/data/repeat_section"></repeat>
          </data>
        `,
        doc: { _id: 'abc' }
      };

      return service
        .completeNewReport('V', form, formDoc, { _id: '123', phone: '555' })
        .then(actual => {
          expect(form.validate.callCount).to.equal(1);
          expect(form.getDataStr.callCount).to.equal(1);

          expect(actual.length).to.equal(4);

          expect(actual[0]).to.deep.nested.include({
            form: 'V',
            'fields.name': 'Sally',
            'fields.lmp': '10',
            'fields.repeat_doc_ref': actual[1]._id, // this ref is outside any repeat
          });
          expect(actual[1]).to.deep.include({
            extra: 'data1',
            type: 'repeater',
            some_property: 'some_value_1',
            my_parent: actual[0]._id,
            repeat_doc_ref: actual[1]._id,
          });
          expect(actual[2]).to.deep.include({
            extra: 'data2',
            type: 'repeater',
            some_property: 'some_value_2',
            my_parent: actual[0]._id,
            repeat_doc_ref: actual[2]._id,
          });
          expect(actual[3]).to.deep.nested.include({
            extra: 'data3',
            type: 'repeater',
            some_property: 'some_value_3',
            my_parent: actual[0]._id,
            'child.repeat_doc_ref': actual[3]._id,
          });
        });
    });

    it('db-doc-ref with repeats with invalid ref', () => {
      form.validate.resolves(true);
      const content = loadXML('db-doc-ref-broken-ref');
      form.getDataStr.returns(content);
      const formDoc = {
        xml: `
          <data>
            <repeat nodeset="/data/repeat_section"></repeat>
          </data>
        `,
        doc: { _id: 'abc' }
      };

      return service
        .completeNewReport('V', form, formDoc, { _id: '123', phone: '555' })
        .then(actual => {
          expect(form.validate.callCount).to.equal(1);
          expect(form.getDataStr.callCount).to.equal(1);

          expect(actual.length).to.equal(4);

          expect(actual[0]).to.deep.nested.include({
            form: 'V',
            'fields.name': 'Sally',
            'fields.lmp': '10',
          });
          expect(actual[1]).to.deep.include({
            extra: 'data1',
            type: 'repeater',
            some_property: 'some_value_1',
            my_parent: actual[0]._id,
            repeat_doc_ref: 'value1',
          });
          expect(actual[2]).to.deep.include({
            extra: 'data2',
            type: 'repeater',
            some_property: 'some_value_2',
            my_parent: actual[0]._id,
            repeat_doc_ref: 'value2',
          });
          expect(actual[3]).to.deep.include({
            extra: 'data3',
            type: 'repeater',
            some_property: 'some_value_3',
            my_parent: actual[0]._id,
            repeat_doc_ref: 'value3',
          });
        });
    });
  });

  describe('completeExistingReport', () => {
    beforeEach(() => {
      service = TestBed.inject(EnketoService);
    });

    it('rejects on invalid form', () => {
      const inputRelevant = { dataset: { relevant: 'true' } };
      const inputNonRelevant = { dataset: { relevant: 'false' } };
      const inputNoDataset = {};
      const toArray = sinon.stub().returns([inputRelevant, inputNoDataset, inputNonRelevant]);
      // @ts-ignore
      sinon.stub($.fn, 'find').returns({ toArray });
      form.validate.resolves(false);
      form.relevant = { update: sinon.stub() };
      const dispatchEventStub = sinon.stub(form.view.html, 'dispatchEvent');
      return service
        .completeExistingReport(form, { doc: { } }, 'docId')
        .then(() => expect.fail('expected to reject'))
        .catch(actual => {
          expect(actual.message).to.equal('Form is invalid');
          expect(form.validate.callCount).to.equal(1);
          expect(inputRelevant.dataset.relevant).to.equal('true');
          expect(inputNonRelevant.dataset.relevant).to.equal('false');
          // @ts-ignore
          expect(inputNoDataset.dataset).to.be.undefined;
          expect(dispatchEventStub).to.not.have.been.called;
        });
    });

    it('updates report', () => {
      form.validate.resolves(true);
      const content = loadXML('sally-lmp');
      form.getDataStr.returns(content);
      getReport.resolves({
        _id: '6',
        _rev: '1-abc',
        form: 'V',
        fields: { name: 'Silly' },
        content: '<doc><name>Silly</name></doc>',
        content_type: 'xml',
        type: DOC_TYPES.DATA_RECORD,
        reported_date: 500,
      });
      const dispatchEventStub = sinon.stub(form.view.html, 'dispatchEvent');

      return service
        .completeExistingReport(form, { doc: { } }, '6')
        .then(actual => {
          actual = actual[0];

          expect(form.validate.callCount).to.equal(1);
          expect(form.getDataStr.callCount).to.equal(1);
          expect(chtDatasourceService.bind.calledOnceWithExactly(Report.v1.get)).to.be.true;
          expect(getReport.calledOnceWithExactly(Qualifier.byUuid('6'))).to.be.true;
          expect(actual._id).to.equal('6');
          expect(actual._rev).to.equal('1-abc');
          expect(actual.fields.name).to.equal('Sally');
          expect(actual.fields.lmp).to.equal('10');
          expect(actual.form).to.equal('V');
          expect(actual.type).to.equal('data_record');
          expect(actual.reported_date).to.equal(500);
          expect(actual.content_type).to.equal('xml');
          expect(AddAttachment.callCount).to.equal(0);
          expect(removeAttachment.callCount).to.equal(1);
          expect(removeAttachment.args[0]).excludingEvery('_rev').to.deep.equal([actual, 'content']);
          expect(dispatchEventStub).to.have.been.calledOnceWithExactly(events.BeforeSave());
        });
    });

    it('links and updates non-contact extra docs in place instead of duplicating them', () => {
      form.validate.resolves(true);
      // The live form data has no <_id> node (forms do not declare one), exactly as on a real edit.
      form.getDataStr.returns(`
        <data>
          <name>Sally</name>
          <doc1 db-doc="true">
            <type>thing_1</type>
            <some_property_1>updated_value</some_property_1>
          </doc1>
        </data>
      `);
      getReport.resolves({
        _id: 'report-1',
        _rev: '3-report',
        form: 'V',
        type: DOC_TYPES.DATA_RECORD,
        reported_date: 1000,
        fields: {
          name: 'Sally',
          doc1: { _id: 'child-1', type: 'thing_1', some_property_1: 'original_value' },
        },
      });
      dbAllDocs.resolves({
        rows: [{
          id: 'child-1',
          doc: {
            _id: 'child-1',
            _rev: '5-child',
            type: 'thing_1',
            some_property_1: 'original_value',
            reported_date: 500,
            patient_id: 'kept-by-transition',
          },
        }],
      });

      return service
        .completeExistingReport(form, { doc: {} }, 'report-1')
        .then(actual => {
          // main report + the single child - the child is NOT duplicated
          expect(actual.length).to.equal(2);
          const report = actual[0];
          const child = actual[1];

          expect(report._id).to.equal('report-1');
          expect(child._id).to.equal('child-1');               // reused, not a new uuid
          expect(child._rev).to.equal('5-child');              // existing rev for in-place update
          expect(child.reported_date).to.equal(500);           // original date preserved
          expect(child.some_property_1).to.equal('updated_value'); // form field updated
          expect(child.patient_id).to.equal('kept-by-transition'); // foreign field preserved
          // the child id is round-tripped back into fields for the next edit
          expect(report.fields.doc1._id).to.equal('child-1');
          expect(dbAllDocs.calledOnce).to.be.true;
          expect(dbAllDocs.args[0][0]).to.deep.equal({ keys: ['child-1'], include_docs: true });
        });
    });

    it('leaves contact extra docs untouched on edit but keeps references resolving', () => {
      form.validate.resolves(true);
      form.getDataStr.returns(`
        <data>
          <name>Sally</name>
          <patient db-doc="true">
            <type>person</type>
            <name>Updated Baby</name>
          </patient>
          <patient_ref db-doc-ref="/data/patient"/>
        </data>
      `);
      getReport.resolves({
        _id: 'report-2',
        _rev: '2-report',
        form: 'V',
        type: DOC_TYPES.DATA_RECORD,
        reported_date: 1000,
        fields: {
          name: 'Sally',
          patient: { _id: 'patient-1', type: 'person', name: 'Baby' },
          patient_ref: 'patient-1',
        },
      });

      return service
        .completeExistingReport(form, { doc: {} }, 'report-2')
        .then(actual => {
          // only the main report is saved; the contact is not re-saved
          expect(actual.length).to.equal(1);
          const report = actual[0];

          expect(report._id).to.equal('report-2');
          expect(report.fields.patient._id).to.equal('patient-1'); // id preserved
          expect(report.fields.patient_ref).to.equal('patient-1'); // reference still resolves
          expect(dbAllDocs.called).to.be.false; // readonly never fetches for update
        });
    });

    it('honours db-doc-edit="link" to update a contact the report owns', () => {
      form.validate.resolves(true);
      form.getDataStr.returns(`
        <data>
          <name>Sally</name>
          <patient db-doc="true" db-doc-edit="link">
            <type>person</type>
            <name>Updated Baby</name>
          </patient>
        </data>
      `);
      getReport.resolves({
        _id: 'report-2b',
        _rev: '2-report',
        form: 'V',
        type: DOC_TYPES.DATA_RECORD,
        reported_date: 1000,
        fields: {
          name: 'Sally',
          patient: { _id: 'patient-2', type: 'person', name: 'Baby' },
        },
      });
      dbAllDocs.resolves({
        rows: [{
          id: 'patient-2',
          doc: { _id: 'patient-2', _rev: '7-child', type: 'person', name: 'Baby', reported_date: 400 },
        }],
      });

      return service
        .completeExistingReport(form, { doc: {} }, 'report-2b')
        .then(actual => {
          expect(actual.length).to.equal(2);
          const child = actual[1];
          expect(child._id).to.equal('patient-2');
          expect(child._rev).to.equal('7-child');
          expect(child.name).to.equal('Updated Baby'); // contact updated because author opted in
          expect(child.reported_date).to.equal(400);
        });
    });

    it('recreates extra docs on every edit when db-doc-edit="recreate"', () => {
      form.validate.resolves(true);
      form.getDataStr.returns(`
        <data>
          <name>Sally</name>
          <doc1 db-doc="true" db-doc-edit="recreate">
            <type>thing_1</type>
            <some_property_1>some_value_1</some_property_1>
          </doc1>
        </data>
      `);
      getReport.resolves({
        _id: 'report-3',
        _rev: '1-report',
        form: 'V',
        type: DOC_TYPES.DATA_RECORD,
        reported_date: 1000,
        fields: {
          name: 'Sally',
          doc1: { _id: 'child-old', type: 'thing_1', some_property_1: 'some_value_1' },
        },
      });

      return service
        .completeExistingReport(form, { doc: {} }, 'report-3')
        .then(actual => {
          expect(actual.length).to.equal(2);
          const child = actual[1];
          expect(child._id).to.not.equal('child-old'); // brand new id (legacy behaviour)
          expect(child._id).to.match(/(\w+-)\w+/);
          expect(child._rev).to.be.undefined;           // created, not updated
          // recreate never persists the id, so it keeps re-creating
          expect(actual[0].fields.doc1._id).to.be.undefined;
          expect(dbAllDocs.called).to.be.false;
        });
    });

    it('re-creates a linked extra doc, reusing its id, when the original is missing', () => {
      form.validate.resolves(true);
      form.getDataStr.returns(`
        <data>
          <name>Sally</name>
          <doc1 db-doc="true">
            <type>thing_1</type>
            <some_property_1>some_value_1</some_property_1>
          </doc1>
        </data>
      `);
      getReport.resolves({
        _id: 'report-4',
        _rev: '1-report',
        form: 'V',
        type: DOC_TYPES.DATA_RECORD,
        reported_date: 1000,
        fields: {
          name: 'Sally',
          doc1: { _id: 'child-gone', type: 'thing_1', some_property_1: 'some_value_1' },
        },
      });
      dbAllDocs.resolves({ rows: [{ key: 'child-gone', error: 'not_found' }] });

      return service
        .completeExistingReport(form, { doc: {} }, 'report-4')
        .then(actual => {
          expect(actual.length).to.equal(2);
          const child = actual[1];
          expect(child._id).to.equal('child-gone'); // reuses the recovered id, no duplicate
          expect(child._rev).to.be.undefined;       // created fresh, no conflict
          expect(actual[0].fields.doc1._id).to.equal('child-gone');
        });
    });

    it('preserves an independent edit, applying only the field the parent changed', () => {
      form.validate.resolves(true);
      // Parent edits some_property_1; leaves some_property_2 as it was in the last report snapshot.
      form.getDataStr.returns(`
        <data>
          <name>Sally</name>
          <doc1 db-doc="true">
            <type>thing_1</type>
            <some_property_1>parent_new</some_property_1>
            <some_property_2>snapshot_val</some_property_2>
          </doc1>
        </data>
      `);
      getReport.resolves({
        _id: 'report-5',
        _rev: '3-report',
        form: 'V',
        type: DOC_TYPES.DATA_RECORD,
        reported_date: 1000,
        fields: {
          name: 'Sally',
          doc1: { _id: 'child-1', type: 'thing_1', some_property_1: 'snap1', some_property_2: 'snapshot_val' },
        },
      });
      // The live doc diverged on some_property_2 since the report was last saved (changed elsewhere).
      dbAllDocs.resolves({
        rows: [{
          id: 'child-1',
          doc: {
            _id: 'child-1',
            _rev: '9-child',
            type: 'thing_1',
            some_property_1: 'snap1',
            some_property_2: 'changed_elsewhere',
            reported_date: 500,
          },
        }],
      });

      return service
        .completeExistingReport(form, { doc: {} }, 'report-5')
        .then(actual => {
          const child = actual[1];
          expect(child._id).to.equal('child-1');
          expect(child.some_property_1).to.equal('parent_new');       // parent wins for the field it edited
          expect(child.some_property_2).to.equal('changed_elsewhere'); // independent edit preserved
        });
    });

    it('preserves a field added to the linked doc by a transition', () => {
      form.validate.resolves(true);
      form.getDataStr.returns(`
        <data>
          <name>Sally</name>
          <doc1 db-doc="true">
            <type>thing_1</type>
            <some_property_1>v2</some_property_1>
          </doc1>
        </data>
      `);
      getReport.resolves({
        _id: 'report-6',
        _rev: '2-report',
        form: 'V',
        type: DOC_TYPES.DATA_RECORD,
        reported_date: 1000,
        fields: {
          name: 'Sally',
          doc1: { _id: 'child-2', type: 'thing_1', some_property_1: 'v1' },
        },
      });
      dbAllDocs.resolves({
        rows: [{
          id: 'child-2',
          doc: {
            _id: 'child-2',
            _rev: '4-child',
            type: 'thing_1',
            some_property_1: 'v1',
            patient_id: 'added-by-transition',
            reported_date: 600,
          },
        }],
      });

      return service
        .completeExistingReport(form, { doc: {} }, 'report-6')
        .then(actual => {
          const child = actual[1];
          expect(child.some_property_1).to.equal('v2');                 // parent edit applied
          expect(child.patient_id).to.equal('added-by-transition');     // transition field untouched
        });
    });
  });

  describe('Saving attachments', () => {
    let getCurrentFiles;

    beforeEach(() => {
      service = TestBed.inject(EnketoService);
      getCurrentFiles = sinon
        .stub(FileManager, 'getCurrentFiles')
        .returns([]);
    });

    it('should save attachments', async () => {
      form.validate.resolves(true);
      const content = loadXML('file-field');
      form.getDataStr.returns(content);
      dbGetAttachment.resolves('<form/>');
      const file0 = { name: 'my_image', type: 'image' };
      const file1 = { name: 'my_file', type: 'file' };
      getCurrentFiles.returns([file0, file1]);

      await service.completeNewReport(
        'my-form',
        form,
        { doc: { } },
        { _id: 'my-user', phone: '8989' }
      );

      expect(AddAttachment.calledTwice).to.be.true;
      expect(AddAttachment.args[0][1]).to.equal(`user-file-${file0.name}`);
      expect(AddAttachment.args[0][2]).to.deep.equal(file0);
      expect(AddAttachment.args[0][3]).to.equal(file0.type);
      expect(AddAttachment.args[1][1]).to.equal(`user-file-${file1.name}`);
      expect(AddAttachment.args[1][2]).to.deep.equal(file1);
      expect(AddAttachment.args[1][3]).to.equal(file1.type);
    });

    it('should remove binary data from content', async () => {
      form.validate.resolves(true);
      const content = loadXML('binary-field');

      form.getDataStr.returns(content);
      dbGetAttachment.resolves('<form/>');

      const [actual] = await service.completeNewReport(
        'my-form',
        form,
        { doc: { } },
        { _id: 'my-user', phone: '8989' }
      );
      expect(actual.fields).to.deep.equal({
        name: 'Mary',
        age: '10',
        gender: 'f',
        my_file: '',
      });
      expect(AddAttachment.callCount).to.equal(1);

      expect(AddAttachment.args[0][1]).to.equal('user-file/my-form/my_file');
      expect(AddAttachment.args[0][2]).to.deep.equal('some image data');
      expect(AddAttachment.args[0][3]).to.equal('image/png');
    });
  });

  describe('multimedia', () => {
    let setNavigationStub;
    let pauseStubs;
    let form;
    let $form;
    let $nextBtn;
    let $prevBtn;
    let originalJQueryFind;

    before(() => {
      $nextBtn = $('<button class="btn next-page"></button>');
      $prevBtn = $('<button class="btn previous-page"></button>');
      originalJQueryFind = $.fn.find;
      setNavigationStub = sinon
        .stub(EnketoService.prototype, <any>'setNavigation')
        .callThrough();

      form = {
        calc: { update: sinon.stub() },
        output: { update: sinon.stub() },
        resetView: sinon.stub(),
        pages: {
          _next: sinon.stub(),
          _getCurrentIndex: sinon.stub()
        }
      };
    });

    beforeEach(() => {
      service = TestBed.inject(EnketoService);

      $form = $(`<div></div>`);
      $form
        .append($nextBtn)
        .append($prevBtn);

      pauseStubs = {};
      sinon
        .stub($.fn, 'find')
        .callsFake(selector => {
          const result = originalJQueryFind.call($form, selector);

          result.each((idx, element) => {
            if (element.pause) {
              pauseStubs[element.id] = sinon.stub(element, 'pause');
            }
          });

          return result;
        });
    });

    after(() => $.fn.find = originalJQueryFind);

    xit('should pause the multimedia when going to the previous page', fakeAsync(() => {
      $form.prepend('<video id="video"></video><audio id="audio"></audio>');
      setNavigationStub.call(service, form, $form);

      $prevBtn.trigger('click.pagemode');
      flush();

      expect(pauseStubs.video).to.not.be.undefined;
      expect(pauseStubs.video.calledOnce).to.be.true;
      expect(pauseStubs.audio).to.not.be.undefined;
      expect(pauseStubs.audio.calledOnce).to.be.true;
    }));

    xit('should pause the multimedia when going to the next page', fakeAsync(() => {
      form.pages._next.resolves(true);
      $form.prepend('<video id="video"></video><audio id="audio"></audio>');
      setNavigationStub.call(service, form, $form);

      $nextBtn.trigger('click.pagemode');
      flush();

      expect(pauseStubs.video).to.not.be.undefined;
      expect(pauseStubs.video.calledOnce).to.be.true;
      expect(pauseStubs.audio).to.not.be.undefined;
      expect(pauseStubs.audio.calledOnce).to.be.true;
    }));

    xit('should not pause the multimedia when trying to go to the next page and form is invalid', fakeAsync(() => {
      form.pages._next.resolves(false);
      $form.prepend('<video id="video"></video><audio id="audio"></audio>');
      setNavigationStub.call(service, form, $form);

      $nextBtn.trigger('click.pagemode');
      flush();

      expect(pauseStubs.video).to.be.undefined;
      expect(pauseStubs.audio).to.be.undefined;
    }));

    xit('should not call pause function when there isnt video and audio in the form wrapper', fakeAsync(() => {
      setNavigationStub.call(service, form, $form);

      $prevBtn.trigger('click.pagemode');
      $nextBtn.trigger('click.pagemode');
      flush();

      expect(pauseStubs.video).to.be.undefined;
      expect(pauseStubs.audio).to.be.undefined;
    }));
  });
});
