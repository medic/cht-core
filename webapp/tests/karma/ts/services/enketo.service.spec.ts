import { fakeAsync, flush, TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { provideMockStore } from '@ngrx/store/testing';
import * as _ from 'lodash-es';

import { DbService } from '@mm-services/db.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { EnketoPrepopulationDataService } from '@mm-services/enketo-prepopulation-data.service';
import { AttachmentService } from '@mm-services/attachment.service';
import { TranslateService } from '@mm-services/translate.service';
import { EnketoService, EnketoFormContext } from '@mm-services/enketo.service';

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
  let dbGet;
  let createObjectURL;
  let TranslateFrom;
  let form;
  let AddAttachment;
  let removeAttachment;
  let EnketoForm;
  let EnketoPrepopulationData;
  let translateService;

  beforeEach(() => {
    enketoInit = sinon.stub();
    dbGetAttachment = sinon.stub();
    dbGet = sinon.stub();
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

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        {
          provide: DbService,
          useValue: {
            get: () => ({ getAttachment: dbGetAttachment, get: dbGet })
          }
        },
        { provide: TranslateFromService, useValue: { get: TranslateFrom } },
        { provide: EnketoPrepopulationDataService, useValue: { get: EnketoPrepopulationData } },
        { provide: AttachmentService, useValue: { add: AddAttachment, remove: removeAttachment } },
        { provide: TranslateService, useValue: translateService },
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
      EnketoPrepopulationData.resolves('<xml></xml>');
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
      EnketoPrepopulationData.resolves('<xml></xml>');
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
      EnketoPrepopulationData.resolves('<xml></xml>');
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
      EnketoPrepopulationData.resolves('<xml></xml>');
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
      EnketoPrepopulationData.resolves(data);
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
      EnketoPrepopulationData.resolves(data);
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
      EnketoPrepopulationData.resolves(data);
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
      EnketoPrepopulationData.resolves(data);
      const formContext = new EnketoFormContext('#div', 'report', mockEnketoDoc('myform'), instanceData);
      formContext.contactSummary = { context: { pregnant: true } };
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
        });
    });

    it('creates report', () => {
      form.validate.resolves(true);
      const content = loadXML('sally-lmp');
      form.getDataStr.returns(content);
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
            some_property_1: 'some_value_1',
            type: 'thing_1',
          });
          expect(actualReport.fields.doc2).to.deep.equal({
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
            type: 'thing_1',
            some_property_1: 'some_value_1',
            my_self_1: doc1_id,
            my_parent_1: reportId,
            my_sibling_1: doc2_id
          });
          expect(actualReport.fields.doc2).to.deep.equal({
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
        });
    });

    it('updates report', () => {
      form.validate.resolves(true);
      const content = loadXML('sally-lmp');
      form.getDataStr.returns(content);
      dbGet.resolves({
        _id: '6',
        _rev: '1-abc',
        form: 'V',
        fields: { name: 'Silly' },
        content: '<doc><name>Silly</name></doc>',
        content_type: 'xml',
        type: 'data_record',
        reported_date: 500,
      });

      return service
        .completeExistingReport(form, { doc: { } }, '6')
        .then(actual => {
          actual = actual[0];

          expect(form.validate.callCount).to.equal(1);
          expect(form.getDataStr.callCount).to.equal(1);
          expect(dbGet.callCount).to.equal(1);
          expect(dbGet.args[0][0]).to.equal('6');
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
        });
    });
  });

  describe('Saving attachments', () => {
    beforeEach(() => {
      service = TestBed.inject(EnketoService);
    });

    it('should save attachments', () => {
      const jqFind = $.fn.find;
      sinon.stub($.fn, 'find');
      //@ts-ignore
      $.fn.find.callsFake(jqFind);

      $.fn.find
        //@ts-ignore
        .withArgs('input[type=file][name="/my-form/my_file"]')
        .returns([{ files: [{ type: 'image', foo: 'bar' }] }]);

      form.validate.resolves(true);
      const content = loadXML('file-field');

      form.getDataStr.returns(content);
      dbGetAttachment.resolves('<form/>');

      return service
        .completeNewReport('my-form', form, { doc: { } }, { _id: 'my-user', phone: '8989' })
        .then(() => {
          expect(AddAttachment.calledOnce);

          expect(AddAttachment.args[0][1]).to.equal('user-file/my-form/my_file');
          expect(AddAttachment.args[0][2]).to.deep.equal({ type: 'image', foo: 'bar' });
          expect(AddAttachment.args[0][3]).to.equal('image');
        });
    });

    it('should remove binary data from content', () => {
      form.validate.resolves(true);
      const content = loadXML('binary-field');

      form.getDataStr.returns(content);
      dbGetAttachment.resolves('<form/>');

      return service
        .completeNewReport('my-form', form, { doc: { } }, { _id: 'my-user', phone: '8989' })
        .then(([actual]) => {
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

    it('should assign attachment names relative to the form name not the root node name', () => {
      const jqFind = $.fn.find;
      sinon.stub($.fn, 'find');
      //@ts-ignore
      $.fn.find.callsFake(jqFind);
      $.fn.find
        //@ts-ignore
        .withArgs('input[type=file][name="/my-root-element/my_file"]')
        .returns([{ files: [{ type: 'image', foo: 'bar' }] }]);
      $.fn.find
        //@ts-ignore
        .withArgs('input[type=file][name="/my-root-element/sub_element/sub_sub_element/other_file"]')
        .returns([{ files: [{ type: 'mytype', foo: 'baz' }] }]);
      form.validate.resolves(true);
      const content = loadXML('deep-file-fields');

      form.getDataStr.returns(content);
      dbGetAttachment.resolves('<form/>');

      return service
        .completeNewReport('my-form-internal-id', form, { doc: { } }, { _id: 'my-user', phone: '8989' })
        .then(() => {
          expect(AddAttachment.callCount).to.equal(2);

          expect(AddAttachment.args[0][1]).to.equal('user-file/my-form-internal-id/my_file');
          expect(AddAttachment.args[0][2]).to.deep.equal({ type: 'image', foo: 'bar' });
          expect(AddAttachment.args[0][3]).to.equal('image');

          expect(AddAttachment.args[1][1])
            .to.equal('user-file/my-form-internal-id/sub_element/sub_sub_element/other_file');
          expect(AddAttachment.args[1][2]).to.deep.equal({ type: 'mytype', foo: 'baz' });
          expect(AddAttachment.args[1][3]).to.equal('mytype');
        });
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

describe('EnketoFormContext', () => {
  it('should construct object correctly', () => {
    const context = new EnketoFormContext('#sel', 'task', { doc: 1 }, { data: 1 });
    expect(context).to.deep.include({
      selector: '#sel',
      type: 'task',
      formDoc: { doc: 1 },
      instanceData: { data: 1 },
    });
  });

  it('shouldEvaluateExpression should return false for tasks', () => {
    const ctx = new EnketoFormContext('a', 'task', {}, {});
    expect(ctx.shouldEvaluateExpression()).to.eq(false);
  });

  it('shouldEvaluateExpression should return false for editing reports', () => {
    const ctx = new EnketoFormContext('a', 'report', {}, {});
    ctx.editing = true;
    expect(ctx.shouldEvaluateExpression()).to.eq(false);
  });

  it('shouldEvaluateExpression should return true for reports and contact forms', () => {
    const ctxReport = new EnketoFormContext('a', 'report', {}, {});
    expect(ctxReport.shouldEvaluateExpression()).to.eq(true);

    const ctxContact = new EnketoFormContext('a', 'contact', {}, {});
    expect(ctxContact.shouldEvaluateExpression()).to.eq(true);
  });

  it('requiresContact should return true when type is not contact', () => {
    const ctxReport = new EnketoFormContext('a', 'report', {}, {});
    expect(ctxReport.requiresContact()).to.eq(true);
  });

  it('requiresContact should return false when type is contact', () => {
    const ctxReport = new EnketoFormContext('a', 'contact', {}, {});
    expect(ctxReport.requiresContact()).to.eq(false);
  });
});