import { Injectable, NgZone } from '@angular/core';
import { v7 as uuid } from 'uuid';
import * as pojo2xml from 'pojo2xml';
import type JQuery from 'jquery';
import * as FileManager from '../../js/enketo/file-manager.js';
import events from 'enketo-core/src/js/event';

import { Xpath } from '@mm-providers/xpath-element-path.provider';
import { DbService } from '@mm-services/db.service';
import { EnketoPrepopulationDataService } from '@mm-services/enketo-prepopulation-data.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { TranslateFromService } from '@mm-services/translate-from.service';
import { TranslateService } from '@mm-services/translate.service';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { Contact, Qualifier } from '@medic/cht-datasource';
import { DOC_TYPES } from '@medic/constants';
import { FormConfig } from '@mm-services/form/form-config';
import {
  EnektoContactFormData,
  EnketoFormData,
  EnketoReportFormData,
  EnketoRootFormData
} from '@mm-services/form/form-data';
import { isHardcodedType } from '@medic/contact-types-utils';
import { REPORT_ATTACHMENT_NAME } from '@mm-services/get-report-content.service';

/**
 * Service for interacting with Enketo forms. This code is intended for displaying forms in the CHT as well as being
 * reused by code outside the CHT (e.g. cht-conf-test-harness). All logic that is proper to Enketo functionality should
 * be included here. Logic that is peripheral to Enketo forms (needed to support form functionality in the CHT, but not
 * required for interacting with Enekto forms) should be included in the FormService.
 */
@Injectable({
  providedIn: 'root'
})
export class EnketoService {
  constructor(
    private readonly dbService: DbService,
    private readonly enketoPrepopulationDataService: EnketoPrepopulationDataService,
    private readonly extractLineageService: ExtractLineageService,
    private readonly translateFromService: TranslateFromService,
    private readonly translateService: TranslateService,
    private readonly ngZone: NgZone,
    chtDatasourceService: CHTDatasourceService,
  ) {
    this.getContactFromDatasource = chtDatasourceService.bind(Contact.v1.get);
  }

  private readonly USER_BINARY_ATTACHMENT_PREFIX = 'user-file';
  private readonly USER_FILE_ATTACHMENT_PREFIX = `${this.USER_BINARY_ATTACHMENT_PREFIX}-`;

  private readonly objUrls: string[] = [];
  private readonly getContactFromDatasource: ReturnType<typeof Contact.v1.get>;
  private currentForm;

  getCurrentForm() {
    return this.currentForm;
  }

  private replaceDataI18nTranslations(formHtml) {
    formHtml.find('[data-i18n]').each((idx, element) => {
      const $element = $(element);
      $element.text(this.translateService.instant('enketo.' + $element.attr('data-i18n')));
    });
  }

  private replaceJavarosaMediaWithLoaders(formHtml) {
    formHtml.find('[data-media-src]').each((idx, element) => {
      const $img = $(element);
      const lang = $img.attr('lang');
      const active = $img.is('.active') ? 'active' : '';
      $img
        .css('visibility', 'hidden')
        .wrap(() => '<div class="loader ' + active + '" lang="' + lang + '"></div>');
    });
  }

  private replaceMediaLoaders(formContainer, formDoc) {
    formContainer.find('[data-media-src]').each((idx, element) => {
      const elem = $(element);
      const src = elem.attr('data-media-src');
      this.dbService
        .get()
        .getAttachment(formDoc._id, src)
        .then((blob) => {
          const objUrl = (window.URL || window.webkitURL).createObjectURL(blob);
          this.objUrls.push(objUrl);
          elem
            .attr('src', objUrl)
            .css('visibility', '')
            .unwrap();
        })
        .catch((err) => {
          console.error('Error fetching media file', formDoc._id, src, err);
          elem.closest('.loader').hide();
        });
    });
  }

