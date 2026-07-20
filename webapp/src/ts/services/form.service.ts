import { Injectable, NgZone } from '@angular/core';
import { Store } from '@ngrx/store';
import { toBik_text } from 'bikram-sambat';
import * as moment from 'moment';

import * as enketoConstants from './../../js/enketo/constants';
import * as medicXpathExtensions from '../../js/enketo/medic-xpath-extensions';
import { DbService } from '@mm-services/db.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { SubmitFormBySmsService } from '@mm-services/submit-form-by-sms.service';
import { UserContactService } from '@mm-services/user-contact.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { ZScoreService } from '@mm-services/z-score.service';
import { ServicesActions } from '@mm-actions/services';
import { ContactSummaryService } from '@mm-services/contact-summary.service';
import { UserContactSummaryService } from '@mm-services/user-contact-summary.service';
import { TranslateService } from '@mm-services/translate.service';
import { TransitionsService } from '@mm-services/transitions.service';
import { GlobalActions } from '@mm-actions/global';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { TrainingCardsService } from '@mm-services/training-cards.service';
import { ContactSummary, EnketoForm, EnketoFormContext, EnketoService } from '@mm-services/enketo.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { reduce as _reduce } from 'lodash-es';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { ContactViewModelGeneratorService } from '@mm-services/contact-view-model-generator.service';
import { Nullable, Person, Contact, Report, Qualifier } from '@medic/cht-datasource';
import { DeduplicateService, DuplicateCheck } from '@mm-services/deduplicate.service';
import { ContactsService } from '@mm-services/contacts.service';
import { PerformanceService } from '@mm-services/performance.service';
import { FormConfig } from '@mm-services/form/form-config';

/**
 * Service for interacting with forms. This is the primary entry-point for CHT code to render forms and save the
 * results. All logic that is proper to Enketo functionality should be included in the EnektoService. Logic that is
 * peripheral to Enketo forms (needed to support form functionality in the CHT, but not required for interacting with
 * Enekto forms) should be included here.
 */
@Injectable({
  providedIn: 'root'
})
export class FormService {
  constructor(
    private readonly store: Store,
    private readonly contactSummaryService: ContactSummaryService,
    private readonly contactTypesService: ContactTypesService,
    private readonly dbService: DbService,
    private readonly lineageModelGeneratorService: LineageModelGeneratorService,
    private readonly submitFormBySmsService: SubmitFormBySmsService,
    private readonly userContactService: UserContactService,
    private readonly userSettingsService: UserSettingsService,
    private readonly xmlFormsService: XmlFormsService,
    private readonly zScoreService: ZScoreService,
    private readonly trainingCardsService: TrainingCardsService,
    private readonly transitionsService: TransitionsService,
    private readonly translateService: TranslateService,
    private readonly ngZone: NgZone,
    private readonly chtDatasourceService: CHTDatasourceService,
    private readonly enketoService: EnketoService,
    private readonly targetAggregatesService: TargetAggregatesService,
    private readonly contactViewModelGeneratorService: ContactViewModelGeneratorService,
    private readonly deduplicateService: DeduplicateService,
    private readonly contactsService: ContactsService,
    private readonly performanceService: PerformanceService,
    private readonly userContactSummaryService: UserContactSummaryService,
  ) {
    this.inited = this.init();
    this.globalActions = new GlobalActions(store);
    this.servicesActions = new ServicesActions(this.store);
    this.getReport = chtDatasourceService.bind(Report.v1.get);
    this.getContact = chtDatasourceService.bind(Contact.v1.get);
  }

  private readonly getReport: ReturnType<typeof Report.v1.get>;
  private readonly getContact: ReturnType<typeof Contact.v1.get>;
  private readonly globalActions: GlobalActions;
  private readonly servicesActions: ServicesActions;

  private readonly inited;
  private userContactId;
  private userFacilityIds;

  private init() {
    if (this.inited) {
      return this.inited;
    }
    return Promise.all([
      this.zScoreService.getScoreUtil(),
      this.chtDatasourceService.get()
    ])
      .then(([zscoreUtil, api]) => {
        medicXpathExtensions.init(zscoreUtil, toBik_text, moment, api);
      })
      .catch((err) => {
        console.error('Error initialising enketo service', err);
      });
  }

  private modelHasInstance(model, instanceId) {
    return $(model).find(`instance[id="${instanceId}"]`).length >= 1;
  }

  private getLineage(contact) {
    return this.lineageModelGeneratorService
      .contact(contact._id)
      .then((model) => model.lineage)
      .catch((err) => {
        if (err.code === 404) {
          console.warn(`Enketo failed to get lineage of contact '${contact._id}' because document does not exist`, err);
          return [];
        }

        throw err;
      });
  }

  private getContactReports(contact) {
    return this.contactViewModelGeneratorService.loadReports({ doc: contact }, []);
  }

  private getTargetDocs(contact) {
    return this.targetAggregatesService.getTargetDocs(contact, this.userFacilityIds, this.userContactId);
  }

