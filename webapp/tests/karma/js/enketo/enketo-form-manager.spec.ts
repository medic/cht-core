import { expect, assert } from 'chai';
import $ from 'jquery';
import sinon from 'sinon';
import _ from 'lodash';
import chai from 'chai';
import chaiExclude from 'chai-exclude';
import {
  ContactServices,
  FileServices,
  FormDataServices,
  TranslationServices,
  XmlServices,
  EnketoFormManager
} from '../../../../src/js/enketo/enketo-form-manager';

chai.use(chaiExclude);

describe('Enketo Form Manager', () => {
  let contactServices;
  let dbBulkDocs;
  let dbGet;
  let dbGetAttachment;
  let fileServices;
  let formDataService;
  let translationServices;
  let xmlFormGet;
  let xmlFormGetWithAttachment;
  let xmlServices;
  let transitionsService;
  let globalActions;
  let enketoFormMgr;

  let form;
  let EnketoForm;

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

  beforeEach(() => {
    const extractLineageService = {
      extract: sinon.stub().callsFake(contact => ({ _id: contact._id }))
    };
    const userContactService = {
      get: sinon.stub().resolves({ _id: '123', phone: '555' })
    };
    contactServices = new ContactServices(extractLineageService, userContactService);

    dbBulkDocs = sinon.stub()
      .callsFake(docs => Promise.resolve([{ ok: true, id: docs[0]._id, rev: '1-abc' }]));
    dbGet = sinon.stub();
    dbGetAttachment = sinon.stub()
      .onFirstCall().resolves('<div>my form</div>')
      .onSecondCall().resolves(VISIT_MODEL);
    const dbService = {
      get: sinon.stub().returns({
        bulkDocs: dbBulkDocs,
        get: dbGet,
        getAttachment: dbGetAttachment
      })
    };
    const fileReaderService = {
      utf8: sinon.stub().resolves('<model><instance><some-blob name="xml"/></instance></model>')
    };
    fileServices = new FileServices(dbService, fileReaderService);

    const contactSummaryService = { get: sinon.stub() };
    const languageService = {
      get: sinon.stub().resolves('en')
    };
    const lineageModelGeneratorService = { contact: sinon.stub() };
    xmlFormGet = sinon.stub().resolves({ _id: 'abc' });
    xmlFormGetWithAttachment = sinon.stub().resolves({ doc: { _id: 'abc', xml: '<form/>' } });
    const searchService = { search: sinon.stub() };
    formDataService = new FormDataServices(
      contactSummaryService,
      null,
      languageService,
      lineageModelGeneratorService,
      searchService
    );
    formDataService.enketoDataPrepopulatorService = {
      get: sinon.stub().resolves('<xml></xml>')
    };

    const translateService = {
      get: sinon.stub()
    };
    const translateFromService = {
      get: sinon.stub()
    };
    translationServices = new TranslationServices(translateService, translateFromService);

    const addAttachmentService = {
      add: sinon.stub(),
      remove: sinon.stub()
    };
    const getReportContentService = {
      REPORT_ATTACHMENT_NAME: 'content'
    };
    const xmlFormsService = {
      get: xmlFormGet,
      getDocAndFormAttachment: xmlFormGetWithAttachment
    };
    xmlServices = new XmlServices(
      addAttachmentService,
      getReportContentService,
      xmlFormsService
    );

    transitionsService = {
      applyTransitions: sinon.stub().returnsArg(0)
    };
    globalActions = {
      setSnackbarContent: sinon.stub()
    };

    enketoFormMgr = new EnketoFormManager(
      contactServices,
      fileServices,
      formDataService,
      translationServices,
      xmlServices,
      transitionsService,
      globalActions
    );

    form = {
      calc: { update: sinon.stub() },
      getDataStr: sinon.stub(),
      init: sinon.stub(),
      model: { getStr: sinon.stub().returns(VISIT_MODEL) },
      output: { update: sinon.stub() },
      validate: sinon.stub(),
      relevant: { update: sinon.stub() },
      resetView: sinon.stub(),
      pages: {
        activePages: {
          length: 1
        },
        _next: sinon.stub(),
        _getCurrentIndex: sinon.stub()
      }
    };

    EnketoForm = sinon.stub().returns(form);
    window.EnketoForm = EnketoForm;

    window.CHTCore = {};
  });

  afterEach(() => {
    sinon.restore();
    delete window.CHTCore;
  });

  describe('render', () => {
    it('renders error when user does not have associated contact', () => {
      contactServices.userContact.get.resolves();
      return enketoFormMgr
        .render(null, 'not-defined')
        .then(() => {
          assert.fail('Should throw error');
        })
        .catch(actual => {
          expect(actual.message).to.equal('Your user does not have an associated contact, or does not have access ' +
            'to the associated contact. Talk to your administrator to correct this.');
          expect(actual.translationKey).to.equal('error.loading.form.no_contact');
        });
    });

    it('return error when form initialisation fails', () => {
      const expected = ['nope', 'still nope'];
      form.init.returns(expected);
      return enketoFormMgr
        .render($('<div></div>'), mockEnketoDoc('myform'))
        .then(() => {
          assert.fail('Should throw error');
        })
        .catch(actual => {
          expect(form.init.callCount).to.equal(1);
          expect(actual.message).to.equal(JSON.stringify(expected));
        });
    });

    it('return form when everything works', () => {
      return enketoFormMgr
        .render($('<div></div>'), mockEnketoDoc('myform'))
        .then(() => {
          expect(contactServices.userContact.get.callCount).to.equal(1);
          expect(formDataService.enketoDataPrepopulator.get.callCount).to.equal(1);
          expect(fileServices.fileReader.utf8.callCount).to.equal(2);
          expect(fileServices.fileReader.utf8.args[0][0]).to.equal('<div>my form</div>');
          expect(fileServices.fileReader.utf8.args[1][0]).to.equal(VISIT_MODEL);
          expect(form.init.callCount).to.equal(1);
          expect(dbGetAttachment.callCount).to.equal(2);
          expect(dbGetAttachment.args[0][0]).to.equal('form:myform');
          expect(dbGetAttachment.args[0][1]).to.equal('form.html');
          expect(dbGetAttachment.args[1][0]).to.equal('form:myform');
          expect(dbGetAttachment.args[1][1]).to.equal('model.xml');
          expect(window.CHTCore.debugFormModel()).to.equal(VISIT_MODEL);
        });
    });

    it('replaces img src with obj urls', async() => {
      dbGetAttachment
        .onFirstCall().resolves('<div><img data-media-src="myimg"></div>')
        .onSecondCall().resolves(VISIT_MODEL)
        .onThirdCall().resolves('myobjblob');
      const createObjectURL = sinon.stub().returns('myobjurl');
      window.URL.createObjectURL = createObjectURL;
      fileServices.fileReader.utf8.resolves('<div><img data-media-src="myimg"></div>');
      const wrapper = $('<div><div class="container"></div><form></form></div>');
      await enketoFormMgr.render(wrapper, mockEnketoDoc('myform'));
      await Promise.resolve();  // need to wait for async get attachment to complete
      const img = wrapper.find('img').first();
      expect(img.css('visibility')).to.satisfy(val => {
        // different browsers return different values but both are equivalent
        return val === '' || val === 'visible';
      });
      expect(form.init.callCount).to.equal(1);
      expect(createObjectURL.callCount).to.equal(1);
      expect(createObjectURL.args[0][0]).to.equal('myobjblob');
    });

    it('leaves img wrapped and hides loader if failed to load', () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      const createObjectURL = sinon.stub();
      window.URL.createObjectURL = createObjectURL;
      dbGetAttachment
        .onFirstCall().resolves('<div><img data-media-src="myimg"></div>')
        .onSecondCall().resolves(VISIT_MODEL)
        .onThirdCall().rejects('not found');
      fileServices.fileReader.utf8.resolves('<div><img data-media-src="myimg"></div>');
      const wrapper = $('<div><div class="container"></div><form></form></div>');
      return enketoFormMgr.render(wrapper, mockEnketoDoc('myform')).then(() => {
        const img = wrapper.find('img').first();
        expect(img.attr('src')).to.equal(undefined);
        expect(img.attr('data-media-src')).to.equal('myimg');
        expect(img.css('visibility')).to.equal('hidden');
        const loader = img.closest('div');
        expect(loader.hasClass('loader')).to.equal(true);
        expect(loader.is(':hidden')).to.equal(true);
        expect(form.init.callCount).to.equal(1);
        expect(createObjectURL.callCount).to.equal(0);
        expect(consoleErrorMock.callCount).to.equal(1);
        expect(consoleErrorMock.args[0][0]).to.equal('Error fetching media file');
      });
    });

    it('passes users language to Enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves('my model');
      fileServices.fileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves('my model');
      formDataService.enketoDataPrepopulator.get.resolves(data);
      formDataService.languageService.get.resolves('sw');
      return enketoFormMgr.render($('<div></div>'), mockEnketoDoc('myform'), data).then(() => {
        expect(formDataService.languageService.get.callCount).to.equal(1);
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][2].language).to.equal('sw');
      });
    });

    it('passes xml instance data through to Enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      fileServices.fileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves('my model');
      formDataService.enketoDataPrepopulator.get.resolves(data);
      return enketoFormMgr.render($('<div></div>'), mockEnketoDoc('myform'), data).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].modelStr).to.equal('my model');
        expect(EnketoForm.args[0][1].instanceStr).to.equal(data);
      });
    });

    it('passes json instance data through to Enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      fileServices.fileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      formDataService.enketoDataPrepopulator.get.resolves(data);
      const instanceData = {
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      return enketoFormMgr.render($('<div></div>'), mockEnketoDoc('myform'), instanceData).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].modelStr).to.equal(VISIT_MODEL);
        expect(EnketoForm.args[0][1].instanceStr).to.equal(data);
      });
    });

    it('passes contact summary data to enketo', () => {
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      fileServices.fileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
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
      formDataService.contactSummary.get.resolves({ context: { pregnant: true } });
      formDataService.search.search.resolves([{ _id: 'somereport' }]);
      formDataService.lineageModelGenerator.contact.resolves({ lineage: [{ _id: 'someparent' }] });
      return enketoFormMgr.render($('<div></div>'), mockEnketoDoc('myform'), instanceData).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].external.length).to.equal(1);
        const summary = EnketoForm.args[0][1].external[0];
        expect(summary.id).to.equal('contact-summary');
        const xmlStr = new XMLSerializer().serializeToString(summary.xml);
        expect(xmlStr).to.equal('<context><pregnant>true</pregnant></context>');
        expect(formDataService.search.search.callCount).to.equal(1);
        expect(formDataService.search.search.args[0][0]).to.equal('reports');
        expect(formDataService.search.search.args[0][1].subjectIds).to.deep.equal(['fffff', '44509']);
        expect(formDataService.lineageModelGenerator.contact.callCount).to.equal(1);
        expect(formDataService.lineageModelGenerator.contact.args[0][0]).to.equal('fffff');
        expect(formDataService.contactSummary.get.callCount).to.equal(1);
        expect(formDataService.contactSummary.get.args[0][0]._id).to.equal('fffff');
        expect(formDataService.contactSummary.get.args[0][1].length).to.equal(1);
        expect(formDataService.contactSummary.get.args[0][1][0]._id).to.equal('somereport');
        expect(formDataService.contactSummary.get.args[0][2].length).to.equal(1);
        expect(formDataService.contactSummary.get.args[0][2][0]._id).to.equal('someparent');
      });
    });

    it('handles arrays and escaping characters', () => {
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      fileServices.fileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      const instanceData = {
        contact: {
          _id: 'fffff'
        },
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      formDataService.contactSummary.get.resolves({
        context: {
          pregnant: true,
          previousChildren: [{ dob: 2016 }, { dob: 2013 }, { dob: 2010 }],
          notes: `always <uses> reserved "characters" & 'words'`
        }
      });
      formDataService.lineageModelGenerator.contact.resolves({ lineage: [] });
      return enketoFormMgr.render($('<div></div>'), mockEnketoDoc('myform'), instanceData).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].external.length).to.equal(1);
        const summary = EnketoForm.args[0][1].external[0];
        expect(summary.id).to.equal('contact-summary');
        const xmlStr = new XMLSerializer().serializeToString(summary.xml);
        expect(xmlStr).to.equal('<context><pregnant>true</pregnant><previousChildren><dob>2016</dob>' +
          '<dob>2013</dob><dob>2010</dob></previousChildren><notes>always &lt;uses&gt; reserved "' +
          'characters" &amp; \'words\'</notes></context>');
        expect(formDataService.contactSummary.get.callCount).to.equal(1);
        expect(formDataService.contactSummary.get.args[0][0]._id).to.equal('fffff');
      });
    });

    it('does not get contact summary when the form has no instance for it', () => {
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      fileServices.fileReader.utf8.resolves('<some-blob name="xml"/>');
      const instanceData = {
        contact: {
          _id: 'fffff'
        },
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      return enketoFormMgr.render($('<div></div>'), mockEnketoDoc('myform'), instanceData).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].external).to.equal(undefined);
        expect(formDataService.contactSummary.get.callCount).to.equal(0);
        expect(formDataService.lineageModelGenerator.contact.callCount).to.equal(0);
      });
    });

    it('ContactSummary receives empty lineage if contact doc is missing', () => {
      const consoleWarnMock = sinon.stub(console, 'warn');
      formDataService.lineageModelGenerator.contact.rejects({ code: 404 });

      fileServices.fileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      const instanceData = {
        contact: {
          _id: 'fffff',
          patient_id: '44509'
        }
      };
      formDataService.contactSummary.get.resolves({ context: { pregnant: true } });
      formDataService.search.search.resolves([{ _id: 'somereport' }]);
      return enketoFormMgr.render($('<div></div>'), mockEnketoDoc('myform'), instanceData).then(() => {
        expect(formDataService.lineageModelGenerator.contact.callCount).to.equal(1);
        expect(formDataService.lineageModelGenerator.contact.args[0][0]).to.equal('fffff');
        expect(formDataService.contactSummary.get.callCount).to.equal(1);
        expect(formDataService.contactSummary.get.args[0][2].length).to.equal(0);
        expect(consoleWarnMock.callCount).to.equal(1);
        expect(consoleWarnMock.args[0][0].startsWith('Enketo failed to get lineage of contact')).to.be.true;
      });
    });
  });

  describe('validate', () => {
    let inputRelevant;
    let inputNonRelevant;
    let inputNoDataset;

    beforeEach(() => {
      inputRelevant = { dataset: { relevant: 'true' } };
      inputNonRelevant = { dataset: { relevant: 'false' } };
      inputNoDataset = {};
      const toArray = sinon.stub().returns([inputRelevant, inputNoDataset, inputNonRelevant]);
      // @ts-ignore
      sinon.stub($.fn, 'find').returns({ toArray });
    });

    it('rejects on invalid form', () => {
      form.validate.resolves(false);

      return enketoFormMgr.validate(form)
        .then(() => assert.fail('An error should have been thrown.'))
        .catch(actual => {
          expect(actual.message).to.equal('Form is invalid');
          expect(inputRelevant.dataset.relevant).to.equal('true');
          expect(inputNonRelevant.dataset.relevant).to.equal('false');
          expect(inputNoDataset.dataset).to.be.undefined;
          expect(form.validate.callCount).to.equal(1);
        });
    });
  });

  describe('save', () => {
    it('creates report', () => {
      const content = loadXML('sally-lmp');
      form.getDataStr.returns(content);
      return enketoFormMgr.save('V', form).then(actual => {
        actual = actual[0];

        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(contactServices.userContact.get.callCount).to.equal(1);
        expect(actual._id).to.match(/(\w+-)\w+/);
        expect(actual._rev).to.equal('1-abc');
        expect(actual.fields.name).to.equal('Sally');
        expect(actual.fields.lmp).to.equal('10');
        expect(actual.form).to.equal('V');
        expect(actual.type).to.equal('data_record');
        expect(actual.content_type).to.equal('xml');
        expect(actual.contact._id).to.equal('123');
        expect(actual.from).to.equal('555');
        expect(xmlFormGetWithAttachment.callCount).to.equal(1);
        expect(xmlFormGetWithAttachment.args[0][0]).to.equal('V');
        expect(xmlServices.addAttachment.remove.callCount).to.equal(1);
        expect(xmlServices.addAttachment.remove.args[0][0]._id).to.equal(actual._id);
        expect(xmlServices.addAttachment.remove.args[0][1]).to.equal('content');
      });
    });

    it('saves form version if found', () => {
      const content = loadXML('sally-lmp');
      form.getDataStr.returns(content);
      xmlFormGetWithAttachment.resolves({
        doc: { _id: 'abc', xmlVersion: { time: '1', sha256: 'imahash' } },
        xml: '<form/>'
      });
      return enketoFormMgr.save('V', form).then(actual => {
        actual = actual[0];
        expect(actual.form_version).to.deep.equal({ time: '1', sha256: 'imahash' });
        expect(xmlFormGetWithAttachment.callCount).to.equal(1);
        expect(xmlFormGetWithAttachment.args[0][0]).to.equal('V');
      });
    });

    describe('Geolocation recording', () => {
      it('saves geolocation data into a new report', () => {
        const content = loadXML('sally-lmp');
        form.getDataStr.returns(content);
        const geoData = {
          latitude: 1,
          longitude: 2,
          altitude: 3,
          accuracy: 4,
          altitudeAccuracy: 5,
          heading: 6,
          speed: 7
        };
        return enketoFormMgr.save('V', form, () => Promise.resolve(geoData)).then(actual => {
          actual = actual[0];

          expect(form.getDataStr.callCount).to.equal(1);
          expect(dbBulkDocs.callCount).to.equal(1);
          expect(contactServices.userContact.get.callCount).to.equal(1);
          expect(actual._id).to.match(/(\w+-)\w+/);
          expect(actual._rev).to.equal('1-abc');
          expect(actual.fields.name).to.equal('Sally');
          expect(actual.fields.lmp).to.equal('10');
          expect(actual.form).to.equal('V');
          expect(actual.type).to.equal('data_record');
          expect(actual.content_type).to.equal('xml');
          expect(actual.contact._id).to.equal('123');
          expect(actual.from).to.equal('555');
          expect(actual.geolocation).to.deep.equal(geoData);
          expect(actual.geolocation_log.length).to.equal(1);
          expect(actual.geolocation_log[0].timestamp).to.be.greaterThan(0);
          expect(actual.geolocation_log[0].recording).to.deep.equal(geoData);
          expect(xmlFormGetWithAttachment.callCount).to.equal(1);
          expect(xmlFormGetWithAttachment.args[0][0]).to.equal('V');
          expect(xmlServices.addAttachment.remove.callCount).to.equal(1);
          expect(xmlServices.addAttachment.remove.args[0][0]._id).to.equal(actual._id);
          expect(xmlServices.addAttachment.remove.args[0][1]).to.equal('content');
        });
      });

      it('saves a geolocation error into a new report', () => {
        const content = loadXML('sally-lmp');
        form.getDataStr.returns(content);
        const geoError = {
          code: 42,
          message: 'some bad geo'
        };
        return enketoFormMgr.save('V', form, () => Promise.reject(geoError)).then(actual => {
          actual = actual[0];

          expect(form.getDataStr.callCount).to.equal(1);
          expect(dbBulkDocs.callCount).to.equal(1);
          expect(contactServices.userContact.get.callCount).to.equal(1);
          expect(actual._id).to.match(/(\w+-)\w+/);
          expect(actual._rev).to.equal('1-abc');
          expect(actual.fields.name).to.equal('Sally');
          expect(actual.fields.lmp).to.equal('10');
          expect(actual.form).to.equal('V');
          expect(actual.type).to.equal('data_record');
          expect(actual.content_type).to.equal('xml');
          expect(actual.contact._id).to.equal('123');
          expect(actual.from).to.equal('555');
          expect(actual.geolocation).to.deep.equal(geoError);
          expect(actual.geolocation_log.length).to.equal(1);
          expect(actual.geolocation_log[0].timestamp).to.be.greaterThan(0);
          expect(actual.geolocation_log[0].recording).to.deep.equal(geoError);
          expect(xmlFormGetWithAttachment.callCount).to.equal(1);
          expect(xmlFormGetWithAttachment.args[0][0]).to.equal('V');
          expect(xmlServices.addAttachment.remove.callCount).to.equal(1);
          expect(xmlServices.addAttachment.remove.args[0][0]._id).to.equal(actual._id);
          expect(xmlServices.addAttachment.remove.args[0][1]).to.equal('content');
        });
      });

      it('overwrites existing geolocation info on edit with new info and appends to the log', () => {
        const content = loadXML('sally-lmp');
        form.getDataStr.returns(content);
        const originalGeoData = {
          latitude: 1,
          longitude: 2,
          altitude: 3,
          accuracy: 4,
          altitudeAccuracy: 5,
          heading: 6,
          speed: 7
        };
        const originalGeoLogEntry = {
          timestamp: 12345,
          recording: originalGeoData
        };
        dbGet.resolves({
          _id: '6',
          _rev: '1-abc',
          form: 'V',
          fields: { name: 'Silly' },
          content: '<doc><name>Silly</name></doc>',
          content_type: 'xml',
          type: 'data_record',
          reported_date: 500,
          geolocation: originalGeoData,
          geolocation_log: [originalGeoLogEntry]
        });
        dbBulkDocs.resolves([{ ok: true, id: '6', rev: '2-abc' }]);
        const geoData = {
          latitude: 10,
          longitude: 11,
          altitude: 12,
          accuracy: 13,
          altitudeAccuracy: 14,
          heading: 15,
          speed: 16
        };
        return enketoFormMgr.save('V', form, () => Promise.resolve(geoData), '6').then(actual => {
          actual = actual[0];

          expect(form.getDataStr.callCount).to.equal(1);
          expect(dbGet.callCount).to.equal(1);
          expect(dbGet.args[0][0]).to.equal('6');
          expect(dbBulkDocs.callCount).to.equal(1);
          expect(actual._id).to.equal('6');
          expect(actual._rev).to.equal('2-abc');
          expect(actual.fields.name).to.equal('Sally');
          expect(actual.fields.lmp).to.equal('10');
          expect(actual.form).to.equal('V');
          expect(actual.type).to.equal('data_record');
          expect(actual.reported_date).to.equal(500);
          expect(actual.content_type).to.equal('xml');
          expect(actual.geolocation).to.deep.equal(geoData);
          expect(actual.geolocation_log.length).to.equal(2);
          expect(actual.geolocation_log[0]).to.deep.equal(originalGeoLogEntry);
          expect(actual.geolocation_log[1].timestamp).to.be.greaterThan(0);
          expect(actual.geolocation_log[1].recording).to.deep.equal(geoData);
          expect(xmlServices.addAttachment.remove.callCount).to.equal(1);
          expect(xmlServices.addAttachment.remove.args[0][0]._id).to.equal(actual._id);
          expect(xmlServices.addAttachment.remove.args[0][1]).to.equal('content');
        });
      });

      it('creates report with erroring geolocation', () => {
        const content = loadXML('sally-lmp');
        form.getDataStr.returns(content);
        const geoError = {
          code: 42,
          message: 'geolocation failed for some reason'
        };
        return enketoFormMgr.save('V', form, () => Promise.reject(geoError)).then(actual => {
          actual = actual[0];

          expect(form.getDataStr.callCount).to.equal(1);
          expect(dbBulkDocs.callCount).to.equal(1);
          expect(contactServices.userContact.get.callCount).to.equal(1);
          expect(actual._id).to.match(/(\w+-)\w+/);
          expect(actual._rev).to.equal('1-abc');
          expect(actual.fields.name).to.equal('Sally');
          expect(actual.fields.lmp).to.equal('10');
          expect(actual.form).to.equal('V');
          expect(actual.type).to.equal('data_record');
          expect(actual.content_type).to.equal('xml');
          expect(actual.contact._id).to.equal('123');
          expect(actual.from).to.equal('555');
          expect(actual.geolocation).to.deep.equal(geoError);
          expect(xmlFormGetWithAttachment.callCount).to.equal(1);
          expect(xmlFormGetWithAttachment.args[0][0]).to.equal('V');
          expect(xmlServices.addAttachment.remove.callCount).to.equal(1);
          expect(xmlServices.addAttachment.remove.args[0][0]._id).to.equal(actual._id);
          expect(xmlServices.addAttachment.remove.args[0][1]).to.equal('content');
        });
      });
    });

    it('creates report with hidden fields', () => {
      const content = loadXML('hidden-field');
      form.getDataStr.returns(content);
      dbBulkDocs.resolves([{ ok: true, id: '(generated-in-service)', rev: '1-abc' }]);

      return enketoFormMgr.save('V', form, null, null).then(actual => {
        actual = actual[0];

        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(contactServices.userContact.get.callCount).to.equal(1);
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

    it('updates report', () => {
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
      dbBulkDocs.resolves([{ ok: true, id: '6', rev: '2-abc' }]);
      return enketoFormMgr.save('V', form, null, '6').then(actual => {
        actual = actual[0];

        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbGet.callCount).to.equal(1);
        expect(dbGet.args[0][0]).to.equal('6');
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(actual._id).to.equal('6');
        expect(actual._rev).to.equal('2-abc');
        expect(actual.fields.name).to.equal('Sally');
        expect(actual.fields.lmp).to.equal('10');
        expect(actual.form).to.equal('V');
        expect(actual.type).to.equal('data_record');
        expect(actual.reported_date).to.equal(500);
        expect(actual.content_type).to.equal('xml');
        expect(xmlServices.addAttachment.remove.callCount).to.equal(1);
        expect(xmlServices.addAttachment.remove.args[0][0]._id).to.equal(actual._id);
        expect(xmlServices.addAttachment.remove.args[0][1]).to.equal('content');
      });
    });

    it('creates extra docs', () => {
      const startTime = Date.now() - 1;

      const content = loadXML('extra-docs');
      form.getDataStr.returns(content);
      dbBulkDocs.callsFake(docs => {
        return Promise.resolve(docs.map(doc => {
          return { ok: true, id: doc._id, rev: `1-${doc._id}-abc` };
        }));
      });

      return enketoFormMgr.save('V', form, null, null).then(actual => {
        const endTime = Date.now() + 1;//console.log(JSON.stringify(actual))

        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(contactServices.userContact.get.callCount).to.equal(1);

        expect(actual.length).to.equal(3);

        const actualReport = actual[0];
        expect(actualReport._id).to.match(/(\w+-)\w+/);
        expect(actualReport._rev).to.equal(`1-${actualReport._id}-abc`);
        expect(actualReport.fields.name).to.equal('Sally');
        expect(actualReport.fields.lmp).to.equal('10');
        expect(actualReport.fields.secret_code_name).to.equal('S4L');
        expect(actualReport.form).to.equal('V');
        expect(actualReport.type).to.equal('data_record');
        expect(actualReport.content_type).to.equal('xml');
        expect(actualReport.contact._id).to.equal('123');
        expect(actualReport.from).to.equal('555');
        expect(actualReport.hidden_fields).to.deep.equal(['doc1', 'doc2', 'secret_code_name']);

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
        expect(actualThing1._rev).to.equal(`1-${actualThing1._id}-abc`);
        expect(actualThing1.reported_date).to.be.within(startTime, endTime);
        expect(actualThing1.some_property_1).to.equal('some_value_1');

        const actualThing2 = actual[2];
        expect(actualThing2._id).to.match(/(\w+-)\w+/);
        expect(actualThing2._rev).to.equal(`1-${actualThing2._id}-abc`);
        expect(actualThing2.reported_date).to.be.within(startTime, endTime);
        expect(actualThing2.some_property_2).to.equal('some_value_2');

        expect(_.uniq(_.map(actual, '_id')).length).to.equal(3);
      });
    });

    it('creates extra docs with geolocation', () => {

      const startTime = Date.now() - 1;

      const content = loadXML('extra-docs');
      form.getDataStr.returns(content);
      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' }
      ]);
      const geoData = {
        latitude: 1,
        longitude: 2,
        altitude: 3,
        accuracy: 4,
        altitudeAccuracy: 5,
        heading: 6,
        speed: 7
      };
      return enketoFormMgr.save('V', form, () => Promise.resolve(geoData)).then(actual => {
        const endTime = Date.now() + 1;

        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(contactServices.userContact.get.callCount).to.equal(1);

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
        expect(actualReport.hidden_fields).to.deep.equal(['doc1', 'doc2', 'secret_code_name']);

        expect(actualReport.fields.doc1).to.deep.equal({
          some_property_1: 'some_value_1',
          type: 'thing_1',
        });
        expect(actualReport.fields.doc2).to.deep.equal({
          some_property_2: 'some_value_2',
          type: 'thing_2',
        });

        expect(actualReport.geolocation).to.deep.equal(geoData);

        const actualThing1 = actual[1];
        expect(actualThing1._id).to.match(/(\w+-)\w+/);
        expect(actualThing1.reported_date).to.be.above(startTime);
        expect(actualThing1.reported_date).to.be.below(endTime);
        expect(actualThing1.some_property_1).to.equal('some_value_1');
        expect(actualThing1.geolocation).to.deep.equal(geoData);

        const actualThing2 = actual[2];
        expect(actualThing2._id).to.match(/(\w+-)\w+/);
        expect(actualThing2.reported_date).to.be.above(startTime);
        expect(actualThing2.reported_date).to.be.below(endTime);
        expect(actualThing2.some_property_2).to.equal('some_value_2');

        expect(actualThing2.geolocation).to.deep.equal(geoData);

        expect(_.uniq(_.map(actual, '_id')).length).to.equal(3);
      });
    });

    it('creates extra docs with references', () => {
      const content = loadXML('extra-docs-with-references');
      form.getDataStr.returns(content);
      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' }
      ]);

      return enketoFormMgr.save('V', form).then(actual => {
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(contactServices.userContact.get.callCount).to.equal(1);

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
        expect(actualReport.hidden_fields).to.deep.equal(['doc1', 'doc2', 'secret_code_name']);

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
      const content = loadXML('extra-docs-with-repeat');
      form.getDataStr.returns(content);
      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' },
        { ok: true, id: '9', rev: '1-ghi' }
      ]);
      return enketoFormMgr.save('V', form).then(actual => {
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(contactServices.userContact.get.callCount).to.equal(1);

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
        expect(actualReport.hidden_fields).to.deep.equal(['repeat_doc', 'secret_code_name']);

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
      const content = loadXML('db-doc-ref-in-repeat');
      form.getDataStr.returns(content);

      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' },
        { ok: true, id: '9', rev: '1-ghi' }
      ]);
      xmlFormGetWithAttachment.resolves({
        xml: `
          <data>
            <repeat nodeset="/data/repeat_section"></repeat>
          </data>
        `,
        doc: { _id: 'abc' }
      });
      return enketoFormMgr.save('V', form).then(actual => {
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(contactServices.userContact.get.callCount).to.equal(1);

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
      const content = loadXML('db-doc-ref-in-deep-repeat');
      form.getDataStr.returns(content);

      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' },
        { ok: true, id: '9', rev: '1-ghi' }
      ]);
      xmlFormGetWithAttachment.resolves({
        xml: `
          <data>
            <repeat nodeset="/data/repeat_section"></repeat>
          </data>
        `,
        doc: { _id: 'abc' }
      });
      return enketoFormMgr.save('V', form).then(actual => {
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(contactServices.userContact.get.callCount).to.equal(1);

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
      const content = loadXML('db-doc-ref-in-deep-repeats-extra-repeats');
      form.getDataStr.returns(content);

      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' },
        { ok: true, id: '9', rev: '1-ghi' }
      ]);
      xmlFormGetWithAttachment.resolves({
        xml: `
          <data>
            <repeat nodeset="/data/repeat_section"></repeat>
          </data>
        `,
        doc: { _id: 'abc' }
      });
      return enketoFormMgr.save('V', form).then(actual => {
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(contactServices.userContact.get.callCount).to.equal(1);

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
      const content = loadXML('db-doc-ref-in-repeats-with-local-references');
      form.getDataStr.returns(content);

      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' },
        { ok: true, id: '9', rev: '1-ghi' }
      ]);
      xmlFormGetWithAttachment.resolves({
        xml: `
          <data>
            <repeat nodeset="/data/repeat_section"></repeat>
          </data>
        `,
        doc: { _id: 'abc' }
      });
      return enketoFormMgr.save('V', form).then(actual => {
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(contactServices.userContact.get.callCount).to.equal(1);

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
      const content = loadXML('db-doc-ref-in-deep-repeats-with-local-references');
      form.getDataStr.returns(content);

      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' },
        { ok: true, id: '9', rev: '1-ghi' }
      ]);
      xmlFormGetWithAttachment.resolves({
        xml: `
          <data>
            <repeat nodeset="/data/repeat_section"></repeat>
          </data>
        `,
        doc: { _id: 'abc' }
      });
      return enketoFormMgr.save('V', form).then(actual => {
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(contactServices.userContact.get.callCount).to.equal(1);

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
      const content = loadXML('db-doc-ref-outside-of-repeat');
      form.getDataStr.returns(content);

      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
      ]);
      xmlFormGetWithAttachment.resolves({
        xml: `
        <data>
          <repeat nodeset="/data/repeat_section"></repeat>
        </data>
        `,
        doc: { _id: 'abc' }
      });
      return enketoFormMgr.save('V', form).then(actual => {
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(contactServices.userContact.get.callCount).to.equal(1);

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
      const content = loadXML('db-doc-ref-same-as-repeat');
      form.getDataStr.returns(content);

      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
      ]);
      xmlFormGetWithAttachment.resolves({
        xml: `
          <data>
            <repeat nodeset="/data/repeat_section"></repeat>
          </data>
        `,
        doc: { _id: 'abc' }
      });
      return enketoFormMgr.save('V', form).then(actual => {
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(contactServices.userContact.get.callCount).to.equal(1);

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
      const content = loadXML('db-doc-ref-broken-ref');
      form.getDataStr.returns(content);

      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
      ]);
      xmlFormGetWithAttachment.resolves({
        xml: `
          <data>
            <repeat nodeset="/data/repeat_section"></repeat>
          </data>
        `,
        doc: { _id: 'abc' }
      });
      return enketoFormMgr.save('V', form).then(actual => {
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(contactServices.userContact.get.callCount).to.equal(1);

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

    describe('Saving attachments', () => {
      it('should save attachments', () => {
        const jqFind = $.fn.find;
        sinon.stub($.fn, 'find');
        //@ts-ignore
        $.fn.find.callsFake(jqFind);

        $.fn.find
          //@ts-ignore
          .withArgs('input[type=file][name="/my-form/my_file"]')
          .returns([{ files: [{ type: 'image', foo: 'bar' }] }]);

        const content = loadXML('file-field');

        form.getDataStr.returns(content);

        return enketoFormMgr
          .save('my-form', form, () => Promise.resolve(true))
          .then(() => {
            expect(xmlServices.addAttachment.add.calledTwice);
            expect(dbBulkDocs.calledOnce);

            expect(xmlServices.addAttachment.add.args[0][1]).to.equal('user-file/my-form/my_file');
            expect(xmlServices.addAttachment.add.args[0][2]).to.deep.equal({ type: 'image', foo: 'bar' });
            expect(xmlServices.addAttachment.add.args[0][3]).to.equal('image');

            expect(xmlServices.addAttachment.remove.args[0][1]).to.equal('content');
            expect(globalActions.setSnackbarContent.notCalled);
          });
      });

      it('should throw exception if attachments are big', () => {
        translationServices.translateService.get.resolvesArg(0);

        const jqFind = $.fn.find;
        sinon.stub($.fn, 'find');
        //@ts-ignore
        $.fn.find.callsFake(jqFind);

        $.fn.find
          //@ts-ignore
          .withArgs('input[type=file][name="/my-form/my_file"]')
          .returns([{ files: [{ type: 'image', foo: 'bar' }] }]);

        const docsToStoreStub = sinon.stub().returns([
          { _id: '1a' },
          { _id: '1b', _attachments: {} },
          {
            _id: '1c',
            _attachments: {
              a_file: { data: { size: 10 * 1024 * 1024 } },
              b_file: { data: 'SSdtIGJhdG1hbg==' },
              c_file: { data: { size: 20 * 1024 * 1024 } },
            }
          },
          {
            _id: '1d',
            _attachments: {
              a_file: { content_type: 'image/png' }
            }
          }
        ]);
        $.fn.find
          //@ts-ignore
          .withArgs('[db-doc=true]')
          .returns({ map: sinon.stub().returns({ get: docsToStoreStub }) });

        const content = loadXML('file-field');
        form.getDataStr.returns(content);

        return enketoFormMgr
          .save('my-form', form, () => Promise.resolve(true))
          .then(() => expect.fail('Should have thrown exception.'))
          .catch(error => {
            expect(docsToStoreStub.calledOnce);
            expect(error.message).to.equal('enketo.error.max_attachment_size');
            expect(dbBulkDocs.notCalled);
            expect(xmlServices.addAttachment.add.notCalled);
            expect(globalActions.setSnackbarContent.calledOnce);
            expect(globalActions.setSnackbarContent.args[0]).to.have.members(['enketo.error.max_attachment_size']);
          });
      });

      it('should remove binary data from content', () => {
        const content = loadXML('binary-field');

        form.getDataStr.returns(content);
        return enketoFormMgr.save('my-form', form, () => Promise.resolve(true)).then(() => {
          expect(xmlServices.addAttachment.add.callCount).to.equal(1);

          expect(xmlServices.addAttachment.add.args[0][1]).to.equal('user-file/my-form/my_file');
          expect(xmlServices.addAttachment.add.args[0][2]).to.deep.equal('some image data');
          expect(xmlServices.addAttachment.add.args[0][3]).to.equal('image/png');

          expect(xmlServices.addAttachment.remove.args[0][1]).to.equal('content');
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
        const content = loadXML('deep-file-fields');

        form.getDataStr.returns(content);
        return enketoFormMgr.save('my-form-internal-id', form, () => Promise.resolve(true)).then(() => {
          expect(xmlServices.addAttachment.add.callCount).to.equal(2);

          expect(xmlServices.addAttachment.add.args[0][1]).to.equal('user-file/my-form-internal-id/my_file');
          expect(xmlServices.addAttachment.add.args[0][2]).to.deep.equal({ type: 'image', foo: 'bar' });
          expect(xmlServices.addAttachment.add.args[0][3]).to.equal('image');

          expect(xmlServices.addAttachment.add.args[1][1])
            .to.equal('user-file/my-form-internal-id/sub_element/sub_sub_element/other_file');
          expect(xmlServices.addAttachment.add.args[1][2]).to.deep.equal({ type: 'mytype', foo: 'baz' });
          expect(xmlServices.addAttachment.add.args[1][3]).to.equal('mytype');

          expect(xmlServices.addAttachment.remove.args[0][1]).to.equal('content');
        });
      });
    });

    it('should pass docs to transitions and save results', () => {
      const content =
        `<data xmlns:jr="http://openrosa.org/javarosa">
            <name>Sally</name>
            <lmp>10</lmp>           
            <repeat_doc db-doc="true" jr:template="">
              <type>repeater</type>
              <some_property>some_value_1</some_property>             
            </repeat_doc>
            <repeat_doc db-doc="true">
              <type>repeater</type>
              <some_property>some_value_2</some_property>             
            </repeat_doc>
            <repeat_doc db-doc="true">
              <type>repeater</type>
              <some_property>some_value_3</some_property>              
            </repeat_doc>
          </data>`;
      form.getDataStr.returns(content);

      const geoHandle = sinon.stub().resolves({ geo: 'data' });
      transitionsService.applyTransitions = sinon.stub().callsFake((docs) => {
        const clones = _.cloneDeep(docs); // cloning for clearer assertions, as the main array gets mutated
        clones.forEach(clone => clone.transitioned = true);
        clones.push({ _id: 'new doc', type: 'existent doc updated by the transition' });
        return Promise.resolve(clones);
      });

      return enketoFormMgr.save('V', form, geoHandle).then(actual => {
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(transitionsService.applyTransitions.callCount).to.equal(1);
        expect(contactServices.userContact.get.callCount).to.equal(1);

        expect(transitionsService.applyTransitions.args[0][0].length).to.equal(4);
        expect(transitionsService.applyTransitions.args[0][0])
          .excludingEvery(['_id', 'reported_date', 'timestamp'])
          .to.deep.equal([
            {
              contact: {},
              content_type: 'xml',
              fields: { name: 'Sally', lmp: '10', repeat_doc: { some_property: 'some_value_3', type: 'repeater' } },
              hidden_fields: ['repeat_doc'],
              form: 'V',
              from: '555',
              geolocation: { geo: 'data' },
              geolocation_log: [{ recording: { geo: 'data' } }],
              type: 'data_record',
            },
            {
              geolocation: { geo: 'data' },
              geolocation_log: [{ recording: { geo: 'data' } }],
              type: 'repeater',
              some_property: 'some_value_1',
            },
            {
              geolocation: { geo: 'data' },
              geolocation_log: [{ recording: { geo: 'data' } }],
              type: 'repeater',
              some_property: 'some_value_2',
            },
            {
              geolocation: { geo: 'data' },
              geolocation_log: [{ recording: { geo: 'data' } }],
              type: 'repeater',
              some_property: 'some_value_3',
            },
          ]);

        expect(actual.length).to.equal(5);
        expect(actual)
          .excludingEvery(['_id', 'reported_date', 'timestamp', '_rev'])
          .to.deep.equal([
            {
              contact: {},
              content_type: 'xml',
              fields: { name: 'Sally', lmp: '10', repeat_doc: { some_property: 'some_value_3', type: 'repeater' } },
              hidden_fields: ['repeat_doc'],
              form: 'V',
              from: '555',
              geolocation: { geo: 'data' },
              geolocation_log: [{ recording: { geo: 'data' } }],
              type: 'data_record',
              transitioned: true,
            },
            {
              geolocation: { geo: 'data' },
              geolocation_log: [{ recording: { geo: 'data' } }],
              type: 'repeater',
              some_property: 'some_value_1',
              transitioned: true,
            },
            {
              geolocation: { geo: 'data' },
              geolocation_log: [{ recording: { geo: 'data' } }],
              type: 'repeater',
              some_property: 'some_value_2',
              transitioned: true,
            },
            {
              geolocation: { geo: 'data' },
              geolocation_log: [{ recording: { geo: 'data' } }],
              type: 'repeater',
              some_property: 'some_value_3',
              transitioned: true,
            },
            {
              // docs that transitions push don't have geodata, this is intentional!
              type: 'existent doc updated by the transition',
            },
          ]);
      });
    });
  });

  describe('saveContactForm', () => {
    it('saves contact form and sets last changed doc', () => {
      const docId = '12345';
      const docType = 'doc-type';
      const savedDocs = {};
      const contactSave = sinon.stub().resolves(savedDocs);
      enketoFormMgr.contactSaver.save = contactSave;

      return enketoFormMgr
        .saveContactForm(form, docId, docType)
        .then((docs) => {
          expect(docs).to.deep.equal(savedDocs);
          expect(contactSave.callCount).to.equal(1);
          expect(contactSave.args).to.deep.equal([[form, docId, docType, undefined]]);
        });
    });
  });

  describe('renderContactForm', () => {
    let titleTextStub;

    beforeEach(() => {
      titleTextStub = sinon.stub();

      const jqFind = $.fn.find;
      sinon.stub($.fn, 'find');
      //@ts-ignore
      $.fn.find.callsFake(jqFind);

      $.fn.find
        //@ts-ignore
        .withArgs('#form-title')
        .returns({ text: titleTextStub });
      dbGetAttachment.resolves('<form/>');
      translationServices.translate.get.callsFake((key) => `translated key ${key}`);
      translationServices.translateFrom.get.callsFake((sentence) => `translated sentence ${sentence}`);
    });

    const callbackMock = () => {};
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

    it('should translate titleKey when provided', async() => {
      await enketoFormMgr.renderContactForm({
        selector: $('<div></div>'),
        formDoc,
        instanceData,
        editedListener: callbackMock,
        valuechangeListener: callbackMock,
        titleKey: 'contact.type.health_center.new',
      });

      expect(titleTextStub.callCount).to.be.equal(1);
      expect(titleTextStub.args[0][0]).to.be.equal('translated key contact.type.health_center.new');
    });

    it('should fallback to translate document title when the titleKey is not available', async() => {
      await enketoFormMgr.renderContactForm({
        selector: $('<div></div>'),
        formDoc,
        instanceData,
        editedListener: callbackMock,
        valuechangeListener: callbackMock,
      });

      expect(titleTextStub.callCount).to.be.equal(1);
      expect(titleTextStub.args[0][0]).to.be.equal('translated sentence New Area');
    });
  });

  describe('multimedia', () => {
    let pauseStubs;
    let $form;
    let $nextBtn;
    let $prevBtn;
    let originalJQueryFind;

    before(() => {
      $nextBtn = $('<button class="btn next-page"></button>');
      $prevBtn = $('<button class="btn previous-page"></button>');
      originalJQueryFind = $.fn.find;
    });

    beforeEach(() => {
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

    it('should pause the multimedia when going to the previous page', function(done) {
      $form.prepend('<video id="video"></video><audio id="audio"></audio>');

      // eslint-disable-next-line promise/catch-or-return
      enketoFormMgr
        .render($form, mockEnketoDoc('myform'))
        .then(() => {
          $prevBtn.trigger('click.pagemode');

          setTimeout(() => {
            expect(pauseStubs.video.calledOnce).to.be.true;
            expect(pauseStubs.audio.calledOnce).to.be.true;
            done();
          }, 0);
        });
    });

    it('should pause the multimedia when going to the next page', function(done) {
      form.pages._next.resolves(true);
      $form.prepend('<video id="video"></video><audio id="audio"></audio>');

      // eslint-disable-next-line promise/catch-or-return
      enketoFormMgr
        .render($form, mockEnketoDoc('myform'))
        .then(() => {
          $nextBtn.trigger('click.pagemode');

          setTimeout(() => {
            expect(pauseStubs.video.calledOnce).to.be.true;
            expect(pauseStubs.audio.calledOnce).to.be.true;
            done();
          }, 0);
        });
    });

    it('should not pause the multimedia when trying to go to the next page and form is invalid', function(done) {
      form.pages._next.resolves(false);
      $form.prepend('<video id="video"></video><audio id="audio"></audio>');

      // eslint-disable-next-line promise/catch-or-return
      enketoFormMgr
        .render($form, mockEnketoDoc('myform'))
        .then(() => {
          $nextBtn.trigger('click.pagemode');

          setTimeout(() => {
            expect(pauseStubs.video).to.be.undefined;
            expect(pauseStubs.audio).to.be.undefined;
            done();
          }, 0);
        });
    });
  });
});