  private handleKeypressOnInputField(e) {
    // Here we capture both CR and TAB characters, and handle field-skipping
    if (!window.medicmobile_android || (e.keyCode !== 9 && e.keyCode !== 13)) {
      return;
    }

    const $input = $(this);

    // stop the keypress from being handled elsewhere
    e.preventDefault();

    const $thisQuestion = $input.closest('.question');

    // If there's another question on the current page, focus on that
    if ($thisQuestion.attr('role') !== 'page') {
      const $nextQuestion = $thisQuestion.find(
        '~ .question:not(.disabled):not(.or-appearance-hidden), ~ .repeat-buttons button.repeat:not(:disabled)'
      );
      if ($nextQuestion.length) {
        if ($nextQuestion[0].tagName !== 'LABEL') {
          // The next question is something complicated, so we can't just
          // focus on it.  Next best thing is to blur the current selection
          // so the on-screen keyboard closes.
          $input.trigger('blur');
        } else {
          // Delay focussing on the next field, so that keybaord close and
          // open events both register.  This should mean that the on-screen
          // keyboard is maintained between fields.
          setTimeout(() => {
            $nextQuestion.first().trigger('focus');
          }, 10);
        }
        return;
      }
    }

    // Trigger the change listener on the current field to update the enketo
    // model
    $input.trigger('change');

    const enketoContainer = $thisQuestion.closest('.enketo');

    // If there's no question on the current page, try to go to change page,
    // or submit the form.
    const next = enketoContainer.find('.btn.next-page:enabled:not(.disabled)');
    if (next.length) {
      next.trigger('click');
    } else {
      enketoContainer.find('.btn.submit').trigger('click');
    }
  }

  private convertContactSummaryToXML(contactSummaries:(ContactSummary|undefined)[]) {
    const convertSummary = (summary) => {
      if (!summary) {
        return;
      }
      const xmlStr = pojo2xml({ context: summary });
      return new DOMParser().parseFromString(xmlStr, 'text/xml');
    };

    try {
      const summaries:ContactSummaryXml[] = [];
      for (const contactSummary of contactSummaries) {
        const contactSummaryXml = convertSummary(contactSummary?.context);
        if (contactSummary && contactSummaryXml) {
          summaries.push({
            id: contactSummary.id,
            xml: contactSummaryXml
          });
        }
      }

      return summaries;
    } catch (e) {
      console.error('Error while converting app_summary.contact_summary.context to xml.', e);
      throw new Error('contact_summary context is misconfigured');
    }
  }

  private async getEnketoForm(xmlFormContext:XmlFormContext, userSettings) {
    const instanceStr = this.enketoPrepopulationDataService.get(
      userSettings,
      xmlFormContext.formConfig.model,
      xmlFormContext.instanceData
    );
    const options: EnketoOptions = {
      modelStr: xmlFormContext.formConfig.model,
      instanceStr: instanceStr,
      external: this.convertContactSummaryToXML([xmlFormContext.contactSummary, xmlFormContext.userContactSummary]),
    };
    const form = xmlFormContext.wrapper.find('form')[0];
    return new window.EnketoForm(form, options, { language: userSettings.language });
  }

  private renderFromXmls(xmlFormContext: XmlFormContext, userSettings) {
    const { formConfig, titleKey, wrapper, isFormInModal } = xmlFormContext;

    const formContainer = wrapper.find('.container').first();
    formContainer.html($(formConfig.html).get(0)!);

    return this
      .getEnketoForm(xmlFormContext, userSettings)
      .then((form) => {
        this.currentForm = form;
        const loadErrors = this.currentForm.init();
        if (loadErrors?.length) {
          return Promise.reject(new Error(JSON.stringify(loadErrors)));
        }
      })
      .then(() => this.getFormTitle(titleKey, formConfig.doc))
      .then((title) => {
        this.setFormTitle(wrapper, title);
        wrapper.show();
        wrapper
          .find('input')
          .on('keydown', this.handleKeypressOnInputField);

        this.setNavigation(this.currentForm, wrapper, !isFormInModal);
        this.addPopStateHandler(this.currentForm, wrapper);
        this.forceRecalculate(this.currentForm);
        // forceRecalculate can cause form to be marked as edited
        this.currentForm.editStatus = false;
        this.setupNavButtons(wrapper, 0);
        return this.currentForm;
      });
  }