  async loadContactSummary(contact) {
    const [reports, lineage, targetDocs] = await Promise.all([
      this.getContactReports(contact),
      this.getLineage(contact),
      this.getTargetDocs(contact),
    ]);
    return await this.contactSummaryService.get(contact, reports, lineage, targetDocs);
  }

  private async getContactSummary(formConfig: FormConfig, instanceData):Promise<ContactSummary|undefined> {
    const instanceId = 'contact-summary';
    const contact = instanceData?.contact;
    if (!this.modelHasInstance(formConfig.model, instanceId) || !contact) {
      return;
    }

    return {
      id: instanceId,
      context: (await this.loadContactSummary(contact))?.context,
    };
  }

  private async getUserContactSummary(formConfig: FormConfig):Promise<ContactSummary|undefined> {
    const instanceId = 'user-contact-summary';
    if (!this.modelHasInstance(formConfig.model, instanceId)) {
      return;
    }

    return {
      id: instanceId,
      context: (await this.userContactSummaryService.get())?.context,
    };
  }

  private canAccessForm(formContext: WebappEnketoFormContext) {
    return this.xmlFormsService.canAccessForm(
      formContext.formConfig.doc,
      formContext.userContact,
      formContext.userContactSummary?.context,
      {
        doc: typeof formContext.instanceData !== 'string' && formContext.instanceData?.contact,
        contactSummary: formContext.contactSummary?.context,
        shouldEvaluateExpression: formContext.shouldEvaluateExpression(),
      },
    );
  }

  private async renderForm(formContext: WebappEnketoFormContext) {
    const { formConfig, instanceData } = formContext;

    try {
      this.enketoService.unload(this.enketoService.getCurrentForm());
      const userSettings = await this.userSettingsService.getWithLanguage();
      formContext.contactSummary = await this.getContactSummary(formConfig, instanceData);
      formContext.userContactSummary = await this.getUserContactSummary(formConfig);

      if (!await this.canAccessForm(formContext)) {
        throw { translationKey: 'error.loading.form.no_authorized' };
      }
      return await this.enketoService.renderForm(formContext, userSettings);
    } catch (error) {
      if (error.translationKey) {
        throw error;
      }
      const errorMessage = `Failed during the form "${formConfig.doc.internalId}" rendering : `;
      throw new Error(errorMessage + error.message);
    }
  }

  setUserContext(userFacilityIds, userContactId) {
    this.userFacilityIds = userFacilityIds;
    this.userContactId = userContactId;
  }

  render(formContext: WebappEnketoFormContext) {
    return this.ngZone.runOutsideAngular(() => this._render(formContext));
  }

  private async _render(formContext: WebappEnketoFormContext) {
    await this.inited;
    formContext.userContact = await this.getUserContact(formContext.requiresContact());
    return this.renderForm(formContext);
  }

  private saveDocs(docs) {
    return this.dbService
      .get()
      .bulkDocs(docs)
      .then((results) => {
        results.forEach((result) => {
          if (result.error) {
            throw new Error('Error saving report: ' + result.error);
          }
          const idx = docs.findIndex(doc => doc._id === result.id);
          docs[idx] = { ...docs[idx], _rev: result.rev };
        });
        return docs;
      });
  }

  private async getUserContact(requiresContact: boolean) {
    const contact = await this.userContactService.get();
    if (requiresContact && !contact) {
      const err: any = new Error('Your user does not have an associated contact, or does not have access to the ' +
        'associated contact. Talk to your administrator to correct this.');
      err.translationKey = 'error.loading.form.no_contact';
      throw err;
    }
    return contact;
  }

  private saveGeo(geoHandle, docs) {
    if (!geoHandle) {
      return docs;
    }

    return geoHandle()
      .catch(err => err)
      .then(geoData => {
        docs.forEach(doc => {
          doc.geolocation_log = doc.geolocation_log || [];
          doc.geolocation_log.push({
            timestamp: Date.now(),
            recording: geoData
          });
          doc.geolocation = geoData;
        });
        return docs;
      });
  }

  private async validateAttachments(docs) {
    const oversizeDoc = docs.find(doc => {
      let attachmentsSize = 0;

      if (doc._attachments) {
        Object
          .keys(doc._attachments)
          .forEach(name => {
            const data = doc._attachments[name]?.data; // It can be Base64 (binary) or object (file)
            const size = typeof data === 'string' ? data.length : (data?.size || 0);
            attachmentsSize += size;
          });
      }

      return attachmentsSize > enketoConstants.maxAttachmentSize;
    });

    if (oversizeDoc) {
      const errorMessage = await this.translateService.get('enketo.error.max_attachment_size');
      this.globalActions.setSnackbarContent(errorMessage);
      return Promise.reject(new Error(errorMessage));
    }

    return docs;
  }

  private async completeReport(enketoForm: EnketoForm, docId?) {
    if (docId) {
      const doc = await this.getReport(Qualifier.byUuid(docId));
      return this.enketoService.saveReport(enketoForm, doc!);
    }

    const isTrainingCardForm = this.trainingCardsService.isTrainingCardForm(enketoForm.config.doc.internalId);
    const contact = await this.getUserContact(!isTrainingCardForm);

    const docs = await this.enketoService.saveReport(enketoForm, { contact });
    if (!docId && isTrainingCardForm) {
      docs[0]._id = this.trainingCardsService.getTrainingCardDocId();
    }
    return docs;
  }

