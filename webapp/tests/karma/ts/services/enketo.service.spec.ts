import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { provideMockStore } from '@ngrx/store/testing';
import { toBik_text } from 'bikram-sambat';
import * as moment from 'moment';

import { DbService } from '@mm-services/db.service';
import { Form2smsService } from '@mm-services/form2sms.service';
import { SearchService } from '@mm-services/search.service';
import { SettingsService } from '@mm-services/settings.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { FileReaderService } from '@mm-services/file-reader.service';
import { UserContactService } from '@mm-services/user-contact.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { LanguageService } from '@mm-services/language.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { AttachmentService } from '@mm-services/attachment.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { ZScoreService } from '@mm-services/z-score.service';
import { EnketoService } from '@mm-services/enketo.service';
import { ServicesActions } from '@mm-actions/services';
import { ContactSummaryService } from '@mm-services/contact-summary.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { TransitionsService } from '@mm-services/transitions.service';
import { TranslateService } from '@mm-services/translate.service';
import * as medicXpathExtensions from '../../../../src/js/enketo/medic-xpath-extensions';
import EnketoDataTranslator from '../../../../src/js/enketo/enketo-data-translator';

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
  let Search;
  let LineageModelGenerator;
  let contactTypesService;
  let extractLineageService;
  let transitionsService;
  let translateService;
  let xmlFormGet;
  let xmlFormGetWithAttachment;
  let zScoreService;
  let zScoreUtil;

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
        setAll: () => {},
        $formLanguages: $('<select><option value="en">en</option></select>'),
      },
      calc: { update: () => {} },
      output: { update: () => {} },
    });
    contactTypesService = { isHardcodedType: sinon.stub().returns(false) };
    extractLineageService = { extract: sinon.stub() };
    transitionsService = { applyTransitions: sinon.stub().resolvesArg(0) };
    translateService = {
      instant: sinon.stub().returnsArg(0),
      get: sinon.stub(),
    };
    zScoreUtil = sinon.stub();
    zScoreService = { getScoreUtil: sinon.stub().resolves(zScoreUtil) };
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
        { provide: ContactTypesService, useValue: contactTypesService },
        { provide: ExtractLineageService, useValue: extractLineageService },
        { provide: FileReaderService, useValue: FileReader },
        { provide: UserContactService, useValue: { get: UserContact } },
        { provide: UserSettingsService, useValue: { get: UserSettings } },
        { provide: LanguageService, useValue: { get: Language } },
        { provide: TranslateFromService, useValue: { get: TranslateFrom } },
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

    it('return form when everything works', () => {
      UserContact.resolves({ contact_id: '123' });
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      enketoInit.returns([]);
      FileReader.utf8.resolves('<model><instance><some-blob name="xml"/></instance></model>');
      UserSettings.resolves({ name: 'Jim' });
      return service.render($('<div></div>'), mockEnketoDoc('myform')).then(() => {
        expect(UserContact.callCount).to.equal(1);
        expect(UserSettings.callCount).to.equal(1);
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
  });

  describe('save', () => {

    it('creates report', () => {
      form.validate.resolves(true);
      const content = loadXML('sally-lmp');
      form.getDataStr.returns(content);
      dbBulkDocs.callsFake(docs => Promise.resolve([ { ok: true, id: docs[0]._id, rev: '1-abc' } ]));
      dbGetAttachment.resolves('<form/>');
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
        // expect(actual.contact._id).to.equal('123');
        expect(actual.from).to.equal('555');
        expect(xmlFormGetWithAttachment.callCount).to.equal(1);
        expect(xmlFormGetWithAttachment.args[0][0]).to.equal('V');
        expect(AddAttachment.callCount).to.equal(1);
        expect(AddAttachment.args[0][0]._id).to.equal(actual._id);
        expect(AddAttachment.args[0][1]).to.equal('content');
        expect(AddAttachment.args[0][2]).to.equal(content.replace(/\n$/, ''));
        expect(AddAttachment.args[0][3]).to.equal('application/xml');
        expect(setLastChangedDoc.callCount).to.equal(1);
        expect(setLastChangedDoc.args[0]).to.deep.equal([actual]);
      });
    });
  });

  describe('saveContactForm', () => {
    it('saves contact form and sets last changed doc', () => {
      form.getDataStr.returns('<data></data>');
      const type = 'some-contact-type';

      sinon.stub(EnketoDataTranslator, 'contactRecordToJs').returns({
        doc: { _id: 'main1', type: 'main', contact: 'abc' }
      });

      dbBulkDocs.resolves([]);
      dbGet.resolves({ _id: 'abc', name: 'gareth', parent: { _id: 'def' } });
      extractLineageService.extract.returns({ _id: 'abc', parent: { _id: 'def' } });

      return service
        .saveContactForm(form, null, type)
        .then(() => {
          expect(dbGet.callCount).to.equal(1);
          expect(dbGet.args[0][0]).to.equal('abc');

          expect(dbBulkDocs.callCount).to.equal(1);

          const savedDocs = dbBulkDocs.args[0][0];

          expect(savedDocs.length).to.equal(1);
          expect(savedDocs[0].contact).to.deep.equal({
            _id: 'abc',
            parent: {
              _id: 'def'
            }
          });
          expect(setLastChangedDoc.callCount).to.equal(1);
          expect(setLastChangedDoc.args[0]).to.deep.equal([savedDocs[0]]);
        });
    });
  });
});