  private getFormTitle(titleKey, doc) {
    if (titleKey) {
      // using translation key
      return this.translateService.get(titleKey);
    }

    if (doc.title) {
      // title defined in the doc
      return Promise.resolve(this.translateFromService.get(doc.title));
    }
  }

  private setFormTitle($wrapper, title) {
    // manually translate the title as enketo-core doesn't have any way to do this
    // https://github.com/enketo/enketo-core/issues/405
    const $title = $wrapper.find('#form-title');
    if (title) {
      // overwrite contents
      $title.text(title);
    } else if ($title.text() === 'No Title') {
      // useless enketo default - remove it
      $title.remove();
    } // else the title is hardcoded in the form definition - leave it alone
  }

  private setNavigation(form, $wrapper, useWindowHistory = true) {
    if (useWindowHistory) {
      // Handle page turning using browser history
      window.history.replaceState({ enketo_page_number: 0 }, '');
    }

    $wrapper
      .find('.btn.next-page')
      .off('.pagemode')
      .on('click.pagemode', () => {
        form.pages
          ._next()
          .then(valid => {
            if (valid) {
              const currentIndex = form.pages._getCurrentIndex();
              if (useWindowHistory) {
                window.history.pushState({ enketo_page_number: currentIndex }, '');
              }
              this.setupNavButtons($wrapper, currentIndex);
            }
            this.forceRecalculate(form);
          });
        return false;
      });

    $wrapper
      .find('.btn.previous-page')
      .off('.pagemode')
      .on('click.pagemode', () => {
        let pageIndex;

        if (useWindowHistory) {
          window.history.back();
          pageIndex = form.pages._getCurrentIndex() - 1;
        } else {
          form.pages._prev();
          pageIndex = form.pages._getCurrentIndex();
        }

        this.setupNavButtons($wrapper, pageIndex);
        this.forceRecalculate(form);
        return false;
      });
  }

  private addPopStateHandler(form, $wrapper) {
    $(window).on('popstate.enketo-pagemode', (event: any) => {
      if (event.originalEvent?.state &&
        typeof event.originalEvent.state.enketo_page_number === 'number' &&
        $wrapper.find('.container').not(':empty')) {

        const targetPage = event.originalEvent.state.enketo_page_number;
        const pages = form.pages;
        const currentIndex = pages._getCurrentIndex();
        if (targetPage > currentIndex) {
          pages._next();
        } else {
          pages._prev();
        }
      }
    });
  }

  private registerEditedListener($selector, listener) {
    if (listener) {
      $selector.on('edited', () => this.ngZone.run(() => listener()));
    }
  }

  private registerValuechangeListener($selector, listener) {
    if (listener) {
      $selector.on('xforms-value-changed', () => this.ngZone.run(() => listener()));
    }
  }

  private registerAddrepeatListener($selector, formDoc) {
    $selector.on('addrepeat', (ev) => {
      setTimeout(() => { // timeout to allow enketo to finish first
        this.replaceMediaLoaders($(ev.target), formDoc);
      });
    });
  }

  private registerEnketoListeners($selector, form, formContext: EnketoFormContext) {
    this.registerAddrepeatListener($selector, formContext.formConfig.doc);
    this.registerEditedListener($selector, formContext.editedListener);
    this.registerValuechangeListener($selector, formContext.valuechangeListener);
    this.registerValuechangeListener($selector,
      () => this.setupNavButtons($selector, form.pages._getCurrentIndex()));
  }