  async save(enketoForm: EnketoForm, geoHandle, docId?) {
    const docs = await this.completeReport(enketoForm, docId);
    return this.ngZone.runOutsideAngular(() => this._save(docs, geoHandle));
  }

  private _save(docs, geoHandle) {
    return this.validateAttachments(docs)
      .then((docs) => this.saveGeo(geoHandle, docs))
      .then((docs) => this.transitionsService.applyTransitions(docs))
      .then((docs) => this.saveDocs(docs))
      .then((docs) => {
        this.servicesActions.setLastChangedDoc(docs[0]);
        // submit by sms _after_ saveDocs so that the main doc's ID is available
        this.submitFormBySmsService.submit(docs[0]);
        return docs;
      });
  }

  private applyTransitions(preparedDocs) {
    return this.transitionsService
      .applyTransitions(preparedDocs.preparedDocs)
      .then(updatedDocs => {
        preparedDocs.preparedDocs = updatedDocs;
        return preparedDocs;
      });
  }

  private generateFailureMessage(bulkDocsResult) {
    return _reduce(bulkDocsResult, (msg: any, result) => {
      let newMsg = msg;
      if (!result.ok) {
        if (!newMsg) {
          newMsg = 'Some documents did not save correctly: ';
        }
        newMsg += result.id + ' with ' + result.message + '; ';
      }
      return newMsg;
    }, null);
  }

  private async checkForDuplicates(
    doc: Contact.v1.Contact,
    contactType: string,
    duplicatesAcknowledged: boolean,
    duplicateCheck?: DuplicateCheck
  ): Promise<Array<Contact.v1.Contact>> {
    if (duplicatesAcknowledged) {
      return [];
    }

    const perfTracking = this.performanceService.track();

    try {
      const siblings = await this.contactsService.getSiblings(doc);
      return await this.deduplicateService.getDuplicates(doc, contactType, siblings, duplicateCheck);
    } finally {
      perfTracking?.stop({
        name: ['enketo', 'contacts', contactType, 'duplicate_check'].join(':')
      });
    }
  }

  async saveContact(
    contactInfo: {
      docId: string | undefined;
      type: string;
    },
    enketoForm: EnketoForm,
    duplicatesAcknowledged: boolean,
  ) {
    const { docId, type } = contactInfo;
    const typeFields = this.contactTypesService.isHardcodedType(type)
      ? { type }
      : { type: 'contact', contact_type: type };

    const defaultData = docId ? await this.getContact(Qualifier.byUuid(docId)) : typeFields;
    const docs = await this.enketoService.saveContact(enketoForm, defaultData!);

    const preparedDocs = await this.applyTransitions(docs);

    const primaryDoc = preparedDocs.preparedDocs.find(doc => doc.type === type);

    const duplicates = await this.checkForDuplicates(
      primaryDoc ?? preparedDocs.preparedDocs[0],
      type,
      duplicatesAcknowledged,
      enketoForm.config.doc.duplicate_check
    );
    if (duplicates?.length) {
      throw new DuplicatesFoundError('Duplicates found', duplicates);
    }

    this.servicesActions.setLastChangedDoc(primaryDoc || preparedDocs.preparedDocs[0]);
    const bulkDocsResult = await this.dbService.get().bulkDocs(preparedDocs.preparedDocs);
    const failureMessage = this.generateFailureMessage(bulkDocsResult);

    if (failureMessage) {
      throw new Error(failureMessage);
    }

    return { docId: preparedDocs.docId, bulkDocsResult };
  }

  unload(form?: EnketoForm) {
    this.enketoService.unload(form?.form);
  }
}
export class DuplicatesFoundError extends Error {
  duplicates: Contact.v1.Contact[];
  constructor(message: string, duplicates: Contact.v1.Contact[]) {
    super(message);
    this.message = message;
    this.duplicates = duplicates;
    this.name = 'DuplicatesFoundError';
  }
}

export class WebappEnketoFormContext implements EnketoFormContext {
  readonly selector: string;
  readonly formConfig: FormConfig;
  readonly instanceData?: string | Record<string, any>;
  editedListener?: () => void;
  valuechangeListener?: () => void;
  titleKey?: string;
  isFormInModal?: boolean;
  contactSummary?: ContactSummary;
  userContactSummary?: ContactSummary;

  editing?: boolean;
  userContact?: Nullable<Person.v1.Person>;

  constructor(selector: string, formConfig: FormConfig, instanceData?) {
    this.selector = selector;
    this.formConfig = formConfig;
    this.instanceData = instanceData;
  }

  shouldEvaluateExpression() {
    if (this.formConfig.type === 'task') {
      return false;
    }

    if (this.formConfig.type === 'report' && this.editing) {
      return false;
    }
    return true;
  }

  requiresContact() {
    // Users can access contact forms even when they don't have a contact associated.
    return this.formConfig.type !== 'contact' && this.formConfig.type !== 'training-card';
  }
}
