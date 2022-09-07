import { fakeAsync, flush, TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { provideMockStore } from '@ngrx/store/testing';
import * as _ from 'lodash-es';
import { toBik_text } from 'bikram-sambat';
import * as moment from 'moment';

import { DbService } from '@mm-services/db.service';
import { Form2smsService } from '@mm-services/form2sms.service';
import { SearchService } from '@mm-services/search.service';
import { SettingsService } from '@mm-services/settings.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { FileReaderService } from '@mm-services/file-reader.service';
import { UserContactService } from '@mm-services/user-contact.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { LanguageService } from '@mm-services/language.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { EnketoPrepopulationDataService } from '@mm-services/enketo-prepopulation-data.service';
import { AttachmentService } from '@mm-services/attachment.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { ZScoreService } from '@mm-services/z-score.service';
import { EnketoService } from '@mm-services/enketo.service';
import { ServicesActions } from '@mm-actions/services';
import { ContactSummaryService } from '@mm-services/contact-summary.service';
import { TransitionsService } from '@mm-services/transitions.service';
import { TranslateService } from '@mm-services/translate.service';
import { GlobalActions } from '@mm-actions/global';
import * as medicXpathExtensions from '../../../../src/js/enketo/medic-xpath-extensions';

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
  let setLastChangedDoc;

  let enketoInit;
  let dbGetAttachment;
  let dbGet;
  let dbBulkDocs;
  let ContactSummary;
  let Form2Sms;
  let UserContact;
  let UserSettings;
  let createObjectURL;
  let FileReader;
  let Language;
  let TranslateFrom;
  let form;
  let AddAttachment;
  let removeAttachment;
  let EnketoForm;
  let EnketoPrepopulationData;
  let Search;
  let LineageModelGenerator;
  let transitionsService;
  let translateService;
  let xmlFormGet;
  let xmlFormGetWithAttachment;
  let zScoreService;
  let zScoreUtil;
  let globalActions;

  beforeEach(() => {
    enketoInit = sinon.stub();
    dbGetAttachment = sinon.stub();
    dbGet = sinon.stub();
    dbBulkDocs = sinon.stub();
    ContactSummary = sinon.stub();
    Form2Sms = sinon.stub();
    UserContact = sinon.stub();
    UserSettings = sinon.stub();
    createObjectURL = sinon.stub();
    FileReader = { utf8: sinon.stub() };
    Language = sinon.stub();
    TranslateFrom = sinon.stub();
    form = {
      validate: sinon.stub(),
      getDataStr: sinon.stub(),
    };
    AddAttachment = sinon.stub();
    removeAttachment = sinon.stub();
    EnketoForm = sinon.stub();
    EnketoPrepopulationData = sinon.stub();
    Search = sinon.stub();
    LineageModelGenerator = { contact: sinon.stub() };
    xmlFormGet = sinon.stub().resolves({ _id: 'abc' });
    xmlFormGetWithAttachment = sinon.stub().resolves({ doc: { _id: 'abc', xml: '<form/>' } });
    window.EnketoForm = EnketoForm;
    window.URL.createObjectURL = createObjectURL;
    EnketoForm.returns({
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
    });
    transitionsService = { applyTransitions: sinon.stub().resolvesArg(0) };
    translateService = {
      instant: sinon.stub().returnsArg(0),
      get: sinon.stub(),
    };
    zScoreUtil = sinon.stub();
    zScoreService = { getScoreUtil: sinon.stub().resolves(zScoreUtil) };
    globalActions = { setSnackbarContent: sinon.stub(GlobalActions.prototype, 'setSnackbarContent') };
    setLastChangedDoc = sinon.stub(ServicesActions.prototype, 'setLastChangedDoc');

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        {
          provide: DbService,
          useValue: {
            get: () => ({ getAttachment: dbGetAttachment, get: dbGet, bulkDocs: dbBulkDocs })
          }
        },
        { provide: ContactSummaryService, useValue: { get: ContactSummary } },
        { provide: Form2smsService, useValue: { transform: Form2Sms } },
        { provide: SearchService, useValue: { search: Search } },
        { provide: SettingsService, useValue: { get: sinon.stub().resolves({}) } },
        { provide: LineageModelGeneratorService, useValue: LineageModelGenerator },
        { provide: FileReaderService, useValue: FileReader },
        { provide: UserContactService, useValue: { get: UserContact } },
        { provide: UserSettingsService, useValue: { get: UserSettings } },
        { provide: LanguageService, useValue: { get: Language } },
        { provide: TranslateFromService, useValue: { get: TranslateFrom } },
        { provide: EnketoPrepopulationDataService, useValue: { get: EnketoPrepopulationData } },
        { provide: AttachmentService, useValue: { add: AddAttachment, remove: removeAttachment } },
        {
          provide: XmlFormsService,
          useValue: {
            get: xmlFormGet,
            getDocAndFormAttachment: xmlFormGetWithAttachment
          }
        },
        { provide: ZScoreService, useValue: zScoreService },
        { provide: TransitionsService, useValue: transitionsService },
        { provide: TranslateService, useValue: translateService },
      ],
    });

    service = TestBed.inject(EnketoService);

    Language.resolves('en');
    TranslateFrom.returns('translated');
    window.CHTCore = {};
  });

  afterEach(() => {
    sinon.restore();
    delete window.CHTCore;
  });

  describe('init', () => {
    it('should init zscore and xpath extensions', async () => {
      sinon.stub(medicXpathExtensions, 'init');

      sinon.resetHistory();
      await service.init();

      expect(zScoreService.getScoreUtil.callCount).to.equal(1);
      expect(medicXpathExtensions.init.callCount).to.equal(1);
      expect(medicXpathExtensions.init.args[0]).to.deep.equal([zScoreUtil, toBik_text, moment]);
    });

    it('should catch errors', async () => {
      sinon.stub(medicXpathExtensions, 'init');
      zScoreService.getScoreUtil.rejects({ omg: 'error' });

      sinon.resetHistory();
      await service.init();

      expect(zScoreService.getScoreUtil.callCount).to.equal(1);
      expect(medicXpathExtensions.init.callCount).to.equal(0);
    });
  });

  describe('render', () => {

    it('renders error when user does not have associated contact', () => {
      UserContact.resolves();
      return service
        .render(null, 'not-defined')
        .then(() => {
          expect.fail('Should throw error');
        })
        .catch(actual => {
          expect(actual.message).to.equal('Your user does not have an associated contact, or does not have access ' +
            'to the associated contact. Talk to your administrator to correct this.');
          expect(actual.translationKey).to.equal('error.loading.form.no_contact');
        });
    });

    it('return error when form initialisation fails', () => {
      UserContact.resolves({ contact_id: '123' });
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      EnketoPrepopulationData.resolves('<xml></xml>');
      const expected = ['nope', 'still nope'];
      enketoInit.returns(expected);
      return service
        .render($('<div></div>'), mockEnketoDoc('myform'))
        .then(() => {
          expect.fail('Should throw error');
        })
        .catch(actual => {
          expect(enketoInit.callCount).to.equal(1);
          expect(actual.message).to.equal(JSON.stringify(expected));
        });
    });

    it('return form when everything works', () => {
      UserContact.resolves({ contact_id: '123' });
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      enketoInit.returns([]);
      FileReader.utf8.resolves('<some-blob name="xml"/>');
      EnketoPrepopulationData.resolves('<xml></xml>');
      return service.render($('<div></div>'), mockEnketoDoc('myform')).then(() => {
        expect(UserContact.callCount).to.equal(1);
        expect(EnketoPrepopulationData.callCount).to.equal(1);
        expect(FileReader.utf8.callCount).to.equal(2);
        expect(FileReader.utf8.args[0][0]).to.equal('<div>my form</div>');
        expect(FileReader.utf8.args[1][0]).to.equal(VISIT_MODEL);
        expect(enketoInit.callCount).to.equal(1);
        expect(dbGetAttachment.callCount).to.equal(2);
        expect(dbGetAttachment.args[0][0]).to.equal('form:myform');
        expect(dbGetAttachment.args[0][1]).to.equal('form.html');
        expect(dbGetAttachment.args[1][0]).to.equal('form:myform');
        expect(dbGetAttachment.args[1][1]).to.equal('model.xml');
      });
    });

    it('replaces img src with obj urls', async () => {
      UserContact.resolves({ contact_id: '123' });
      dbGetAttachment
        .onFirstCall().resolves('<div><img data-media-src="myimg"></div>')
        .onSecondCall().resolves(VISIT_MODEL)
        .onThirdCall().resolves('myobjblob');
      createObjectURL.returns('myobjurl');
      enketoInit.returns([]);
      FileReader.utf8
        .onFirstCall().resolves('<div><img data-media-src="myimg"></div>');
      EnketoPrepopulationData.resolves('<xml></xml>');
      const wrapper = $('<div><div class="container"></div><form></form></div>');
      await service.render(wrapper, mockEnketoDoc('myform'));
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

    it('leaves img wrapped and hides loader if failed to load', () => {
      const consoleErrorMock = sinon.stub(console, 'error');
      UserContact.resolves({ contact_id: '123' });
      dbGetAttachment
        .onFirstCall().resolves('<div><img data-media-src="myimg"></div>')
        .onSecondCall().resolves(VISIT_MODEL)
        .onThirdCall().rejects('not found');
      enketoInit.returns([]);
      FileReader.utf8
        .onFirstCall().resolves('<div><img data-media-src="myimg"></div>');
      EnketoPrepopulationData.resolves('<xml></xml>');
      const wrapper = $('<div><div class="container"></div><form></form></div>');
      return service.render(wrapper, mockEnketoDoc('myform')).then(() => {
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
    });

    it('passes users language to Enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({ contact_id: '123' });
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves('my model');
      enketoInit.returns([]);
      FileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves('my model');
      EnketoPrepopulationData.resolves(data);
      Language.resolves('sw');
      return service.render($('<div></div>'), mockEnketoDoc('myform'), data).then(() => {
        expect(Language.callCount).to.equal(1);
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][2].language).to.equal('sw');
      });
    });

    it('passes xml instance data through to Enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({ contact_id: '123' });
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves('my model');
      enketoInit.returns([]);
      FileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves('my model');
      EnketoPrepopulationData.resolves(data);
      return service.render($('<div></div>'), mockEnketoDoc('myform'), data).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].modelStr).to.equal('my model');
        expect(EnketoForm.args[0][1].instanceStr).to.equal(data);
      });
    });

    it('passes json instance data through to Enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      enketoInit.returns([]);
      FileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      EnketoPrepopulationData.resolves(data);
      const instanceData = {
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      return service.render($('<div></div>'), mockEnketoDoc('myform'), instanceData).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].modelStr).to.equal(VISIT_MODEL);
        expect(EnketoForm.args[0][1].instanceStr).to.equal(data);
      });
    });

    it('passes contact summary data to enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      enketoInit.returns([]);
      FileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      EnketoPrepopulationData.resolves(data);
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
      ContactSummary.resolves({ context: { pregnant: true } });
      Search.resolves([{ _id: 'somereport' }]);
      LineageModelGenerator.contact.resolves({ lineage: [{ _id: 'someparent' }] });
      return service.render($('<div></div>'), mockEnketoDoc('myform'), instanceData).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].external.length).to.equal(1);
        const summary = EnketoForm.args[0][1].external[0];
        expect(summary.id).to.equal('contact-summary');
        const xmlStr = new XMLSerializer().serializeToString(summary.xml);
        expect(xmlStr).to.equal('<context><pregnant>true</pregnant></context>');
        expect(Search.callCount).to.equal(1);
        expect(Search.args[0][0]).to.equal('reports');
        expect(Search.args[0][1].subjectIds).to.deep.equal(['fffff', '44509']);
        expect(LineageModelGenerator.contact.callCount).to.equal(1);
        expect(LineageModelGenerator.contact.args[0][0]).to.equal('fffff');
        expect(ContactSummary.callCount).to.equal(1);
        expect(ContactSummary.args[0][0]._id).to.equal('fffff');
        expect(ContactSummary.args[0][1].length).to.equal(1);
        expect(ContactSummary.args[0][1][0]._id).to.equal('somereport');
        expect(ContactSummary.args[0][2].length).to.equal(1);
        expect(ContactSummary.args[0][2][0]._id).to.equal('someparent');
      });
    });

    it('handles arrays and escaping characters', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      enketoInit.returns([]);
      FileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      EnketoPrepopulationData.resolves(data);
      const instanceData = {
        contact: {
          _id: 'fffff'
        },
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      ContactSummary.resolves({
        context: {
          pregnant: true,
          previousChildren: [{ dob: 2016 }, { dob: 2013 }, { dob: 2010 }],
          notes: `always <uses> reserved "characters" & 'words'`
        }
      });
      LineageModelGenerator.contact.resolves({ lineage: [] });
      return service.render($('<div></div>'), mockEnketoDoc('myform'), instanceData).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].external.length).to.equal(1);
        const summary = EnketoForm.args[0][1].external[0];
        expect(summary.id).to.equal('contact-summary');
        const xmlStr = new XMLSerializer().serializeToString(summary.xml);
        expect(xmlStr).to.equal('<context><pregnant>true</pregnant><previousChildren><dob>2016</dob>' +
          '<dob>2013</dob><dob>2010</dob></previousChildren><notes>always &lt;uses&gt; reserved "' +
          'characters" &amp; \'words\'</notes></context>');
        expect(ContactSummary.callCount).to.equal(1);
        expect(ContactSummary.args[0][0]._id).to.equal('fffff');
      });
    });

    it('does not get contact summary when the form has no instance for it', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      enketoInit.returns([]);
      FileReader.utf8.resolves('<some-blob name="xml"/>');
      EnketoPrepopulationData.resolves(data);
      const instanceData = {
        contact: {
          _id: 'fffff'
        },
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      return service.render($('<div></div>'), mockEnketoDoc('myform'), instanceData).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].external).to.equal(undefined);
        expect(ContactSummary.callCount).to.equal(0);
        expect(LineageModelGenerator.contact.callCount).to.equal(0);
      });
    });

    it('ContactSummary receives empty lineage if contact doc is missing', () => {
      const consoleWarnMock = sinon.stub(console, 'warn');
      LineageModelGenerator.contact.rejects({ code: 404 });

      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      enketoInit.returns([]);
      FileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      EnketoPrepopulationData.resolves('<data><patient_id>123</patient_id></data>');
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      const instanceData = {
        contact: {
          _id: 'fffff',
          patient_id: '44509'
        }
      };
      ContactSummary.resolves({ context: { pregnant: true } });
      Search.resolves([{ _id: 'somereport' }]);
      return service.render($('<div></div>'), mockEnketoDoc('myform'), instanceData).then(() => {
        expect(LineageModelGenerator.contact.callCount).to.equal(1);
        expect(LineageModelGenerator.contact.args[0][0]).to.equal('fffff');
        expect(ContactSummary.callCount).to.equal(1);
        expect(ContactSummary.args[0][2].length).to.equal(0);
        expect(consoleWarnMock.callCount).to.equal(1);
        expect(consoleWarnMock.args[0][0].startsWith('Enketo failed to get lineage of contact')).to.be.true;
      });
    });
  });

  describe('save', () => {

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
        .save('V', form)
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
      dbBulkDocs.callsFake(docs => Promise.resolve([{ ok: true, id: docs[0]._id, rev: '1-abc' }]));
      UserContact.resolves({ _id: '123', phone: '555' });
      UserSettings.resolves({ name: 'Jim' });
      return service.save('V', form).then(actual => {
        actual = actual[0];

        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);
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
        expect(AddAttachment.callCount).to.equal(0);
        expect(removeAttachment.callCount).to.equal(1);
        expect(removeAttachment.args[0]).excludingEvery('_rev').to.deep.equal([actual, 'content']);
      });
    });

    it('saves form version if found', () => {
      form.validate.resolves(true);
      const content = loadXML('sally-lmp');
      form.getDataStr.returns(content);
      dbBulkDocs.callsFake(docs => Promise.resolve([{ ok: true, id: docs[0]._id, rev: '1-abc' }]));
      xmlFormGetWithAttachment.resolves({
        doc: { _id: 'abc', xmlVersion: { time: '1', sha256: 'imahash' } },
        xml: '<form/>'
      });
      UserContact.resolves({ _id: '123', phone: '555' });
      UserSettings.resolves({ name: 'Jim' });
      return service.save('V', form).then(actual => {
        actual = actual[0];
        expect(actual.form_version).to.deep.equal({ time: '1', sha256: 'imahash' });
        expect(xmlFormGetWithAttachment.callCount).to.equal(1);
        expect(xmlFormGetWithAttachment.args[0][0]).to.equal('V');
      });
    });

    describe('Geolocation recording', () => {
      it('saves geolocation data into a new report', () => {
        form.validate.resolves(true);
        const content = loadXML('sally-lmp');
        form.getDataStr.returns(content);
        dbBulkDocs.callsFake(docs => Promise.resolve([{ ok: true, id: docs[0]._id, rev: '1-abc' }]));
        xmlFormGetWithAttachment.resolves({ doc: { _id: 'V' }, xml: '<form/>' });

        UserContact.resolves({ _id: '123', phone: '555' });
        UserSettings.resolves({ name: 'Jim' });
        const geoData = {
          latitude: 1,
          longitude: 2,
          altitude: 3,
          accuracy: 4,
          altitudeAccuracy: 5,
          heading: 6,
          speed: 7
        };
        return service.save('V', form, () => Promise.resolve(geoData)).then(actual => {
          actual = actual[0];

          expect(form.validate.callCount).to.equal(1);
          expect(form.getDataStr.callCount).to.equal(1);
          expect(dbBulkDocs.callCount).to.equal(1);
          expect(UserContact.callCount).to.equal(1);
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
          expect(AddAttachment.callCount).to.equal(0);
          expect(removeAttachment.callCount).to.equal(1);
        });
      });

      it('saves a geolocation error into a new report', () => {
        form.validate.resolves(true);
        const content = loadXML('sally-lmp');
        form.getDataStr.returns(content);
        dbBulkDocs.callsFake(docs => Promise.resolve([{ ok: true, id: docs[0]._id, rev: '1-abc' }]));
        xmlFormGetWithAttachment.resolves({ doc: { _id: 'V' }, xml: '<form/>' });
        UserContact.resolves({ _id: '123', phone: '555' });
        UserSettings.resolves({ name: 'Jim' });
        const geoError = {
          code: 42,
          message: 'some bad geo'
        };
        return service.save('V', form, () => Promise.reject(geoError)).then(actual => {
          actual = actual[0];

          expect(form.validate.callCount).to.equal(1);
          expect(form.getDataStr.callCount).to.equal(1);
          expect(dbBulkDocs.callCount).to.equal(1);
          expect(UserContact.callCount).to.equal(1);
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
          expect(AddAttachment.callCount).to.equal(0);
          expect(removeAttachment.callCount).to.equal(1);
        });
      });

      it('overwrites existing geolocation info on edit with new info and appends to the log', () => {
        form.validate.resolves(true);
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
        return service.save('V', form, () => Promise.resolve(geoData), '6').then(actual => {
          actual = actual[0];

          expect(form.validate.callCount).to.equal(1);
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
          expect(AddAttachment.callCount).to.equal(0);
          expect(removeAttachment.callCount).to.equal(1);
          expect(setLastChangedDoc.callCount).to.equal(1);
          expect(setLastChangedDoc.args[0]).to.deep.equal([actual]);
        });
      });
    });

    it('creates report with erroring geolocation', () => {
      form.validate.resolves(true);
      const content = loadXML('sally-lmp');
      form.getDataStr.returns(content);
      dbBulkDocs.callsFake(docs => Promise.resolve([{ ok: true, id: docs[0]._id, rev: '1-abc' }]));
      UserContact.resolves({ _id: '123', phone: '555' });
      UserSettings.resolves({ name: 'Jim' });
      const geoError = {
        code: 42,
        message: 'geolocation failed for some reason'
      };
      return service.save('V', form, () => Promise.reject(geoError)).then(actual => {
        actual = actual[0];

        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);
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
        expect(AddAttachment.callCount).to.equal(0);
        expect(removeAttachment.callCount).to.equal(1);
      });
    });

    it('creates report with hidden fields', () => {
      form.validate.resolves(true);
      const content = loadXML('hidden-field');
      form.getDataStr.returns(content);
      dbBulkDocs.resolves([{ ok: true, id: '(generated-in-service)', rev: '1-abc' }]);
      UserContact.resolves({ _id: '123', phone: '555' });
      return service.save('V', form, null, null).then(actual => {
        actual = actual[0];

        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);
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
        expect(setLastChangedDoc.callCount).to.equal(1);
        expect(setLastChangedDoc.args[0]).to.deep.equal([actual]);
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
      dbBulkDocs.resolves([{ ok: true, id: '6', rev: '2-abc' }]);
      return service.save('V', form, null, '6').then(actual => {
        actual = actual[0];

        expect(form.validate.callCount).to.equal(1);
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
        expect(AddAttachment.callCount).to.equal(0);
        expect(removeAttachment.callCount).to.equal(1);
        expect(removeAttachment.args[0]).excludingEvery('_rev').to.deep.equal([actual, 'content']);
        expect(setLastChangedDoc.callCount).to.equal(1);
        expect(setLastChangedDoc.args[0]).to.deep.equal([actual]);
      });
    });

    it('creates extra docs', () => {

      const startTime = Date.now() - 1;

      form.validate.resolves(true);
      const content = loadXML('extra-docs');
      form.getDataStr.returns(content);
      dbBulkDocs.callsFake(docs => {
        return Promise.resolve(docs.map(doc => {
          return { ok: true, id: doc._id, rev: `1-${doc._id}-abc` };
        }));
      });
      UserContact.resolves({ _id: '123', phone: '555' });

      return service.save('V', form, null, null).then(actual => {
        const endTime = Date.now() + 1;

        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);

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
        expect(actualThing1._rev).to.equal(`1-${actualThing1._id}-abc`);
        expect(actualThing1.reported_date).to.be.within(startTime, endTime);
        expect(actualThing1.some_property_1).to.equal('some_value_1');

        const actualThing2 = actual[2];
        expect(actualThing2._id).to.match(/(\w+-)\w+/);
        expect(actualThing2._rev).to.equal(`1-${actualThing2._id}-abc`);
        expect(actualThing2.reported_date).to.be.within(startTime, endTime);
        expect(actualThing2.some_property_2).to.equal('some_value_2');

        expect(_.uniq(_.map(actual, '_id')).length).to.equal(3);

        expect(setLastChangedDoc.callCount).to.equal(1);
        expect(setLastChangedDoc.args[0]).to.deep.equal([actualReport]);
      });
    });

    it('creates extra docs with geolocation', () => {

      const startTime = Date.now() - 1;

      form.validate.resolves(true);
      const content = loadXML('extra-docs');
      form.getDataStr.returns(content);
      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' }
      ]);
      UserContact.resolves({ _id: '123', phone: '555' });
      const geoData = {
        latitude: 1,
        longitude: 2,
        altitude: 3,
        accuracy: 4,
        altitudeAccuracy: 5,
        heading: 6,
        speed: 7
      };
      return service.save('V', form, () => Promise.resolve(geoData)).then(actual => {
        const endTime = Date.now() + 1;

        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);

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
      form.validate.resolves(true);
      const content = loadXML('extra-docs-with-references');
      form.getDataStr.returns(content);
      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' }
      ]);
      UserContact.resolves({ _id: '123', phone: '555' });

      return service.save('V', form).then(actual => {
        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);

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
      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' },
        { ok: true, id: '9', rev: '1-ghi' }
      ]);
      UserContact.resolves({ _id: '123', phone: '555' });
      return service.save('V', form).then(actual => {
        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);

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
      UserContact.resolves({ _id: '123', phone: '555' });
      return service.save('V', form).then(actual => {
        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);

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
      UserContact.resolves({ _id: '123', phone: '555' });
      return service.save('V', form).then(actual => {
        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);

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
      UserContact.resolves({ _id: '123', phone: '555' });
      return service.save('V', form).then(actual => {
        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);

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
      UserContact.resolves({ _id: '123', phone: '555' });
      return service.save('V', form).then(actual => {
        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);

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
      UserContact.resolves({ _id: '123', phone: '555' });
      return service.save('V', form).then(actual => {
        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);

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
      UserContact.resolves({ _id: '123', phone: '555' });
      return service.save('V', form).then(actual => {
        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);

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
      UserContact.resolves({ _id: '123', phone: '555' });
      return service.save('V', form).then(actual => {
        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);

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
      UserContact.resolves({ _id: '123', phone: '555' });
      return service.save('V', form).then(actual => {
        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);

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

        form.validate.resolves(true);
        const content = loadXML('file-field');

        form.getDataStr.returns(content);
        dbGetAttachment.resolves('<form/>');
        UserContact.resolves({ _id: 'my-user', phone: '8989' });
        dbBulkDocs.callsFake(docs => Promise.resolve([{ ok: true, id: docs[0]._id, rev: '1-abc' }]));
        // @ts-ignore
        const saveDocsSpy = sinon.spy(EnketoService.prototype, 'saveDocs');

        return service
          .save('my-form', form, () => Promise.resolve(true))
          .then(() => {
            expect(AddAttachment.calledOnce);
            expect(saveDocsSpy.calledOnce);

            expect(AddAttachment.args[0][1]).to.equal('user-file/my-form/my_file');
            expect(AddAttachment.args[0][2]).to.deep.equal({ type: 'image', foo: 'bar' });
            expect(AddAttachment.args[0][3]).to.equal('image');

            expect(globalActions.setSnackbarContent.notCalled);
          });
      });

      it('should throw exception if attachments are big', () => {
        translateService.get.returnsArg(0);
        form.validate.resolves(true);
        dbGetAttachment.resolves('<form/>');
        UserContact.resolves({ _id: 'my-user', phone: '8989' });
        // @ts-ignore
        const saveDocsStub = sinon.stub(EnketoService.prototype, 'saveDocs');
        // @ts-ignore
        const xmlToDocsStub = sinon.stub(EnketoService.prototype, 'xmlToDocs').resolves([
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

        return service
          .save('my-form', form, () => Promise.resolve(true))
          .then(() => expect.fail('Should have thrown exception.'))
          .catch(error => {
            expect(xmlToDocsStub.calledOnce);
            expect(error.message).to.equal('enketo.error.max_attachment_size');
            expect(saveDocsStub.notCalled);
            expect(globalActions.setSnackbarContent.calledOnce);
            expect(globalActions.setSnackbarContent.args[0]).to.have.members(['enketo.error.max_attachment_size']);
          });
      });

      it('should remove binary data from content', () => {
        form.validate.resolves(true);
        const content = loadXML('binary-field');

        form.getDataStr.returns(content);
        dbGetAttachment.resolves('<form/>');
        UserContact.resolves({ _id: 'my-user', phone: '8989' });
        dbBulkDocs.callsFake(docs => Promise.resolve([{ ok: true, id: docs[0]._id, rev: '1-abc' }]));
        return service.save('my-form', form, () => Promise.resolve(true)).then(() => {
          expect(dbBulkDocs.args[0][0][0].fields).to.deep.equal({
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
        UserContact.resolves({ _id: 'my-user', phone: '8989' });
        dbBulkDocs.callsFake(docs => Promise.resolve([{ ok: true, id: docs[0]._id, rev: '1-abc' }]));
        return service.save('my-form-internal-id', form, () => Promise.resolve(true)).then(() => {
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

      it('should pass docs to transitions and save results', () => {
        form.validate.resolves(true);
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

        dbBulkDocs.callsFake(docs => Promise.resolve(docs.map(doc => ({
          ok: true, id: doc._id, rev: '2'
        }))));
        UserContact.resolves({ _id: '123', phone: '555' });
        const geoHandle = sinon.stub().resolves({ geo: 'data' });
        transitionsService.applyTransitions.callsFake((docs) => {
          const clones = _.cloneDeep(docs); // cloning for clearer assertions, as the main array gets mutated
          clones.forEach(clone => clone.transitioned = true);
          clones.push({ _id: 'new doc', type: 'existent doc updated by the transition' });
          return Promise.resolve(clones);
        });
        xmlFormGetWithAttachment.resolves({
          doc: { _id: 'abc', xmlVersion: { time: '1', sha256: 'imahash' } },
          xml: `<form><repeat nodeset="/data/repeat_doc"></repeat></form>`
        });

        return service.save('V', form, geoHandle).then(actual => {
          expect(form.validate.callCount).to.equal(1);
          expect(form.getDataStr.callCount).to.equal(1);
          expect(dbBulkDocs.callCount).to.equal(1);
          expect(transitionsService.applyTransitions.callCount).to.equal(1);
          expect(UserContact.callCount).to.equal(1);

          expect(transitionsService.applyTransitions.args[0][0].length).to.equal(4);
          expect(transitionsService.applyTransitions.args[0][0])
            .excludingEvery(['_id', 'reported_date', 'timestamp'])
            .to.deep.equal([
              {
                contact: {},
                content_type: 'xml',
                fields: {
                  name: 'Sally', lmp: '10',
                  repeat_doc: [
                    {
                      type: 'repeater',
                      some_property: 'some_value_1',
                    },
                    {
                      type: 'repeater',
                      some_property: 'some_value_2',
                    },
                    {
                      type: 'repeater',
                      some_property: 'some_value_3',
                    },
                  ],
                },
                hidden_fields: ['repeat_doc'],
                form: 'V',
                form_version: { time: '1', sha256: 'imahash' },
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
                fields: {
                  name: 'Sally', lmp: '10',
                  repeat_doc: [
                    {
                      type: 'repeater',
                      some_property: 'some_value_1',
                    },
                    {
                      type: 'repeater',
                      some_property: 'some_value_2',
                    },
                    {
                      type: 'repeater',
                      some_property: 'some_value_3',
                    },
                  ],
                },
                hidden_fields: ['repeat_doc'],
                form: 'V',
                form_version: { time: '1', sha256: 'imahash' },
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

      describe('renderContactForm', () => {
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
          await service.renderContactForm({
            selector: $('<div></div>'),
            formDoc,
            instanceData,
            editedListener: callbackMock,
            valuechangeListener: callbackMock,
            titleKey: 'contact.type.health_center.new',
          });

          expect(service.setFormTitle.callCount).to.be.equal(1);
          expect(service.setFormTitle.args[0][1]).to.be.equal('translated key contact.type.health_center.new');
        });

        it('should fallback to translate document title when the titleKey is not available', async () => {
          await service.renderContactForm({
            selector: $('<div></div>'),
            formDoc,
            instanceData,
            editedListener: callbackMock,
            valuechangeListener: callbackMock,
          });

          expect(service.setFormTitle.callCount).to.be.equal(1);
          expect(service.setFormTitle.args[0][1]).to.be.equal('translated sentence New Area');
        });
      });
    });
  });

  describe('multimedia', () => {
    let overrideNavigationButtonsStub;
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
      overrideNavigationButtonsStub = sinon
        .stub(EnketoService.prototype, <any>'overrideNavigationButtons')
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
      overrideNavigationButtonsStub.call(service, form, $form);

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
      overrideNavigationButtonsStub.call(service, form, $form);

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
      overrideNavigationButtonsStub.call(service, form, $form);

      $nextBtn.trigger('click.pagemode');
      flush();

      expect(pauseStubs.video).to.be.undefined;
      expect(pauseStubs.audio).to.be.undefined;
    }));

    xit('should not call pause function when there isnt video and audio in the form wrapper', fakeAsync(() => {
      overrideNavigationButtonsStub.call(service, form, $form);

      $prevBtn.trigger('click.pagemode');
      $nextBtn.trigger('click.pagemode');
      flush();

      expect(pauseStubs.video).to.be.undefined;
      expect(pauseStubs.audio).to.be.undefined;
    }));
  });
});
