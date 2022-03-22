import { TestBed } from '@angular/core/testing';
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
import { AddAttachmentService } from '@mm-services/add-attachment.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { ZScoreService } from '@mm-services/z-score.service';
import { EnketoService } from '@mm-services/enketo.service';
import { ServicesActions } from '@mm-actions/services';
import { ContactSummaryService } from '@mm-services/contact-summary.service';
import { TransitionsService } from '@mm-services/transitions.service';
import { TranslateService } from '@mm-services/translate.service';
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
  let EnketoForm;
  let Search;
  let LineageModelGenerator;
  let transitionsService;
  let translateService;
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
    EnketoForm = sinon.stub();
    Search = sinon.stub();
    LineageModelGenerator = { contact: sinon.stub() };
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
        { provide: FileReaderService, useValue: FileReader },
        { provide: UserContactService, useValue: { get: UserContact } },
        { provide: UserSettingsService, useValue: { get: UserSettings } },
        { provide: LanguageService, useValue: { get: Language } },
        { provide: TranslateFromService, useValue: { get: TranslateFrom } },
        { provide: AddAttachmentService, useValue: { add: AddAttachment } },
        {
          provide: XmlFormsService,
          useValue: {
            get: sinon.stub().resolves({ _id: 'abc' }),
            findXFormAttachmentName: sinon.stub().resolves('mydoc')
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

    it('rejects on invalid form', done => {
      form.validate.resolves(false);
      service.save('V', form).catch(actual => {
        expect(actual.message).to.equal('Form is invalid');
        expect(form.validate.callCount).to.equal(1);
        done();
      });
    });

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
        expect(actual.contact._id).to.equal('123');
        expect(actual.from).to.equal('555');
        expect(dbGetAttachment.callCount).to.equal(1);
        expect(dbGetAttachment.args[0][0]).to.equal('abc');
        expect(AddAttachment.callCount).to.equal(1);
        expect(AddAttachment.args[0][0]._id).to.equal(actual._id);
        expect(AddAttachment.args[0][1]).to.equal('content');
        expect(AddAttachment.args[0][2]).to.equal(content.replace(/\n$/, ''));
        expect(AddAttachment.args[0][3]).to.equal('application/xml');
      });
    });

    describe('Geolocation recording', () => {
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
        dbBulkDocs.resolves([ { ok: true, id: '6', rev: '2-abc' } ]);
        dbGetAttachment.resolves('<form/>');
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

    it('creates report with hidden fields', () => {
      form.validate.resolves(true);
      const content = loadXML('hidden-field');
      form.getDataStr.returns(content);
      dbBulkDocs.resolves([ { ok: true, id: '(generated-in-service)', rev: '1-abc' } ]);
      dbGetAttachment.resolves('<form/>');
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
        expect(actual.hidden_fields).to.deep.equal([ 'secret_code_name' ]);
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
      dbBulkDocs.resolves([ { ok: true, id: '6', rev: '2-abc' } ]);
      dbGetAttachment.resolves('<form/>');
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
        expect(AddAttachment.callCount).to.equal(1);
        expect(AddAttachment.args[0][0]._id).to.equal(actual._id);
        expect(AddAttachment.args[0][1]).to.equal('content');
        expect(AddAttachment.args[0][2]).to.equal(content.replace(/\n$/, ''));
        expect(AddAttachment.args[0][3]).to.equal('application/xml');
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
      dbGetAttachment.resolves('<form/>');
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
        expect(actualReport.hidden_fields).to.deep.equal([ 'secret_code_name' ]);

        expect(actualReport.fields.doc1).to.equal(undefined);
        expect(actualReport.fields.doc2).to.equal(undefined);

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

    it('creates extra docs with references', () => {
      form.validate.resolves(true);
      const content = loadXML('extra-docs-with-references');
      form.getDataStr.returns(content);
      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' }
      ]);
      dbGetAttachment.resolves('<form/>');
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
        expect(actualReport.hidden_fields).to.deep.equal([ 'secret_code_name' ]);

        expect(actualReport.fields.doc1).to.equal(undefined);
        expect(actualReport.fields.doc2).to.equal(undefined);

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
      dbGetAttachment.resolves('<form/>');
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
        expect(actualReport.hidden_fields).to.deep.equal([ 'secret_code_name' ]);

        for (let i=1; i<=3; ++i) {
          const repeatDocN = actual[i];
          expect(repeatDocN._id).to.match(/(\w+-)\w+/);
          expect(repeatDocN.my_parent).to.equal(reportId);
          expect(repeatDocN.some_property).to.equal('some_value_'+i);
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
      dbGetAttachment.resolves(`<form/>`);
      FileReader.utf8.resolves(`
        <data>
          <repeat nodeset="/data/repeat_section"></repeat>
        </data>
      `);
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
      dbGetAttachment.resolves(`<form/>`);
      FileReader.utf8.resolves(`
        <data>
          <repeat nodeset="/data/repeat_section"></repeat>
        </data>
      `);
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
      dbGetAttachment.resolves(`<form/>`);
      FileReader.utf8.resolves(`
        <data>
          <repeat nodeset="/data/repeat_section"></repeat>
        </data>
      `);
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
      dbGetAttachment.resolves(`<form/>`);
      FileReader.utf8.resolves(`
        <data>
          <repeat nodeset="/data/repeat_section"></repeat>
        </data>
      `);
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
      dbGetAttachment.resolves(`<form/>`);
      FileReader.utf8.resolves(`
        <data>
          <repeat nodeset="/data/repeat_section"></repeat>
        </data>
      `);
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
      dbGetAttachment.resolves(`<form/>`);
      FileReader.utf8.resolves(`
        <data>
          <repeat nodeset="/data/repeat_section"></repeat>
        </data>
      `);
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
      dbGetAttachment.resolves(`<form/>`);
      FileReader.utf8.resolves(`
        <data>
          <repeat nodeset="/data/repeat_section"></repeat>
        </data>
      `);
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
          'fields.repeat_doc_ref' : actual[1]._id, // this ref is outside any repeat
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
      dbGetAttachment.resolves(`<form/>`);
      FileReader.utf8.resolves(`
        <data>
          <repeat nodeset="/data/repeat_section"></repeat>
        </data>
      `);
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

      dbBulkDocs.callsFake(docs => Promise.resolve(docs.map(doc => ({ ok: true, id: doc._id, rev: '1' }))));
      dbGetAttachment.resolves('<form/>');
      UserContact.resolves({ _id: '123', phone: '555' });
      const geoHandle = sinon.stub().resolves({ geo: 'data' });
      transitionsService.applyTransitions.callsFake((docs) => {
        const clones = _.cloneDeep(docs); // cloning for clearer assertions, as the main array gets mutated
        clones.forEach(clone => clone.transitioned = true);
        clones.push({ _id: 'new doc', type: 'existent doc updated by the transition' });
        return Promise.resolve(clones);
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
              fields: { name: 'Sally', lmp: '10' },
              hidden_fields: [],
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
              fields: { name: 'Sally', lmp: '10' },
              hidden_fields: [],
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
});
