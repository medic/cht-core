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
import { UserContactService } from '@mm-services/user-contact.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { ZScoreService } from '@mm-services/z-score.service';
import { DuplicatesFoundError, FormService, WebappEnketoFormContext } from '@mm-services/form.service';
import { ServicesActions } from '@mm-actions/services';
import { ContactSummaryService } from '@mm-services/contact-summary.service';
import { TransitionsService } from '@mm-services/transitions.service';
import { TranslateService } from '@mm-services/translate.service';
import { GlobalActions } from '@mm-actions/global';
import { FeedbackService } from '@mm-services/feedback.service';
import * as medicXpathExtensions from '../../../../src/js/enketo/medic-xpath-extensions';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { TrainingCardsService } from '@mm-services/training-cards.service';
import { EnketoService } from '@mm-services/enketo.service';
import { FormConfig } from '@mm-services/form/form-config';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { ContactViewModelGeneratorService } from '@mm-services/contact-view-model-generator.service';
import { DeduplicateService } from '@mm-services/deduplicate.service';
import { ContactsService } from '@mm-services/contacts.service';
import { PerformanceService } from '@mm-services/performance.service';
import { UserContactSummaryService } from '@mm-services/user-contact-summary.service';
import { Contact, Qualifier, Report } from '@medic/cht-datasource';
import { DOC_TYPES } from '@medic/constants';

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
  const USER_SETTINGS = { name: 'Jim', language: 'en' };
  const USER_CONTACT = { _id: '123', phone: '555' };

  const mockFormConfig = (
    formInternalId: string,
    { type = 'report', html = '<div>my form</div>', model = VISIT_MODEL, xml = '<form/>' }: any = {}
  ) => new FormConfig(mockEnketoDoc(formInternalId), type, xml, html, model);
  const reportEnketoForm = (
    form,
    { internalId = 'V', xmlVersion, xml = '<form/>' }: any = {}
  ) => ({ form, config: new FormConfig({ internalId, xmlVersion }, 'report', xml, '<div></div>', VISIT_MODEL) });

  let service;
  let setLastChangedDoc;

  let dbGetAttachment;
  let getReport;
  let getContact;
  let dbBulkDocs;
  let ContactSummary;
  let Form2Sms;
  let UserContact;
  let UserSettings;
  let TranslateFrom;
  let form;
  let enketoService;
  let Search;
  let LineageModelGenerator;
  let transitionsService;
  let translateService;
  let xmlFormsService;
  let zScoreService;
  let zScoreUtil;
  let chtDatasourceService;
  let chtScriptApi;
  let globalActions;
  let trainingCardsService;
  let consoleErrorMock;
  let consoleWarnMock;
  let feedbackService;
  let targetAggregatesService;
  let contactViewModelGeneratorService;
  let deduplicateService;
  let getDuplicates;
  let contactsService;
  let performanceService;
  let performanceTracking;
  let userContactSummaryService;

  beforeEach(() => {
    dbGetAttachment = sinon.stub();
    getReport = sinon.stub();
    getContact = sinon.stub();
    dbBulkDocs = sinon.stub();
    ContactSummary = sinon.stub();
    Form2Sms = sinon.stub();
    UserContact = sinon.stub();
    UserSettings = sinon.stub();
    TranslateFrom = sinon.stub();
    form = {
      validate: sinon.stub(),
      getDataStr: sinon.stub(),
      resetView: sinon.stub(),
      view: {
        $: { on: sinon.stub() },
        html: document.createElement('div'),
      },
      langs: {
        setAll: () => { },
        $formLanguages: $('<select><option value="en">en</option></select>'),
      },
      calc: { update: () => { } },
      output: { update: () => { } },
    };
    enketoService = {
      renderForm: sinon.stub().resolves(form),
      saveContact: sinon.stub(),
      saveReport: sinon.stub(),
      unload: sinon.stub(),
      getCurrentForm: sinon.stub(),
    };
    Search = sinon.stub();
    LineageModelGenerator = { contact: sinon.stub() };
    xmlFormsService = {
      canAccessForm: sinon.stub(),
    };
    transitionsService = { applyTransitions: sinon.stub().resolvesArg(0) };
    translateService = {
      instant: sinon.stub().returnsArg(0),
      get: sinon.stub(),
    };
    zScoreUtil = sinon.stub();
    zScoreService = { getScoreUtil: sinon.stub().resolves(zScoreUtil) };
    chtScriptApi = sinon.stub();
    chtDatasourceService = {
      get: sinon.stub().resolves(chtScriptApi),
      bind: sinon.stub()
    };
    chtDatasourceService.bind.withArgs(Report.v1.get).returns(getReport);
    chtDatasourceService.bind.withArgs(Contact.v1.get).returns(getContact);
    globalActions = { setSnackbarContent: sinon.stub(GlobalActions.prototype, 'setSnackbarContent') };
    setLastChangedDoc = sinon.stub(ServicesActions.prototype, 'setLastChangedDoc');
    trainingCardsService = {
      isTrainingCardForm: sinon.stub(),
      getTrainingCardDocId: sinon.stub(),
    };
    consoleErrorMock = sinon.stub(console, 'error');
    consoleWarnMock = sinon.stub(console, 'warn');
    feedbackService = { submit: sinon.stub() };
    targetAggregatesService = { getTargetDocs: sinon.stub() };
    contactViewModelGeneratorService = { loadReports: sinon.stub() };
    userContactSummaryService = { get: sinon.stub() };

    const getSiblings = sinon.stub();
    getDuplicates = sinon.stub();
    deduplicateService = { getDuplicates };
    contactsService = { getSiblings };
    performanceTracking = { stop: sinon.stub() };
    performanceService = { track: sinon.stub().returns(performanceTracking) };

    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        {
          provide: DbService,
          useValue: {
            get: () => ({ getAttachment: dbGetAttachment, bulkDocs: dbBulkDocs })
          }
        },
        { provide: ContactSummaryService, useValue: { get: ContactSummary } },
        { provide: Form2smsService, useValue: { transform: Form2Sms } },
        { provide: SearchService, useValue: { search: Search } },
        { provide: SettingsService, useValue: { get: sinon.stub().resolves({}) } },
        { provide: LineageModelGeneratorService, useValue: LineageModelGenerator },
        { provide: UserContactService, useValue: { get: UserContact } },
        { provide: UserSettingsService, useValue: { getWithLanguage: UserSettings } },
        { provide: TranslateFromService, useValue: { get: TranslateFrom } },
        { provide: XmlFormsService, useValue: xmlFormsService },
        { provide: ZScoreService, useValue: zScoreService },
        { provide: CHTDatasourceService, useValue: chtDatasourceService },
        { provide: TransitionsService, useValue: transitionsService },
        { provide: TranslateService, useValue: translateService },
        { provide: TrainingCardsService, useValue: trainingCardsService },
        { provide: FeedbackService, useValue: feedbackService },
        { provide: EnketoService, useValue: enketoService },
        { provide: TargetAggregatesService, useValue: targetAggregatesService },
        { provide: ContactViewModelGeneratorService, useValue: contactViewModelGeneratorService },
        { provide: DeduplicateService, useValue: deduplicateService },
        { provide: ContactsService, useValue: contactsService },
        { provide: PerformanceService, useValue: performanceService },
        { provide: UserContactSummaryService, useValue: userContactSummaryService },
      ],
    });

    UserSettings.resolves(USER_SETTINGS);
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
      expect(chtDatasourceService.get.callCount).to.equal(1);
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
        .render(new WebappEnketoFormContext('#', mockFormConfig('myform')))
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
      UserContact.resolves({ contact_id: '123-user-contact' });
      xmlFormsService.canAccessForm.resolves(true);

      ContactSummary.resolves({ context: { pregnant: false } });
      userContactSummaryService.get.resolves({ context: { chw: true } });
      LineageModelGenerator.contact.resolves({ lineage: [{ _id: 'some_parent' }] });
      const instanceData = { contact: { _id: '123-patient-contact' } };

      const expectedErrorDetail = ['nope', 'still nope'];
      const expectedErrorMessage = `Failed during the form "myform" rendering : ${JSON.stringify(expectedErrorDetail)}`;
      enketoService.renderForm.rejects(new Error(JSON.stringify(expectedErrorDetail)));

      const formContext = new WebappEnketoFormContext(
        '#div',
        mockFormConfig('myform', { model: VISIT_MODEL_WITH_CONTACT_SUMMARY }),
        instanceData
      );

      try {
        await service.render(formContext);
        flush();
        expect.fail('Should throw error');
      } catch (error) {
        expect(UserContact.calledOnce).to.be.true;
        expect(userContactSummaryService.get.calledOnce).to.equal(true);
        expect(xmlFormsService.canAccessForm.calledOnce).to.be.true;
        expect(xmlFormsService.canAccessForm.args[0]).to.deep.equal([
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
          { chw: true },
          {
            doc: { _id: '123-patient-contact' },
            contactSummary: { pregnant: false },
            shouldEvaluateExpression: true
          },
        ]);
        expect(enketoService.renderForm.calledOnce).to.be.true;
        expect(error.message).to.equal(expectedErrorMessage);
        expect(consoleErrorMock.callCount).to.equal(0);
      }
    }));

    it('return form when everything works', async () => {
      UserContact.resolves({ contact_id: '123' });
      xmlFormsService.canAccessForm.resolves(true);
      const formContext = new WebappEnketoFormContext(
        '#div',
        mockFormConfig('myform', { type: 'task' })
      );

      const result = await service.render(formContext);

      expect(result).to.equal(form);
      expect(UserContact).to.have.been.calledOnceWithExactly();
      expect(enketoService.renderForm).to.have.been.calledOnceWithExactly(formContext, USER_SETTINGS);
    });

    it('passes xml instance data through to Enketo', async () => {
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({ contact_id: '123' });
      xmlFormsService.canAccessForm.resolves(true);
      const formConfig = mockFormConfig('myform', { model: 'my model' });
      const formContext = new WebappEnketoFormContext('div', formConfig, data);

      const result = await service.render(formContext);

      expect(result).to.equal(form);
      expect(enketoService.renderForm).to.have.been.calledOnceWithExactly(formContext, USER_SETTINGS);
    });

    it('passes contact summary data to enketo', async () => {
      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      xmlFormsService.canAccessForm.resolves(true);
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
      userContactSummaryService.get.resolves({ context: { chw: true } });
      contactViewModelGeneratorService.loadReports.resolves([{ _id: 'somereport' }]);
      targetAggregatesService.getTargetDocs.resolves([{ _id: 't1' }, { _id: 't2' }]);
      LineageModelGenerator.contact.resolves({ lineage: [{ _id: 'someparent' }] });
      const formContext = new WebappEnketoFormContext(
        'div',
        mockFormConfig('myform', { model: VISIT_MODEL_WITH_CONTACT_SUMMARY }),
        instanceData
      );
      service.setUserContext(['facility'], 'contact');

      await service.render(formContext);

      expect(enketoService.renderForm.args).to.deep.equal([[
        {
          ...formContext,
          contactSummary: { id: 'contact-summary', context: { pregnant: true } },
          userContactSummary: { id: 'user-contact-summary', context: { chw: true } }
        },
        USER_SETTINGS
      ]]);
      expect(contactViewModelGeneratorService.loadReports.callCount).to.equal(1);
      expect(contactViewModelGeneratorService.loadReports.args[0]).to.deep.equal(
        [{ doc: instanceData.contact }, []]
      );
      expect(LineageModelGenerator.contact.callCount).to.equal(1);
      expect(LineageModelGenerator.contact.args[0][0]).to.equal('fffff');
      expect(targetAggregatesService.getTargetDocs.callCount).to.equal(1);
      expect(targetAggregatesService.getTargetDocs.args[0]).to.deep.equal([
        { _id: 'fffff', patient_id: '44509' }, ['facility'], 'contact'
      ]);
      expect(ContactSummary.callCount).to.equal(1);
      expect(ContactSummary.args[0][0]._id).to.equal('fffff');
      expect(ContactSummary.args[0][1].length).to.equal(1);
      expect(ContactSummary.args[0][1][0]._id).to.equal('somereport');
      expect(ContactSummary.args[0][2].length).to.equal(1);
      expect(ContactSummary.args[0][2][0]._id).to.equal('someparent');
      expect(ContactSummary.args[0][3]).to.deep.equal([{ _id: 't1' }, { _id: 't2' }]);
    });

    it('does not get contact summary when the form has no instance for it', async () => {
      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      xmlFormsService.canAccessForm.resolves(true);
      const instanceData = {
        contact: {
          _id: 'fffff'
        },
        inputs: {
          patient_id: 123,
          name: 'sharon'
        }
      };
      const formContext = new WebappEnketoFormContext(
        'div',
        mockFormConfig('myform', { model: VISIT_MODEL }),
        instanceData
      );

      await service.render(formContext);

      expect(enketoService.renderForm).to.have.been.calledOnceWithExactly(formContext, USER_SETTINGS);
      expect(ContactSummary.callCount).to.equal(0);
      expect(userContactSummaryService.get.callCount).to.equal(0);
      expect(LineageModelGenerator.contact.callCount).to.equal(0);
    });

    it('ContactSummary receives empty lineage if contact doc is missing', async () => {
      LineageModelGenerator.contact.rejects({ code: 404 });

      UserContact.resolves({
        _id: '456',
        contact_id: '123',
        facility_id: '789'
      });
      xmlFormsService.canAccessForm.resolves(true);
      const instanceData = {
        contact: {
          _id: 'fffff',
          patient_id: '44509'
        }
      };
      ContactSummary.resolves({ context: { pregnant: true } });
      const formContext = new WebappEnketoFormContext(
        'div',
        mockFormConfig('myform', { model: VISIT_MODEL_WITH_CONTACT_SUMMARY }),
        instanceData
      );

      await service.render(formContext);

      expect(LineageModelGenerator.contact.callCount).to.equal(1);
      expect(LineageModelGenerator.contact.args[0][0]).to.equal('fffff');
      expect(ContactSummary.callCount).to.equal(1);
      expect(ContactSummary.args[0][2].length).to.equal(0);
      expect(consoleWarnMock.callCount).to.equal(1);
      expect(consoleWarnMock.args[0][0].startsWith('Enketo failed to get lineage of contact')).to.be.true;
    });

    it('should execute the unload process before rendering the second form', async () => {
      UserContact.resolves({ contact_id: '123' });
      xmlFormsService.canAccessForm.resolves(true);
      enketoService.getCurrentForm.returns(undefined);

      await service.render(new WebappEnketoFormContext('#div', mockFormConfig('firstForm')));
      expect(enketoService.unload.calledOnceWithExactly(undefined)).to.be.true;
      expect(enketoService.renderForm.calledOnce).to.be.true;
      expect(UserContact.calledOnce).to.be.true;

      sinon.resetHistory();
      enketoService.getCurrentForm.returns(form);

      await service.render(new WebappEnketoFormContext('#div', mockFormConfig('secondForm')));
      expect(enketoService.unload).to.have.been.calledOnceWithExactly(form);
      expect(enketoService.renderForm.calledOnce).to.be.true;
      expect(UserContact.calledOnce).to.be.true;
    });

    it('should throw exception if fails to get user settings', fakeAsync(async () => {
      UserSettings.rejects(new Error('invalid user'));
      const data = '<data><patient_id>123</patient_id></data>';
      UserContact.resolves({ contact_id: '123' });
      xmlFormsService.canAccessForm.resolves(true);

      try {
        await service.render(new WebappEnketoFormContext(
          'div',
          mockFormConfig('myform', { model: 'my model' }),
          data
        ));
        flush();
        expect.fail('Should throw error');
      } catch (error) {
        expect(error.message).to.equal('Failed during the form "myform" rendering : invalid user');
        expect(UserContact.calledOnce).to.be.true;
        expect(enketoService.renderForm.notCalled).to.be.true;
        expect(consoleErrorMock.callCount).to.equal(0);
      }
    }));

    it('should throw exception when user does not have access to form', fakeAsync(async () => {
      UserContact.resolves({ contact_id: '123-user-contact' });
      xmlFormsService.canAccessForm.resolves(false);
      ContactSummary.resolves({ context: { pregnant: false } });
      userContactSummaryService.get.resolves({ context: { chw: true } });

      try {
        await service.render(new WebappEnketoFormContext(
          'div',
          mockFormConfig('myform', { model: VISIT_MODEL })
        ));
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
          undefined,
          { doc: undefined, contactSummary: undefined, shouldEvaluateExpression: true },
        ]);
        expect(enketoService.renderForm.notCalled).to.be.true;
        expect(consoleErrorMock.notCalled).to.be.true;
        expect(feedbackService.submit.notCalled).to.be.true;
      }
    }));
  });

  describe('save', () => {

    beforeEach(() => {
      service = TestBed.inject(FormService);
    });

    it('creates report', async () => {
      trainingCardsService.getTrainingCardDocId.returns('training:user-jim:');
      dbBulkDocs.callsFake(docs => Promise.resolve([{ ok: true, id: docs[0]._id, rev: '1-abc' }]));
      UserContact.resolves(USER_CONTACT);
      const report = {
        _id: 'report-uuid',
        form: 'V',
        type: 'data_record',
        content_type: 'xml',
        contact: { _id: '123' },
        from: '555',
        fields: { name: 'Sally', lmp: '10' },
      };
      enketoService.saveReport.resolves([{ ...report }]);
      const reportForm = reportEnketoForm(form);

      const [actual] = await service.save(reportForm, null);

      expect(actual).excluding('_rev').to.deep.equal(report);
      expect(enketoService.saveReport).to.have.been.calledOnceWithExactly(reportForm, { contact: USER_CONTACT });
      expect(dbBulkDocs).to.have.been.calledOnceWithExactly([actual]);
      expect(UserContact).to.have.been.calledOnceWithExactly();
      expect(setLastChangedDoc).to.have.been.calledOnceWithExactly(actual);
    });

    it('creates training', async () => {
      trainingCardsService.isTrainingCardForm.returns(true);
      trainingCardsService.getTrainingCardDocId.returns('training:user-jim:');
      dbBulkDocs.callsFake(docs => Promise.resolve([{ ok: true, id: docs[0]._id, rev: '1-abc' }]));
      UserContact.resolves(USER_CONTACT);
      const training = {
        _id: 'report-uuid',
        form: 'training:a_new_training',
        type: 'data_record',
        content_type: 'xml',
        contact: { _id: '123' },
        from: '555',
        fields: { name: 'Sally', lmp: '10' },
      };
      enketoService.saveReport.resolves([{ ...training }]);
      const trainingForm = reportEnketoForm(form, { internalId: 'training:a_new_training' });

      const [actual] = await service.save(trainingForm, null);

      expect(actual).excluding('_rev').to.deep.equal({ ...training, _id: 'training:user-jim:' });
      expect(enketoService.saveReport).to.have.been.calledOnceWithExactly(trainingForm, { contact: USER_CONTACT });
      expect(dbBulkDocs).to.have.been.calledOnceWithExactly([actual]);
      expect(UserContact).to.have.been.calledOnceWithExactly();
      expect(setLastChangedDoc).to.have.been.calledOnceWithExactly(actual);
    });

    it('creates training when user has no contact', async () => {
      trainingCardsService.isTrainingCardForm.returns(true);
      trainingCardsService.getTrainingCardDocId.returns('training:user-jim:');
      dbBulkDocs.callsFake(docs => Promise.resolve([{ ok: true, id: docs[0]._id, rev: '1-abc' }]));
      UserContact.resolves(null);
      const training = {
        _id: 'report-uuid',
        form: 'training:a_new_training',
        type: 'data_record',
        content_type: 'xml',
        fields: { name: 'Sally', lmp: '10' },
      };
      enketoService.saveReport.resolves([{ ...training }]);
      const trainingForm = reportEnketoForm(form, { internalId: 'training:a_new_training' });

      const [actual] = await service.save(trainingForm, null);

      expect(actual).excluding('_rev').to.deep.equal({ ...training, _id: 'training:user-jim:' });
      expect(enketoService.saveReport).to.have.been.calledOnceWithExactly(trainingForm, { contact: null });
      expect(dbBulkDocs).to.have.been.calledOnceWithExactly([actual]);
      expect(UserContact).to.have.been.calledOnceWithExactly();
      expect(setLastChangedDoc).to.have.been.calledOnceWithExactly(actual);
    });

    describe('Geolocation recording', () => {
      it('saves geolocation data into a new report', async () => {
        dbBulkDocs.callsFake(docs => Promise.resolve([{ ok: true, id: docs[0]._id, rev: '1-abc' }]));
        UserContact.resolves(USER_CONTACT);
        const report = {
          _id: 'report-uuid',
          form: 'V',
          type: 'data_record',
          content_type: 'xml',
          contact: { _id: '123' },
          from: '555',
          fields: { name: 'Sally', lmp: '10' },
        };
        enketoService.saveReport.resolves([{ ...report }]);
        const geoData = {
          latitude: 1,
          longitude: 2,
          altitude: 3,
          accuracy: 4,
          altitudeAccuracy: 5,
          heading: 6,
          speed: 7
        };
        const reportForm = reportEnketoForm(form);

        const [actual] = await service.save(reportForm, () => Promise.resolve(geoData));

        expect(actual).excludingEvery(['_rev', 'timestamp']).to.deep.equal({
          ...report,
          geolocation: geoData,
          geolocation_log: [{ recording: geoData }]
        });
        expect(enketoService.saveReport).to.have.been.calledOnceWithExactly(reportForm, { contact: USER_CONTACT });
        expect(dbBulkDocs).to.have.been.calledOnceWithExactly([actual]);
        expect(UserContact).to.have.been.calledOnceWithExactly();
        expect(setLastChangedDoc).to.have.been.calledOnceWithExactly(actual);
        expect(actual._rev).to.equal('1-abc');
        expect(actual.geolocation_log[0].timestamp).to.be.greaterThan(0);
      });

      it('saves a geolocation error into a new report', async () => {
        dbBulkDocs.callsFake(docs => Promise.resolve([{ ok: true, id: docs[0]._id, rev: '1-abc' }]));
        UserContact.resolves(USER_CONTACT);
        const report = {
          _id: 'report-uuid',
          form: 'V',
          type: 'data_record',
          content_type: 'xml',
          contact: { _id: '123' },
          from: '555',
          fields: { name: 'Sally', lmp: '10' },
        };
        enketoService.saveReport.resolves([report]);
        const geoError = {
          code: 42,
          message: 'some bad geo'
        };
        const reportForm = reportEnketoForm(form);

        const [actual] = await service.save(reportForm, () => Promise.reject(geoError));

        expect(actual).excludingEvery(['_rev', 'timestamp']).to.deep.equal({
          ...report,
          geolocation: geoError,
          geolocation_log: [{ recording: geoError }]
        });
        expect(enketoService.saveReport).to.have.been.calledOnceWithExactly(reportForm, { contact: USER_CONTACT });
        expect(dbBulkDocs).to.have.been.calledOnceWithExactly([actual]);
        expect(UserContact).to.have.been.calledOnceWithExactly();
        expect(setLastChangedDoc).to.have.been.calledOnceWithExactly(actual);
        expect(actual._rev).to.equal('1-abc');
        expect(actual.geolocation_log[0].timestamp).to.be.greaterThan(0);
      });

      it('overwrites existing geolocation info on edit with new info and appends to the log', async () => {
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
        const originalReport = {
          _id: '6',
          _rev: '1-abc',
          form: 'V',
          fields: { name: 'Silly' },
          content: '<doc><name>Silly</name></doc>',
          content_type: 'xml',
          type: DOC_TYPES.DATA_RECORD,
          reported_date: 500,
          geolocation: originalGeoData,
          geolocation_log: [originalGeoLogEntry]
        };
        getReport.resolves(originalReport);
        const report = {
          _id: '6',
          _rev: '1-abc',
          form: 'V',
          type: 'data_record',
          content_type: 'xml',
          reported_date: 500,
          fields: { name: 'Sally', lmp: '10' },
          geolocation: originalGeoData,
          geolocation_log: [originalGeoLogEntry],
        };
        enketoService.saveReport.resolves([report]);
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
        const reportForm = reportEnketoForm(form);

        const [actual] = await service.save(reportForm, () => Promise.resolve(geoData), '6');


        expect(actual).excludingEvery(['_rev', 'timestamp']).to.deep.equal({
          ...report,
          geolocation: geoData,
          geolocation_log: [originalGeoLogEntry, { recording: geoData }]
        });
        expect(enketoService.saveReport).to.have.been.calledOnceWithExactly(reportForm, originalReport);
        expect(dbBulkDocs).to.have.been.calledOnceWithExactly([actual]);
        expect(UserContact).to.not.have.been.called;
        expect(setLastChangedDoc).to.have.been.calledOnceWithExactly(actual);
        expect(actual._rev).to.equal('2-abc');
        expect(actual.geolocation_log[0].timestamp).to.equal(12345);
        expect(actual.geolocation_log[1].timestamp).to.be.greaterThan(0);
      });
    });

    it('updates report', () => {
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
      enketoService.saveReport.resolves([{
        _id: '6',
        _rev: '1-abc',
        form: 'V',
        type: 'data_record',
        content_type: 'xml',
        reported_date: 500,
        fields: { name: 'Sally', lmp: '10' },
      }]);
      dbBulkDocs.resolves([{ ok: true, id: '6', rev: '2-abc' }]);
      return service.save(reportEnketoForm(form), null, '6').then(actual => {
        actual = actual[0];

        expect(enketoService.saveReport.calledOnce).to.be.true;
        expect(getReport.calledOnceWithExactly(Qualifier.byUuid('6'))).to.be.true;
        expect(dbBulkDocs.callCount).to.equal(1);
        expect(actual._id).to.equal('6');
        expect(actual._rev).to.equal('2-abc');
        expect(actual.fields.name).to.equal('Sally');
        expect(actual.fields.lmp).to.equal('10');
        expect(actual.form).to.equal('V');
        expect(actual.type).to.equal('data_record');
        expect(actual.reported_date).to.equal(500);
        expect(actual.content_type).to.equal('xml');
        expect(setLastChangedDoc.callCount).to.equal(1);
        expect(setLastChangedDoc.args[0]).to.deep.equal([actual]);
      });
    });

    it('creates extra docs', async () => {
      const startTime = Date.now() - 1;
      dbBulkDocs.callsFake(docs => {
        return Promise.resolve(docs.map(doc => {
          return { ok: true, id: doc._id, rev: `1-${doc._id}-abc` };
        }));
      });
      UserContact.resolves(USER_CONTACT);
      enketoService.saveReport.resolves([
        {
          _id: 'report-uuid',
          form: 'V',
          type: 'data_record',
          content_type: 'xml',
          contact: { _id: '123' },
          from: '555',
          hidden_fields: ['secret_code_name', 'doc1', 'doc2'],
          fields: {
            name: 'Sally',
            lmp: '10',
            secret_code_name: 'S4L',
            doc1: { some_property_1: 'some_value_1', type: 'thing_1' },
            doc2: { some_property_2: 'some_value_2', type: 'thing_2' },
          },
        },
        { _id: 'thing1-uuid', reported_date: Date.now(), type: 'thing_1', some_property_1: 'some_value_1' },
        { _id: 'thing2-uuid', reported_date: Date.now(), type: 'thing_2', some_property_2: 'some_value_2' },
      ]);

      const actual = await service.save(reportEnketoForm(form), null, null);
      const endTime = Date.now() + 1;

      expect(enketoService.saveReport.calledOnce).to.be.true;
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

    it('creates extra docs with geolocation', async () => {
      const startTime = Date.now() - 1;
      dbBulkDocs.resolves([
        { ok: true, id: '6', rev: '1-abc' },
        { ok: true, id: '7', rev: '1-def' },
        { ok: true, id: '8', rev: '1-ghi' }
      ]);
      UserContact.resolves(USER_CONTACT);
      enketoService.saveReport.resolves([
        {
          _id: 'report-uuid',
          form: 'V',
          type: 'data_record',
          content_type: 'xml',
          contact: { _id: '123' },
          from: '555',
          hidden_fields: ['secret_code_name', 'doc1', 'doc2'],
          fields: {
            name: 'Sally',
            lmp: '10',
            secret_code_name: 'S4L',
            doc1: { some_property_1: 'some_value_1', type: 'thing_1' },
            doc2: { some_property_2: 'some_value_2', type: 'thing_2' },
          },
        },
        { _id: 'thing1-uuid', reported_date: Date.now(), type: 'thing_1', some_property_1: 'some_value_1' },
        { _id: 'thing2-uuid', reported_date: Date.now(), type: 'thing_2', some_property_2: 'some_value_2' },
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

      const actual = await service.save(reportEnketoForm(form), () => Promise.resolve(geoData));
      const endTime = Date.now() + 1;

      expect(enketoService.saveReport.calledOnce).to.be.true;
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

    describe('Saving attachments', () => {
      it('should save attachments', async () => {
        UserContact.resolves({ _id: 'my-user', phone: '8989' });
        dbBulkDocs.callsFake(docs => Promise.resolve([{ ok: true, id: docs[0]._id, rev: '1-abc' }]));
        enketoService.saveReport.resolves([{
          _id: 'report-uuid',
          _attachments: { 'user-file-my_file': { content_type: 'image', data: 'abc' } },
        }]);
        // @ts-ignore
        const saveDocsSpy = sinon.spy(FormService.prototype, 'saveDocs');

        await service.save(reportEnketoForm(form, { internalId: 'my-form' }), () => Promise.resolve(true));

        expect(enketoService.saveReport.calledOnce).to.be.true;
        expect(saveDocsSpy.calledOnce).to.be.true;

        const savedDoc = dbBulkDocs.args[0][0][0];
        expect(savedDoc._attachments['user-file-my_file']).to.deep.include({ content_type: 'image' });

        expect(globalActions.setSnackbarContent.notCalled).to.be.true;
      });

      it('should throw exception if attachments are big', () => {
        translateService.get.returnsArg(0);
        UserContact.resolves({ _id: 'my-user', phone: '8989' });
        // @ts-ignore
        const saveDocsStub = sinon.stub(FormService.prototype, 'saveDocs');
        enketoService.saveReport.resolves([
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
          .save(reportEnketoForm(form, { internalId: 'my-form' }), () => Promise.resolve(true))
          .then(() => expect.fail('Should have thrown exception.'))
          .catch(error => {
            expect(enketoService.saveReport.calledOnce).to.be.true;
            expect(error.message).to.equal('enketo.error.max_attachment_size');
            expect(saveDocsStub.notCalled).to.be.true;
            expect(globalActions.setSnackbarContent.calledOnce).to.be.true;
            expect(globalActions.setSnackbarContent.args[0]).to.have.members(['enketo.error.max_attachment_size']);
          });
      });

      it('should pass docs to transitions and save results', () => {
        dbBulkDocs.callsFake(docs => Promise.resolve(docs.map(doc => ({
          ok: true, id: doc._id, rev: '2'
        }))));
        UserContact.resolves(USER_CONTACT);
        enketoService.saveReport.resolves([
          {
            _id: 'report-uuid',
            contact: {},
            content_type: 'xml',
            fields: {
              name: 'Sally', lmp: '10',
              repeat_doc: [
                { type: 'repeater', some_property: 'some_value_1' },
                { type: 'repeater', some_property: 'some_value_2' },
                { type: 'repeater', some_property: 'some_value_3' },
              ],
            },
            hidden_fields: ['repeat_doc'],
            form: 'V',
            form_version: { time: '1', sha256: 'imahash' },
            from: '555',
            _attachments: undefined,
            type: DOC_TYPES.DATA_RECORD,
          },
          {
            _id: 'thing1-uuid',
            form_version: { time: '1', sha256: 'imahash' },
            type: 'repeater',
            some_property: 'some_value_1',
          },
          {
            _id: 'thing2-uuid',
            form_version: { time: '1', sha256: 'imahash' },
            type: 'repeater',
            some_property: 'some_value_2',
          },
          {
            _id: 'thing3-uuid',
            form_version: { time: '1', sha256: 'imahash' },
            type: 'repeater',
            some_property: 'some_value_3',
          },
        ]);
        const geoHandle = sinon.stub().resolves({ geo: 'data' });
        transitionsService.applyTransitions.callsFake((docs) => {
          const clones = _.cloneDeep(docs); // cloning for clearer assertions, as the main array gets mutated
          clones.forEach(clone => clone.transitioned = true);
          clones.push({ _id: 'new doc', type: 'existent doc updated by the transition' });
          return Promise.resolve(clones);
        });
        const enketoForm = reportEnketoForm(form, {
          xmlVersion: { time: '1', sha256: 'imahash' },
          xml: `<form><repeat nodeset="/data/repeat_doc"></repeat></form>`
        });

        return service.save(enketoForm, geoHandle).then(actual => {
          expect(enketoService.saveReport.calledOnce).to.be.true;
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
                _attachments: undefined,
                geolocation: { geo: 'data' },
                geolocation_log: [{ recording: { geo: 'data' } }],
                type: DOC_TYPES.DATA_RECORD,
              },
              {
                form_version: { time: '1', sha256: 'imahash' },
                geolocation: { geo: 'data' },
                geolocation_log: [{ recording: { geo: 'data' } }],
                type: 'repeater',
                some_property: 'some_value_1',
              },
              {
                form_version: { time: '1', sha256: 'imahash' },
                geolocation: { geo: 'data' },
                geolocation_log: [{ recording: { geo: 'data' } }],
                type: 'repeater',
                some_property: 'some_value_2',
              },
              {
                form_version: { time: '1', sha256: 'imahash' },
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
                _attachments: undefined,
                geolocation: { geo: 'data' },
                geolocation_log: [{ recording: { geo: 'data' } }],
                type: DOC_TYPES.DATA_RECORD,
                transitioned: true,
              },
              {
                form_version: { time: '1', sha256: 'imahash' },
                geolocation: { geo: 'data' },
                geolocation_log: [{ recording: { geo: 'data' } }],
                type: 'repeater',
                some_property: 'some_value_1',
                transitioned: true,
              },
              {
                form_version: { time: '1', sha256: 'imahash' },
                geolocation: { geo: 'data' },
                geolocation_log: [{ recording: { geo: 'data' } }],
                type: 'repeater',
                some_property: 'some_value_2',
                transitioned: true,
              },
              {
                form_version: { time: '1', sha256: 'imahash' },
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

  describe('saveContact', () => {
    const enketoForm = { form: {}, config: { doc: {} } };
    const bulkDocsResult = [{ ok: true, id: 'main1', rev: '1-abc' }];

    beforeEach(() => service = TestBed.inject(FormService));

    it('resolves type fields as default data and saves the prepared docs for a new contact', async () => {
      const type = 'some-contact-type';
      const preparedDocs = [{ _id: 'main1', type }];
      enketoService.saveContact.resolves(<any>{ docId: 'main1', preparedDocs });
      dbBulkDocs.resolves(bulkDocsResult);

      const result = await service.saveContact({ docId: null, type }, enketoForm, false);

      expect(result).to.deep.equal({ docId: 'main1', bulkDocsResult });
      expect(enketoService.saveContact)
        .to.have.been.calledOnceWithExactly(enketoForm, { type: 'contact', contact_type: type });
      expect(getContact).to.not.have.been.called;
      expect(transitionsService.applyTransitions).to.have.been.calledOnceWithExactly(preparedDocs);
      expect(dbBulkDocs).to.have.been.calledOnceWithExactly(preparedDocs);
      expect(setLastChangedDoc).to.have.been.calledOnceWithExactly(preparedDocs[0]);
    });

    it('fetches the existing contact to use as default data when editing', async () => {
      const type = 'some-contact-type';
      const existingContact = { _id: 'main1', name: 'Richard' };
      getContact.resolves(existingContact);
      const preparedDocs = [{ _id: 'main1', type }];
      enketoService.saveContact.resolves(<any>{ docId: 'main1', preparedDocs });
      dbBulkDocs.resolves(bulkDocsResult);

      const result = await service.saveContact({ docId: 'main1', type }, enketoForm, false);

      expect(result).to.deep.equal({ docId: 'main1', bulkDocsResult });
      expect(enketoService.saveContact)
        .to.have.been.calledOnceWithExactly(enketoForm, existingContact);
      expect(getContact.calledOnceWithExactly(Qualifier.byUuid('main1'))).to.be.true;
      expect(transitionsService.applyTransitions).to.have.been.calledOnceWithExactly(preparedDocs);
      expect(dbBulkDocs).to.have.been.calledOnceWithExactly(preparedDocs);
      expect(setLastChangedDoc).to.have.been.calledOnceWithExactly(preparedDocs[0]);
    });

    it('uses the primary doc (matching the contact type) as the last changed doc', async () => {
      const type = 'some-contact-type';
      const primaryDoc = { _id: 'main1', type };
      const preparedDocs = [{ _id: 'other', type: 'other' }, primaryDoc];
      enketoService.saveContact.resolves(<any>{ docId: 'main1', preparedDocs });
      dbBulkDocs.resolves([{ ok: true, id: 'other' }, { ok: true, id: 'main1' }]);

      await service.saveContact({ docId: null, type }, enketoForm, false);

      expect(setLastChangedDoc.calledOnce).to.be.true;
      expect(setLastChangedDoc.args[0]).to.deep.equal([primaryDoc]);
    });

    it('should throw an error with duplicates found', async () => {
      const type = 'some-contact-type';
      const primaryDoc = { _id: 'main1', type };
      enketoService.saveContact.resolves(<any>{ docId: 'main1', preparedDocs: [primaryDoc] });
      const duplicates = [
        { _id: 'sib1', name: 'Sibling1', parent: { _id: 'parent1' }, type },
        { _id: 'sib2', name: 'Sibling2', parent: { _id: 'parent1' }, type },
      ];
      const siblings = [{ _id: 'sib1' }, { _id: 'sib2' }];
      contactsService.getSiblings.resolves(siblings);
      getDuplicates.resolves(duplicates);

      await expect(service.saveContact({ docId: null, type }, enketoForm, false))
        .to.be.rejectedWith(DuplicatesFoundError, 'Duplicates found')
        .and.eventually.have.property('duplicates', duplicates);
      expect(getDuplicates).to.have.been.calledOnceWithExactly(primaryDoc, type, siblings, undefined);
      expect(performanceService.track.calledOnceWithExactly()).to.be.true;
      expect(performanceTracking.stop.calledOnceWithExactly({
        name: `enketo:contacts:${type}:duplicate_check`
      })).to.be.true;
      expect(dbBulkDocs.notCalled).to.be.true;
    });

    it('should pass the configured duplicate_check to the deduplicate service', async () => {
      const type = 'some-contact-type';
      const duplicateCheck = { expression: 'some expression' };
      const mainDoc = { _id: 'main1', type };
      enketoService.saveContact.resolves(<any>{ docId: 'main1', preparedDocs: [mainDoc] });
      contactsService.getSiblings.resolves([{ _id: 'sib1' }]);
      getDuplicates.resolves([]);
      dbBulkDocs.resolves(bulkDocsResult);
      const enketoForm = { form: {}, config: { doc: { duplicate_check: duplicateCheck } } };

      await service.saveContact({ docId: null, type }, enketoForm, false);

      expect(getDuplicates).to.have.been.calledOnceWithExactly(mainDoc, type, [{ _id: 'sib1' }], duplicateCheck);
      expect(dbBulkDocs.calledOnce).to.be.true;
    });

    it('should skip the duplicate check when duplicates are acknowledged', async () => {
      const type = 'some-contact-type';
      enketoService.saveContact.resolves(<any>{ docId: 'main1', preparedDocs: [{ _id: 'main1', type }] });
      dbBulkDocs.resolves(bulkDocsResult);

      await service.saveContact({ docId: null, type }, enketoForm, true);

      expect(performanceService.track.notCalled).to.be.true;
      expect(contactsService.getSiblings.notCalled).to.be.true;
      expect(getDuplicates.notCalled).to.be.true;
      expect(dbBulkDocs.calledOnce).to.be.true;
    });

    it('should throw when bulkDocs reports a failure', async () => {
      const type = 'some-contact-type';
      enketoService.saveContact.resolves(<any>{ docId: 'main1', preparedDocs: [{ _id: 'main1', type }] });
      dbBulkDocs.resolves([{ ok: false, id: 'main1', message: 'conflict' }]);

      await expect(service.saveContact({ docId: null, type }, enketoForm, true))
        .to.be.rejectedWith(Error, 'Some documents did not save correctly: main1 with conflict; ');

      expect(performanceService.track.notCalled).to.be.true;
      expect(contactsService.getSiblings.notCalled).to.be.true;
      expect(getDuplicates.notCalled).to.be.true;
      expect(dbBulkDocs.calledOnce).to.be.true;
    });
  });

  describe('load contact summary', () => {
    beforeEach(() => {
      service = TestBed.inject(FormService);
    });

    it('should produce a summary for the provided contact', async function () {
      const contact = {
        _id: '123456789',
        name: 'Test person',
        short_name: 'tp1',
        phone_number: '+27723301855',
        date_of_birth: '1966-01-11',
        dob_type: 'exact'
      };
      contactViewModelGeneratorService.loadReports.resolves([{ _id: 'somereport' }]);
      targetAggregatesService.getTargetDocs.resolves([{ _id: 't1' }, { _id: 't2' }]);
      LineageModelGenerator.contact.resolves({ lineage: [{ _id: 'someparent' }] });
      ContactSummary.resolves({
        context: { pregnant: true },
        fields: [
          { label: 'label.short_name', value: contact.short_name },
          { label: 'label.dob_type', value: contact.dob_type },
        ],
        cards: []
      });
      const summary = await service.loadContactSummary(contact);
      expect(ContactSummary.callCount).to.equal(1);
      expect(ContactSummary.args[0][0]._id).to.equal('123456789');
      expect(contactViewModelGeneratorService.loadReports.callCount).to.equal(1);
      expect(targetAggregatesService.getTargetDocs.callCount).to.equal(1);
      expect(summary).to.deep.equal({
        cards: [],
        context: {
          pregnant: true,
        },
        fields: [
          { label: 'label.short_name', value: 'tp1' },
          { label: 'label.dob_type', value: 'exact' },
        ],
      });
    });
  });
});

describe('WebappEnketoFormContext', () => {
  const formConfigForType = (type, doc: any = {}) => new FormConfig(doc, type, '<form/>', '<div/>', '<model/>');

  it('should construct object correctly', () => {
    const config = formConfigForType('task', { doc: 1 });
    const context = new WebappEnketoFormContext('#sel', config, { data: 1 });
    expect(context).to.deep.include({
      selector: '#sel',
      formConfig: config,
      instanceData: { data: 1 },
    });
  });

  it('shouldEvaluateExpression should return false for tasks', () => {
    const ctx = new WebappEnketoFormContext('a', formConfigForType('task'));
    expect(ctx.shouldEvaluateExpression()).to.eq(false);
  });

  it('shouldEvaluateExpression should return false for editing reports', () => {
    const ctx = new WebappEnketoFormContext('a', formConfigForType('report'));
    ctx.editing = true;
    expect(ctx.shouldEvaluateExpression()).to.eq(false);
  });

  it('shouldEvaluateExpression should return true for reports and contact forms', () => {
    const ctxReport = new WebappEnketoFormContext('a', formConfigForType('report'));
    expect(ctxReport.shouldEvaluateExpression()).to.eq(true);

    const ctxContact = new WebappEnketoFormContext('a', formConfigForType('contact'));
    expect(ctxContact.shouldEvaluateExpression()).to.eq(true);
  });

  it('requiresContact should return true when type is not contact', () => {
    const ctxReport = new WebappEnketoFormContext('a', formConfigForType('report'));
    expect(ctxReport.requiresContact()).to.eq(true);
  });

  it('requiresContact should return false when type is contact', () => {
    const ctxReport = new WebappEnketoFormContext('a', formConfigForType('contact'));
    expect(ctxReport.requiresContact()).to.eq(false);
  });

  it('requiresContact should return false for training forms', () => {
    const ctxTraining = new WebappEnketoFormContext('a', formConfigForType('training-card'));
    expect(ctxTraining.requiresContact()).to.eq(false);
  });
});