  public async renderForm(formContext: EnketoFormContext, userSettings): Promise<EnketoForm> {
    const {
      formConfig,
      instanceData,
      selector,
      titleKey,
      isFormInModal,
    } = formContext;

    const $html = $(formConfig.html);
    this.replaceDataI18nTranslations($html);
    this.replaceJavarosaMediaWithLoaders($html);
    const xmlFormContext: XmlFormContext = {
      formConfig,
      wrapper: $(selector),
      instanceData,
      titleKey,
      isFormInModal,
      contactSummary: formContext.contactSummary,
      userContactSummary: formContext.userContactSummary,
    };
    const form = await this.renderFromXmls(xmlFormContext, userSettings);
    const formContainer = xmlFormContext.wrapper.find('.container').first();
    this.replaceMediaLoaders(formContainer, formConfig.doc);
    this.registerEnketoListeners(xmlFormContext.wrapper, form, formContext);
    window.CHTCore.debugFormModel = () => form.model.getStr();
    return { form, config: formConfig };
  }

  private forceRecalculate(form) {
    // Work-around for stale jr:choice-name() references in labels.  ref #3870
    form.calc.update();

    // Force forms to update jr:itext references in output fields that contain
    // calculated values.  ref #4111
    form.output.update();
  }

  private setupNavButtons($wrapper, currentIndex) {
    if (!this.currentForm?.pages) {
      return;
    }
    const lastIndex = this.currentForm.pages.activePages.length - 1;
    const footer = $wrapper.find('.form-footer');
    footer.removeClass('end');
    footer.find('.previous-page, .next-page').removeClass('disabled');

    if (currentIndex >= lastIndex) {
      footer.addClass('end');
      footer.find('.next-page').addClass('disabled');
    }
    if (currentIndex <= 0) {
      footer.find('.previous-page').addClass('disabled');
    }
  }

  public async saveContact({ config, form }: EnketoForm, defaultData: Record<string, any>) {
    return this.ngZone.runOutsideAngular(async () => {
      await this.validate(form);
      const contactDoc = this.initializeDoc(defaultData);
      const formData = new EnektoContactFormData(
        this.getFormDataXml(form),
        contactDoc._id,
        isHardcodedType(contactDoc.type) ? contactDoc.type : contactDoc.contact_type
      );

      const formAttachments = this.processFormAttachments(config.doc.internalId, formData, contactDoc._attachments);

      const rootOutputDoc: Record<string, any> = {
        ...contactDoc,
        ...formData.deserializeDoc(config),
        type: contactDoc.type,
        contact_type: contactDoc.contact_type,
        _attachments: formAttachments
      };

      const siblings = EnektoContactFormData.SIBLING_FIELD_NAMES
        .map(fieldName => ({ fieldName, doc: formData.getSiblingData(fieldName)?.deserializeDoc(config) }))
        .map(({ fieldName, doc }) => ({ fieldName, doc: this.initializeContactSibling(rootOutputDoc, doc)}));
      await Promise.all(siblings.map(async ({ fieldName, doc }) => {
        rootOutputDoc[fieldName] = await this.getContactSiblingValue(
          doc, rootOutputDoc[fieldName], defaultData[fieldName]
        );
      }));
      const outputSiblings = siblings
        .filter(({ fieldName, doc }) => doc && rootOutputDoc[fieldName] === doc)
        .map(({ doc }) => doc)
        .filter(doc => !!doc);

      const childDocs = formData
        .getChildData()
        .map(doc => this.initializeDoc(doc.deserializeDoc(config)))
        .map(doc => ({ ...doc, parent: rootOutputDoc }));

      return {
        docId: rootOutputDoc._id,
        preparedDocs: [rootOutputDoc, ...outputSiblings, ...childDocs].map(doc => this.dehydrateContactLineage(doc))
      };
    });
  }

