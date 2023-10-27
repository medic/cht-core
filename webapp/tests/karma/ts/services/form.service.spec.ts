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
import { TranslateFromService } from '@mm-services/translate-from.service';
import { EnketoPrepopulationDataService } from '@mm-services/enketo-prepopulation-data.service';
import { AttachmentService } from '@mm-services/attachment.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { ZScoreService } from '@mm-services/z-score.service';
import { FormService } from '@mm-services/form.service';
import { ServicesActions } from '@mm-actions/services';
import { ContactSummaryService } from '@mm-services/contact-summary.service';
import { TransitionsService } from '@mm-services/transitions.service';
import { TranslateService } from '@mm-services/translate.service';
import { GlobalActions } from '@mm-actions/global';
import { FeedbackService } from '@mm-services/feedback.service';
import * as medicXpathExtensions from '../../../../src/js/enketo/medic-xpath-extensions';
import { CHTScriptApiService } from '@mm-services/cht-script-api.service';
import { TrainingCardsService } from '@mm-services/training-cards.service';
import { EnketoService, EnketoFormContext } from '@mm-services/enketo.service';

describe('Form service', () => {
  // return a mock form ready for putting in #dbContent
  const mockEnketoDoc = formInternalId => {
    return {
      _id: `form:${formInternalId}`,
      internalId: formInternalId,
      _attachments: {
        xml: { something: true },
        'form.html': { something: true },
        'model.xml': { something: true },
      },
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
  let xmlFormsService;
  let xmlFormGet;
  let xmlFormGetWithAttachment;
  let zScoreService;
  let zScoreUtil;
  let chtScriptApiService;
  let chtScriptApi;
  let globalActions;
  let trainingCardsService;
  let consoleErrorMock;
  let consoleWarnMock;
  let feedbackService;

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
    Search = sinon.stub();
    LineageModelGenerator = { contact: sinon.stub() };
    xmlFormGet = sinon.stub().resolves({ _id: 'abc' });
    xmlFormGetWithAttachment = sinon.stub().resolves({ doc: { _id: 'abc', xml: '<form/>' } });
    xmlFormsService = {
      get: xmlFormGet,
      getDocAndFormAttachment: xmlFormGetWithAttachment,
      canAccessForm: sinon.stub(),
      HTML_ATTACHMENT_NAME: 'form.html',
      MODEL_ATTACHMENT_NAME: 'model.xml',
    };
    window.EnketoForm = EnketoForm;
    window.URL.createObjectURL = createObjectURL;
    EnketoForm.returns(form);
    transitionsService = { applyTransitions: sinon.stub().resolvesArg(0) };
    translateService = {
      instant: sinon.stub().returnsArg(0),
      get: sinon.stub(),
    };
    zScoreUtil = sinon.stub();
    zScoreService = { getScoreUtil: sinon.stub().resolves(zScoreUtil) };
    chtScriptApi = sinon.stub();
    chtScriptApiService = { getApi: sinon.stub().resolves(chtScriptApi) };
    globalActions = { setSnackbarContent: sinon.stub(GlobalActions.prototype, 'setSnackbarContent') };
    setLastChangedDoc = sinon.stub(ServicesActions.prototype, 'setLastChangedDoc');
    trainingCardsService = {
      isTrainingCardForm: sinon.stub(),
      getTrainingCardDocId: sinon.stub(),
    };
    consoleErrorMock = sinon.stub(console, 'error');
    consoleWarnMock = sinon.stub(console, 'warn');
    feedbackService = { submit: sinon.stub() };

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
        { provide: UserSettingsService, useValue: { getWithLanguage: UserSettings } },
        { provide: TranslateFromService, useValue: { get: TranslateFrom } },
        { provide: EnketoPrepopulationDataService, useValue: { get: EnketoPrepopulationData } },
        { provide: AttachmentService, useValue: { add: AddAttachment, remove: removeAttachment } },
        { provide: XmlFormsService, useValue: xmlFormsService },
        { provide: ZScoreService, useValue: zScoreService },
        { provide: CHTScriptApiService, useValue: chtScriptApiService },
        { provide: TransitionsService, useValue: transitionsService },
        { provide: TranslateService, useValue: translateService },
        { provide: TrainingCardsService, useValue: trainingCardsService },
        { provide: FeedbackService, useValue: feedbackService },
      ],
    });

    UserSettings.resolves({ name: 'Jim', language: 'en' });
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

      service = TestBed.inject(FormService);
      await service.init();

      expect(zScoreService.getScoreUtil.callCount).to.equal(1);
      expect(chtScriptApiService.getApi.callCount).to.equal(1);
      expect(medicXpathExtensions.init.callCount).to.equal(1);
      expect(medicXpathExtensions.init.args[0]).to.deep.equal([zScoreUtil, toBik_text, moment, chtScriptApi]);
    });

    it('should catch errors', async () => {
      sinon.stub(medicXpathExtensions, 'init');
      zScoreService.getScoreUtil.rejects({ omg: 'error' });

      service = TestBed.inject(FormService);
      await service.init();

      expect(zScoreService.getScoreUtil.callCount).to.equal(1);
      expect(medicXpathExtensions.init.callCount).to.equal(0);
    });
  });

  describe('render', () => {

    beforeEach(async () => {
      sinon.stub(medicXpathExtensions, 'init');
      service = TestBed.inject(FormService);
      await service.init();
    });

    it('renders error when user does not have associated contact', () => {
      UserContact.resolves();
      return service
        .render(new EnketoFormContext('#', 'report', { }))
        .then(() => {
          expect.fail('Should throw error');
        })
        .catch(actual => {
          expect(actual.message).to.equal('Your user does not have an associated contact, or does not have access ' +
            'to the associated contact. Talk to your administrator to correct this.');
          expect(actual.translationKey).to.equal('error.loading.form.no_contact');
        });
    });

    it('return error when form initialisation fails', fakeAsync(async () => {
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      FileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      UserContact.resolves({ contact_id: '123-user-contact' });
      xmlFormsService.canAccessForm.resolves(true);

      ContactSummary.resolves({ context: { pregnant: false } });
      Search.resolves([{ _id: 'some_report' }]);
      LineageModelGenerator.contact.resolves({ lineage: [{ _id: 'some_parent' }] });
      const instanceData = { contact: { _id: '123-patient-contact'} };

      EnketoPrepopulationData.resolves('<xml></xml>');
      const expectedErrorTitle = `Failed during the form "myform" rendering : `;
      const expectedErrorDetail = [ 'nope', 'still nope' ];
      const expectedErrorMessage = expectedErrorTitle + JSON.stringify(expectedErrorDetail);
      enketoInit.returns(expectedErrorDetail);

      const formContext = new EnketoFormContext('#div', 'report', mockEnketoDoc('myform'), instanceData);

      try {
        await service.render(formContext);
        flush();
        expect.fail('Should throw error');
      } catch (error) {
        expect(UserContact.calledOnce).to.be.true;
        expect(xmlFormsService.canAccessForm.calledOnce).to.be.true;
        expect(xmlFormsService.canAccessForm.args[0]).to.have.deep.members([
          {
            _attachments: {
              xml: { something: true },
              'model.xml': { something: true },
              'form.html': { something: true },
            },
            _id: 'form:myform',
            internalId: 'myform',
          },
          { contact_id: '123-user-contact' },
          { doc: { _id: '123-patient-contact' }, contactSummary: { pregnant: false }, shouldEvaluateExpression: true },
        ]);
        expect(enketoInit.callCount).to.equal(1);
        expect(error.message).to.equal(expectedErrorMessage);
        expect(consoleErrorMock.callCount).to.equal(0);
      }
    }));

    it('return form when everything works', () => {
      expect(form.editStatus).to.be.undefined;
      UserContact.resolves({ contact_id: '123' });
      xmlFormsService.canAccessForm.resolves(true);
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      enketoInit.returns([]);
      FileReader.utf8.resolves('<some-blob name="xml"/>');
      EnketoPrepopulationData.resolves('<xml></xml>');
      return service.render(new EnketoFormContext('#div', 'task', mockEnketoDoc('myform'))).then(() => {
        expect(UserContact.callCount).to.equal(1);
        expect(EnketoPrepopulationData.callCount).to.equal(1);
        expect(FileReader.utf8.callCount).to.equal(2);
        expect(FileReader.utf8.args[0][0]).to.equal('<div>my form</div>');
        expect(FileReader.utf8.args[1][0]).to.equal(VISIT_MODEL);
        expect(enketoInit.callCount).to.equal(1);
        expect(form.editStatus).to.equal(false);
        expect(dbGetAttachment.callCount).to.equal(2);
        expect(dbGetAttachment.args[0][0]).to.equal('form:myform');
        expect(dbGetAttachment.args[0][1]).to.equal('form.html');
        expect(dbGetAttachment.args[1][0]).to.equal('form:myform');
        expect(dbGetAttachment.args[1][1]).to.equal('model.xml');
      });
    });

    it('passes xml instance data through to Enketo', () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({ contact_id: '123' });
      xmlFormsService.canAccessForm.resolves(true);
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves('my model');
      enketoInit.returns([]);
      FileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves('my model');
      EnketoPrepopulationData.resolves(data);
      const formContext = new EnketoFormContext('div', 'report', mockEnketoDoc('myform'), data);
      return service.render(formContext).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].modelStr).to.equal('my model');
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
      xmlFormsService.canAccessForm.resolves(true);
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
      const formContext = new EnketoFormContext('div', 'report', mockEnketoDoc('myform'), instanceData);
      return service.render(formContext).then(() => {
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
      xmlFormsService.canAccessForm.resolves(true);
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
      const formContext = new EnketoFormContext('div', 'report', mockEnketoDoc('myform'), instanceData);
      return service.render(formContext).then(() => {
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
      xmlFormsService.canAccessForm.resolves(true);
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
      const formContext = new EnketoFormContext('div', 'report', mockEnketoDoc('myform'), instanceData);
      return service.render(formContext).then(() => {
        expect(EnketoForm.callCount).to.equal(1);
        expect(EnketoForm.args[0][1].external).to.equal(undefined);
        expect(ContactSummary.callCount).to.equal(0);
        expect(LineageModelGenerator.contact.callCount).to.equal(0);
      });
    });

    it('ContactSummary receives empty lineage if contact doc is missing', () => {
      LineageModelGenerator.contact.rejects({ code: 404 });

      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      xmlFormsService.canAccessForm.resolves(true);
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
      const formContext = new EnketoFormContext('div', 'report',  mockEnketoDoc('myform'), instanceData);
      return service.render(formContext).then(() => {
        expect(LineageModelGenerator.contact.callCount).to.equal(1);
        expect(LineageModelGenerator.contact.args[0][0]).to.equal('fffff');
        expect(ContactSummary.callCount).to.equal(1);
        expect(ContactSummary.args[0][2].length).to.equal(0);
        expect(consoleWarnMock.callCount).to.equal(1);
        expect(consoleWarnMock.args[0][0].startsWith('Enketo failed to get lineage of contact')).to.be.true;
      });
    });

    it('should execute the unload process before rendering the second form', async () => {
      enketoInit.returns([]);
      FileReader.utf8.resolves('<some-blob name="xml"/>');
      EnketoPrepopulationData.resolves('<xml></xml>');
      UserContact.resolves({ contact_id: '123' });
      xmlFormsService.canAccessForm.resolves(true);
      dbGetAttachment
        .onFirstCall().resolves('<div>first form</div>')
        .onSecondCall().resolves(VISIT_MODEL);

      await service.render(new EnketoFormContext('#div', 'report',  mockEnketoDoc('firstForm')));
      expect(form.resetView.notCalled).to.be.true;
      expect(UserContact.calledOnce).to.be.true;
      expect(EnketoPrepopulationData.calledOnce).to.be.true;
      expect(FileReader.utf8.calledTwice).to.be.true;
      expect(FileReader.utf8.args[0][0]).to.equal('<div>first form</div>');
      expect(FileReader.utf8.args[1][0]).to.equal(VISIT_MODEL);
      expect(enketoInit.calledOnce).to.be.true;
      expect(form.editStatus).to.be.false;
      expect(dbGetAttachment.calledTwice).to.be.true;
      expect(dbGetAttachment.args[0]).to.have.members([ 'form:firstForm', 'form.html' ]);
      expect(dbGetAttachment.args[1]).to.have.members([ 'form:firstForm', 'model.xml' ]);

      sinon.resetHistory();
      dbGetAttachment
        .onFirstCall().resolves('<div>second form</div>')
        .onSecondCall().resolves(VISIT_MODEL_WITH_CONTACT_SUMMARY);

      await service.render(new EnketoFormContext('#div', 'report', mockEnketoDoc('secondForm')));
      expect(form.resetView.calledOnce).to.be.true;
      expect(UserContact.calledOnce).to.be.true;
      expect(EnketoPrepopulationData.calledOnce).to.be.true;
      expect(FileReader.utf8.calledTwice).to.be.true;
      expect(FileReader.utf8.args[0][0]).to.equal('<div>second form</div>');
      expect(FileReader.utf8.args[1][0]).to.equal(VISIT_MODEL_WITH_CONTACT_SUMMARY);
      expect(enketoInit.calledOnce).to.be.true;
      expect(form.editStatus).to.be.false;
      expect(dbGetAttachment.calledTwice).to.be.true;
      expect(dbGetAttachment.args[0]).to.have.members([ 'form:secondForm', 'form.html' ]);
      expect(dbGetAttachment.args[1]).to.have.members([ 'form:secondForm', 'model.xml' ]);
    });

    it('should throw exception if fails to get user settings', fakeAsync(async () => {
      UserSettings.rejects(new Error('invalid user'));
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({ contact_id: '123' });
      xmlFormsService.canAccessForm.resolves(true);
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves('my model');
      enketoInit.returns([]);
      FileReader.utf8
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves('my model');
      EnketoPrepopulationData.resolves(data);
      const renderForm = sinon.spy(EnketoService.prototype, 'renderForm');

      try {
        await service.render(new EnketoFormContext('div', 'report', mockEnketoDoc('myform'), data));
        flush();
        expect.fail('Should throw error');
      } catch (error) {
        expect(error.message).to.equal('Failed during the form "myform" rendering : invalid user');
        expect(UserContact.calledOnce).to.be.true;
        expect(renderForm.notCalled).to.be.true;
        expect(enketoInit.notCalled).to.be.true;
        expect(consoleErrorMock.callCount).to.equal(0);
      }
    }));

    it('should throw exception when user does not have access to form', fakeAsync(async () => {
      dbGetAttachment
        .onFirstCall().resolves('<div>my form</div>')
        .onSecondCall().resolves(VISIT_MODEL);
      UserContact.resolves({ contact_id: '123-user-contact' });
      xmlFormsService.canAccessForm.resolves(false);
      ContactSummary.resolves({ context: { pregnant: false } });

      try {
        await service.render(new EnketoFormContext('div', 'report', mockEnketoDoc('myform')));
        flush();
        expect.fail('Should throw error');
      } catch (error) {
        expect(error).to.deep.equal({ translationKey: 'error.loading.form.no_authorized' });
        expect(UserContact.calledOnce).to.be.true;
        expect(xmlFormsService.canAccessForm.calledOnce).to.be.true;
        expect(xmlFormsService.canAccessForm.args[0]).to.have.deep.members([
          {
            _attachments: {
              xml: { something: true },
              'form.html': { something: true },
              'model.xml': { something: true },
            },
            _id: 'form:myform',
            internalId: 'myform',
          },
          { contact_id: '123-user-contact' },
          { doc: undefined, contactSummary: undefined, shouldEvaluateExpression: true },
        ]);
        expect(enketoInit.notCalled).to.be.true;
        expect(consoleErrorMock.notCalled).to.be.true;
        expect(feedbackService.submit.notCalled).to.be.true;
      }
    }));
  });

  describe('save', () => {

    beforeEach(() => {
      service = TestBed.inject(FormService);
    });

    it('creates report', () => {
      form.validate.resolves(true);
      const content = loadXML('sally-lmp');
      form.getDataStr.returns(content);
      trainingCardsService.getTrainingCardDocId.returns('training:user-jim:');
      dbBulkDocs.callsFake(docs => Promise.resolve([{ ok: true, id: docs[0]._id, rev: '1-abc' }]));
      UserContact.resolves({ _id: '123', phone: '555' });
      return service.save('V', form).then(actual => {
        actual = actual[0];

        expect(form.validate.callCount).to.equal(1);
        expect(form.getDataStr.callCount).to.equal(1);
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(UserContact.callCount).to.equal(1);
        expect(actual._id).to.match(/(\w+-)\w+/);
        expect(actual._id.startsWith('training:user-jim:')).to.be.false;
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
        expect(setLastChangedDoc.callCount).to.equal(1);
        expect(setLastChangedDoc.args[0]).to.deep.equal([actual]);
      });
    });

    it('creates training', () => {
      const content = loadXML('sally-lmp');
      form.getDataStr.returns(content);
      trainingCardsService.isTrainingCardForm.returns(true);
      trainingCardsService.getTrainingCardDocId.returns('training:user-jim:');
      form.validate.resolves(true);
      dbBulkDocs.callsFake(docs => Promise.resolve([ { ok: true, id: docs[0]._id, rev: '1-abc' } ]));
      UserContact.resolves({ _id: '123', phone: '555' });

      return service
        .save('training:a_new_training', form)
        .then(actual => {
          actual = actual[0];

          expect(form.validate.calledOnce).to.be.true;
          expect(form.getDataStr.calledOnce).to.be.true;
          expect(dbBulkDocs.calledOnce).to.be.true;
          expect(UserContact.calledOnce).to.be.true;
          expect(actual._id.startsWith('training:user-jim:')).to.be.true;
          expect(actual._rev).to.equal('1-abc');
          expect(actual.fields.name).to.equal('Sally');
          expect(actual.fields.lmp).to.equal('10');
          expect(actual.form).to.equal('training:a_new_training');
          expect(actual.type).to.equal('data_record');
          expect(actual.content_type).to.equal('xml');
          expect(actual.contact._id).to.equal('123');
          expect(actual.from).to.equal('555');
          expect(xmlFormGetWithAttachment.callCount).to.equal(1);
          expect(xmlFormGetWithAttachment.args[0][0]).to.equal('training:a_new_training');
          expect(AddAttachment.callCount).to.equal(0);
          expect(removeAttachment.callCount).to.equal(1);
          expect(removeAttachment.args[0]).excludingEvery('_rev').to.deep.equal([actual, 'content']);
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
        const saveDocsSpy = sinon.spy(FormService.prototype, 'saveDocs');

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
        const saveDocsStub = sinon.stub(FormService.prototype, 'saveDocs');
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
    });
  });
});
