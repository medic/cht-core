import { Injectable, NgZone } from '@angular/core';
import { Store } from '@ngrx/store';
import { toBik_text } from 'bikram-sambat';
import * as moment from 'moment';

import * as enketoConstants from './../../js/enketo/constants';
import * as medicXpathExtensions from '../../js/enketo/medic-xpath-extensions';
import { DbService } from '@mm-services/db.service';
import { FileReaderService } from '@mm-services/file-reader.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { SearchService } from '@mm-services/search.service';
import { SubmitFormBySmsService } from '@mm-services/submit-form-by-sms.service';
import { UserContactService } from '@mm-services/user-contact.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { ZScoreService } from '@mm-services/z-score.service';
import { ServicesActions } from '@mm-actions/services';
import { ContactSummaryService } from '@mm-services/contact-summary.service';
import { TranslateService } from '@mm-services/translate.service';
import { TransitionsService } from '@mm-services/transitions.service';
import { GlobalActions } from '@mm-actions/global';
import { CHTScriptApiService } from '@mm-services/cht-script-api.service';
import { TrainingCardsService } from '@mm-services/training-cards.service';
import { EnketoService, EnketoFormContext } from '@mm-services/enketo.service';
import { UserSettingsService } from '@mm-services/user-settings.service';

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
    private store: Store,
    private contactSummaryService: ContactSummaryService,
    private dbService: DbService,
    private fileReaderService: FileReaderService,
    private lineageModelGeneratorService: LineageModelGeneratorService,
    private searchService: SearchService,
    private submitFormBySmsService: SubmitFormBySmsService,
    private userContactService: UserContactService,
    private userSettingsService:UserSettingsService,
    private xmlFormsService: XmlFormsService,
    private zScoreService: ZScoreService,
    private trainingCardsService: TrainingCardsService,
    private transitionsService: TransitionsService,
    private translateService: TranslateService,
    private ngZone: NgZone,
    private chtScriptApiService: CHTScriptApiService,
    private enketoService: EnketoService
  ) {
    this.inited = this.init();
    this.globalActions = new GlobalActions(store);
    this.servicesActions = new ServicesActions(this.store);
  }

  private globalActions: GlobalActions;
  private servicesActions: ServicesActions;

  private inited;

  private init() {
    if (this.inited) {
      return this.inited;
    }
    return Promise.all([
      this.zScoreService.getScoreUtil(),
      this.chtScriptApiService.getApi()
    ])
      .then(([zscoreUtil, api]) => {
        medicXpathExtensions.init(zscoreUtil, toBik_text, moment, api);
      })
      .catch((err) => {
        console.error('Error initialising enketo service', err);
      });
  }

  private getAttachment(id, name) {
    return this.dbService
      .get()
      .getAttachment(id, name)
      .then(blob => this.fileReaderService.utf8(blob));
  }

  private transformXml(form) {
    return Promise
      .all([
        this.getAttachment(form._id, this.xmlFormsService.HTML_ATTACHMENT_NAME),
        this.getAttachment(form._id, this.xmlFormsService.MODEL_ATTACHMENT_NAME)
      ])
      .then(([html, model]) => {
        const $html = $(html);
        const hasContactSummary = $(model).find('> instance[id="contact-summary"]').length === 1;
        return {
          html: $html,
          model: model,
          title: form.title,
          hasContactSummary: hasContactSummary
        };
      });
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
    const subjectIds = [contact._id];
    const shortCode = contact.patient_id || contact.place_id;
    if (shortCode) {
      subjectIds.push(shortCode);
    }
    return this.searchService.search('reports', { subjectIds: subjectIds }, { include_docs: true });
  }

  private getContactSummary(doc, instanceData) {
    const contact = instanceData?.contact;
    if (!doc.hasContactSummary || !contact) {
      return Promise.resolve();
    }
    return Promise
      .all([
        this.getContactReports(contact),
        this.getLineage(contact),
      ])
      .then(([reports, lineage]) => this.contactSummaryService.get(contact, reports, lineage));
  }

  private canAccessForm(formDoc, user, instanceData, contactSummary) {
    return this.xmlFormsService.canAccessForm(
      formDoc,
      user,
      { doc: instanceData?.contact, contactSummary: contactSummary?.context },
    );
  }

  private async renderForm(formContext: EnketoFormContext) {
    const {
      formDoc,
      instanceData,
      userContact,
    } = formContext;

    try {
      this.unload(this.enketoService.getCurrentForm());
      const [ doc, userSettings ] = await Promise.all([
        this.transformXml(formDoc),
        this.userSettingsService.getWithLanguage()
      ]);
      const contactSummary = await this.getContactSummary(doc, instanceData);

      if (!await this.canAccessForm(formDoc, userContact, instanceData, contactSummary)) {
        throw { translationKey: 'error.loading.form.no_authorized' };
      }
      return await this.enketoService.renderForm(formContext, doc, userSettings, contactSummary);
    } catch (error) {
      if (error.translationKey) {
        throw error;
      }
      const errorMessage = `Failed during the form "${formDoc.internalId}" rendering : `;
      throw new Error(errorMessage + error.message);
    }
  }

  render(selector, form, instanceData, editedListener, valuechangeListener, isFormInModal = false) {
    return this.ngZone.runOutsideAngular(() => {
      return this._render(selector, form, instanceData, editedListener, valuechangeListener, isFormInModal);
    });
  }

  private _render(selector, form, instanceData, editedListener, valuechangeListener, isFormInModal) {
    return Promise
      .all([
        this.inited,
        this.getUserContact(),
      ])
      .then(([ , userContact]) => {
        const formContext: EnketoFormContext = {
          selector,
          formDoc: form,
          instanceData,
          editedListener,
          valuechangeListener,
          isFormInModal,
          userContact,
        };
        return this.renderForm(formContext);
      });
  }

  async renderContactForm(formContext: EnketoFormContext) {
    // Users can access contact forms even when they don't have a contact associated. So not throwing an error.
    formContext.userContact = await this.userContactService.get();
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

  private getUserContact() {
    return this.userContactService
      .get()
      .then((contact) => {
        if (!contact) {
          const err: any = new Error('Your user does not have an associated contact, or does not have access to the ' +
            'associated contact. Talk to your administrator to correct this.');
          err.translationKey = 'error.loading.form.no_contact';
          throw err;
        }
        return contact;
      });
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

  private async completeReport(formInternalId, form, docId?) {
    const formDoc = await this.ngZone
      .runOutsideAngular(() => this.xmlFormsService.getDocAndFormAttachment(formInternalId));
    if (docId) {
      return this.enketoService.completeExistingReport(form, formDoc, docId);
    }

    const contact = await this.getUserContact();
    return this.enketoService.completeNewReport(formInternalId, form, formDoc, contact);
  }

  async save(formInternalId, form, geoHandle, docId?) {
    const docs = await this.completeReport(formInternalId, form, docId);
    if (!docId && this.trainingCardsService.isTrainingCardForm(formInternalId)) {
      docs[0]._id = this.trainingCardsService.getTrainingCardDocId();
    }
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

  unload(form) {
    this.enketoService.unload(form);
  }
}
