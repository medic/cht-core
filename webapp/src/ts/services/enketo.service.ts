import { Injectable, NgZone } from '@angular/core';
import { Store } from '@ngrx/store';
import { toBik_text } from 'bikram-sambat';
import * as moment from 'moment';

import * as medicXpathExtensions from '../../js/enketo/medic-xpath-extensions';
import {
  ContactServices,
  EnketoFormManager,
  FileServices,
  FormDataServices,
  TranslationServices,
  XmlServices,
} from '../../js/enketo/enketo-form-manager';
import { AttachmentService } from '@mm-services/attachment.service';
import { DbService } from '@mm-services/db.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { FileReaderService } from '@mm-services/file-reader.service';
import { GetReportContentService } from '@mm-services/get-report-content.service';
import { LanguageService } from '@mm-services/language.service';
import { LineageModelGeneratorService } from '@mm-services/lineage-model-generator.service';
import { SearchService } from '@mm-services/search.service';
import { SubmitFormBySmsService } from '@mm-services/submit-form-by-sms.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { UserContactService } from '@mm-services/user-contact.service';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { ZScoreService } from '@mm-services/z-score.service';
import { ServicesActions } from '@mm-actions/services';
import { ContactSummaryService } from '@mm-services/contact-summary.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { TranslateService } from '@mm-services/translate.service';
import { TransitionsService } from '@mm-services/transitions.service';
import { GlobalActions } from '@mm-actions/global';
import {UserSettingsService} from '@mm-services/user-settings.service';

@Injectable({
  providedIn: 'root'
})
export class EnketoService {
  constructor(
    store:Store,
    private attachmentService: AttachmentService,
    contactSummaryService:ContactSummaryService,
    contactTypesService:ContactTypesService,
    dbService:DbService,
    userSettingsService:UserSettingsService,
    extractLineageService:ExtractLineageService,
    fileReaderService:FileReaderService,
    getReportContentService:GetReportContentService,
    languageService:LanguageService,
    lineageModelGeneratorService:LineageModelGeneratorService,
    searchService:SearchService,
    private submitFormBySmsService:SubmitFormBySmsService,
    translateFromService:TranslateFromService,
    userContactService:UserContactService,
    xmlFormsService:XmlFormsService,
    private zScoreService:ZScoreService,
    transitionsService:TransitionsService,
    translateService:TranslateService,
    private ngZone:NgZone,
  ) {
    this.enketoFormMgr = new EnketoFormManager(
      new ContactServices(extractLineageService, userContactService, contactTypesService),
      new FileServices(dbService, fileReaderService),
      new FormDataServices(
        contactSummaryService,
        userSettingsService,
        languageService,
        lineageModelGeneratorService,
        searchService
      ),
      new TranslationServices(translateService, translateFromService),
      new XmlServices(
        addAttachmentService,
        getReportContentService,
        xmlFormsService
      ),
      transitionsService,
      new GlobalActions(store)
    );

    this.inited = this.init();
    this.servicesActions = new ServicesActions(store);
  }

  private servicesActions: ServicesActions;
  private enketoFormMgr;
  private inited:Promise<undefined>;

  getCurrentForm() {
    return this.enketoFormMgr.getCurrentForm();
  }

  private init() {
    return this.zScoreService
      .getScoreUtil()
      .then((zscoreUtil) => {
        medicXpathExtensions.init(zscoreUtil, toBik_text, moment);
      })
      .catch((err) => {
        console.error('Error initialising zscore util', err);
      });
  }

  private registerListeners(selector, form, editedListener, valueChangeListener) {
    const $selector = $(selector);
    if(editedListener) {
      $selector.on('edited', () => this.ngZone.run(() => editedListener()));
    }
    [
      valueChangeListener,
      () => this.enketoFormMgr.setupNavButtons(form, $selector, form.pages._getCurrentIndex())
    ].forEach(listener => {
      if(listener) {
        $selector.on('xforms-value-changed', () => this.ngZone.run(() => listener()));
      }
    });
    return form;
  }

  render(selector, form, instanceData, editedListener, valuechangeListener) {
    return this.inited.then(() => {
      return this.ngZone.runOutsideAngular(() => {
        return this.enketoFormMgr.render(selector, form, instanceData)
          .then(form => this.registerListeners(selector, form, editedListener, valuechangeListener));
      });
    });
  }

  renderContactForm(formContext: EnketoFormContext) {
    return this.enketoFormMgr.renderContactForm(formContext)
      .then(form => this.registerListeners(
        formContext.selector,
        form,
        formContext.editedListener,
        formContext.valuechangeListener
      ));
  }

  save(formInternalId, form, geoHandle, docId?) {
    return this.enketoFormMgr
      .validate(form)
      .then(() => {
        $('form.or').trigger('beforesave');

        return this.ngZone.runOutsideAngular(() => {
          return this.enketoFormMgr.save(formInternalId, form, geoHandle, docId)
            .then((docs) => {
              this.servicesActions.setLastChangedDoc(docs[0]);
              // submit by sms _after_ saveDocs so that the main doc's ID is available
              this.submitFormBySmsService.submit(docs[0]);
              return docs;
            });
        });
      });
  }

  saveContactForm(form, docId, type, xmlVersion) {
    return this.ngZone.runOutsideAngular(() => {
      return this.enketoFormMgr.saveContactForm(form, docId, type, xmlVersion)
        .then(docs => {
          const primaryDoc = docs.preparedDocs.find(doc => doc.type === type);
          this.servicesActions.setLastChangedDoc(primaryDoc || docs.preparedDocs[0]);
          return docs;
        });
    });
  }

  unload(form) {
    this.enketoFormMgr.unload(form);
  }
}

export interface EnketoFormContext {
  selector: string;
  formDoc: Record<string, any>;
  instanceData: string|Record<string, any>; // String for report forms, Record<> for contact forms.
  editedListener: () => void;
  valuechangeListener: () => void;
  titleKey?: string;
}