  public async saveReport({ config, form }: EnketoForm, defaultData: Record<string, any>) {
    return this.ngZone.runOutsideAngular(async () => {
      await this.validate(form);
      const { internalId, xmlVersion } = config.doc;
      const reportDoc: Record<string, any> = this.initializeReportDoc(internalId, xmlVersion, defaultData);
      const formData = new EnketoReportFormData(this.getFormDataXml(form), reportDoc._id);
      const subDocsData = formData.getDbDocData();

      // As of 4.0.0, content is no longer stored in legacy fields
      delete reportDoc[REPORT_ATTACHMENT_NAME];
      delete reportDoc._attachments?.[REPORT_ATTACHMENT_NAME];

      this.populateDbDocRefElements(formData, [formData, ...subDocsData]);
      const attachments = this.processFormAttachments(config.doc.internalId, formData, reportDoc._attachments);
      const hiddenFields = this.getHiddenFields([
        ...formData.hiddenElements,
        ...subDocsData.map(({ rootElement }) => rootElement)
      ]);

      const rootOutputDoc: Record<string, any> = {
        ...reportDoc,
        hidden_fields: hiddenFields,
        fields: formData.deserialize(config),
        _attachments: attachments
      };

      const dbDocObjects = subDocsData
        .map(docData => docData.deserializeDoc(config))
        .map(doc => this.initializeDoc(doc));
      return [rootOutputDoc, ...dbDocObjects];
    });
  }

  private async validate(form: Record<string, any>) {
    const valid = await form.validate();
    if (!valid) {
      throw new FormValidationError();
    }
    form.view.html.dispatchEvent(events.BeforeSave());
  }

  private getFormDataXml(form: Record<string, any>) {
    const formString = form.getDataStr({ irrelevant: false });
    return new DOMParser().parseFromString(formString, 'text/xml');
  }

  private initializeContactSibling(rootContactDoc: Record<string, any>, rawSibling?: Record<string, any>) {
    if (!rawSibling) {
      return;
    }
    return {
      type: 'person', // legacy support - form data should override this
      ...this.initializeDoc(rawSibling),
      parent: rawSibling.parent === 'PARENT' ? rootContactDoc : rawSibling.parent
    };
  }

  private async getContactSiblingValue(
    sibling?: Record<string, any>,
    currentValue?: Record<string, string>,
    defaultValue?: Record<string, unknown>
  ) {
    if (!currentValue?._id) {
      return undefined;
    }
    if (currentValue._id === 'NEW') {
      return sibling;
    }
    if (currentValue._id === defaultValue?._id) {
      return defaultValue;
    }

    return await this.getContactFromDatasource(Qualifier.byUuid(currentValue._id));
  }

  private dehydrateContactLineage(contactDoc: Record<string, any>) {
    return {
      ...contactDoc,
      parent: this.extractLineageService.extract(contactDoc.parent),
      contact: this.extractLineageService.extract(contactDoc.contact)
    };
  }

  private getHiddenFields(elements: Element[]) {
    const hiddenXpaths = new Set(elements.map((element) => Xpath.getElementRawXPath(element)));
    const hasHiddenAncestor = (
      segments: string[]
    ) => (_: string, i: number) => i > 0 && hiddenXpaths.has(segments.slice(0, i).join('/'));
    return [...hiddenXpaths]
      .map(xpath => xpath.split('/'))
      .filter(segments => !segments.some(hasHiddenAncestor(segments)))
      .map(segments => segments
        .filter(Boolean)
        .slice(1)
        .join('.'));
  }

  private initializeDoc(defaultData: Record<string, any>): Record<string, any> {
    return {
      _id: defaultData._id || uuid(),
      reported_date: Date.now(),
      ...defaultData
    };
  }

  private initializeReportDoc(form: string, formVersion: string, defaultData: Record<string, any>) {
    return {
      form,
      type: DOC_TYPES.DATA_RECORD,
      content_type: 'xml',
      from: defaultData.contact?.phone,
      ...this.initializeDoc(defaultData),
      contact: this.extractLineageService.extract(defaultData.contact),
      form_version: formVersion
    };
  }

  private populateDbDocRefElements(formData: EnketoReportFormData, allData: EnketoFormData[]) {
    formData.dbDocRefElements.forEach(element => {
      const reference = element.getAttribute('db-doc-ref');
      const referencedNode = formData.getNodeByXpath(element, reference);
      if (!referencedNode) {
        return;
      }
      const refDoc = allData.find(({ rootElement }) => rootElement === referencedNode);
      if (refDoc) {
        element.textContent = refDoc.id;
      }
    });
  }

  private buildBinaryAttachmentData(form: string, originalAttachments: Record<string, any>, element: Element) {
    const xpath = Xpath.getElementTreeXPath(element);
    const formXpath = xpath.replace(/^\/[^/]+/, `/${form}`);
    const filename = `${this.USER_BINARY_ATTACHMENT_PREFIX}${formXpath}`;
    const data = element.textContent;
    element.textContent = '';
    return {
      filename,
      // Currently do not support loading binary attachment data into edit form. So, keep existing value.
      attachment: data ? { data, content_type: 'image/png' } : originalAttachments[filename]
    };
  }

  private processFormAttachments(
    form: string,
    rootData: EnketoRootFormData,
    originalAttachments: Record<string, any> = {}
  ) {
    const hasCustomAttachmentName = (fileName: string) => !fileName.startsWith(this.USER_FILE_ATTACHMENT_PREFIX)
      && !fileName.startsWith(`${this.USER_BINARY_ATTACHMENT_PREFIX}/`);
    const isExistingFileAttachment = (fileName: string) => fileName.startsWith(this.USER_FILE_ATTACHMENT_PREFIX)
      && rootData.findNodeWithTextContent(fileName.slice(this.USER_FILE_ATTACHMENT_PREFIX.length));
    const binaryAttachments = rootData.binaryTypeElements
      .map(element => this.buildBinaryAttachmentData(form, originalAttachments, element))
      .filter(({ attachment }) => attachment)
      .reduce((acc, { filename, attachment }) => ({ ...acc, [filename]: attachment }), {});
    const newFileAttachments = FileManager
      .getCurrentFiles()
      .map(file => ({
        name: `${this.USER_FILE_ATTACHMENT_PREFIX}${file.name}`,
        content_type: file.type,
        data: new Blob([ file ], { type: file.type })
      }))
      .reduce((acc, { name, content_type, data }) => ({ ...acc, [name]: { content_type, data } }), {});
    const existingAttachments = Object
      .entries(originalAttachments)
      // Keep custom attachments and existing file attachments still referenced by a field
      .filter(([key]) => hasCustomAttachmentName(key) || isExistingFileAttachment(key))
      .reduce((acc, [key, attachment]) => ({ ...acc, [key]: attachment }), {});

    const attachments = {
      ...existingAttachments,
      ...newFileAttachments,
      ...binaryAttachments
    };
    return Object.keys(attachments).length ? attachments : undefined;
  }

  unload(form) {
    if (form !== this.currentForm) {
      return;
    }

    $(window).off('.enketo-pagemode');
    form?.resetView();
    // unload blobs
    this.objUrls.forEach((url) => {
      (window.URL || window.webkitURL).revokeObjectURL(url);
    });

    delete window.CHTCore.debugFormModel;
    delete this.currentForm;
    this.objUrls.length = 0;
  }
}

export interface ContactSummary {
  id: string;
  context: Record<string, any>;
}

interface ContactSummaryXml {
  id: string;
  xml: Document;
}

interface EnketoOptions {
  modelStr: string;
  instanceStr: string;
  external: ContactSummaryXml[];
}

interface XmlFormContext {
  formConfig: FormConfig;
  wrapper: JQuery;
  instanceData?: string | Record<string, any>; // String for report forms, Record<> for contact forms.
  titleKey?: string;
  isFormInModal?: boolean;
  contactSummary?: ContactSummary;
  userContactSummary?: ContactSummary;
}

export interface EnketoFormContext {
  readonly selector: string;
  readonly formConfig: FormConfig;
  readonly instanceData?: string | Record<string, any>;
  readonly editedListener?: () => void;
  readonly valuechangeListener?: () => void;
  readonly titleKey?: string;
  readonly isFormInModal?: boolean;
  readonly contactSummary?: ContactSummary;
  readonly userContactSummary?: ContactSummary;
}

export interface EnketoForm {
  form: Record<string, any>
  config: FormConfig
}

export class FormValidationError extends Error {
  constructor(message = 'Form is invalid') {
    super(message);
    this.name = 'FormValidationError';
  }
}
