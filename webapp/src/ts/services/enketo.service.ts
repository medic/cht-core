import { Injectable, NgZone } from '@angular/core';
import { v4 as uuid } from 'uuid';
import * as pojo2xml from 'pojo2xml';
import { Store } from '@ngrx/store';
import type JQuery from 'jquery';
import { toBik_text } from 'bikram-sambat';
import * as moment from 'moment';

import { Xpath } from '@mm-providers/xpath-element-path.provider';
import * as enketoConstants from './../../js/enketo/constants';
import * as medicXpathExtensions from '../../js/enketo/medic-xpath-extensions';
import { AttachmentService } from '@mm-services/attachment.service';
import { DbService } from '@mm-services/db.service';
import { EnketoPrepopulationDataService } from '@mm-services/enketo-prepopulation-data.service';
import { EnketoTranslationService } from '@mm-services/enketo-translation.service';
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
import { TranslateService } from '@mm-services/translate.service';
import { TransitionsService } from '@mm-services/transitions.service';
import { FeedbackService } from '@mm-services/feedback.service';
import { GlobalActions } from '@mm-actions/global';
import { TrainingCardsService } from '@mm-services/training-cards.service';

@Injectable({
  providedIn: 'root'
})
export class EnketoService {
  constructor(
    private store: Store,
    private attachmentService: AttachmentService,
    private contactSummaryService: ContactSummaryService,
    private dbService: DbService,
    private enketoPrepopulationDataService: EnketoPrepopulationDataService,
    private enketoTranslationService: EnketoTranslationService,
    private extractLineageService: ExtractLineageService,
    private fileReaderService: FileReaderService,
    private getReportContentService: GetReportContentService,
    private languageService: LanguageService,
    private lineageModelGeneratorService: LineageModelGeneratorService,
    private searchService: SearchService,
    private submitFormBySmsService: SubmitFormBySmsService,
    private translateFromService: TranslateFromService,
    private userContactService: UserContactService,
    private xmlFormsService: XmlFormsService,
    private zScoreService: ZScoreService,
    private trainingCardsService: TrainingCardsService,
    private transitionsService: TransitionsService,
    private translateService: TranslateService,
    private feedbackService:FeedbackService,
    private ngZone: NgZone,
  ) {
    this.inited = this.init();
    this.globalActions = new GlobalActions(store);
    this.servicesActions = new ServicesActions(this.store);
  }

  private globalActions: GlobalActions;
  private servicesActions: ServicesActions;
  private readonly HTML_ATTACHMENT_NAME = 'form.html';
  private readonly MODEL_ATTACHMENT_NAME = 'model.xml';
  private readonly objUrls = [];
  private inited = false;

  private currentForm;
  getCurrentForm() {
    return this.currentForm;
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

  private getAttachment(id, name) {
    return this.dbService
      .get()
      .getAttachment(id, name)
      .then(blob => this.fileReaderService.utf8(blob));
  }

  private transformXml(form) {
    return Promise
      .all([
        this.getAttachment(form._id, this.HTML_ATTACHMENT_NAME),
        this.getAttachment(form._id, this.MODEL_ATTACHMENT_NAME)
      ])
      .then(([html, model]) => {
        const $html = $(html);
        $html.find('[data-i18n]').each((idx, element) => {
          const $element = $(element);
          $element.text(this.translateService.instant('enketo.' + $element.attr('data-i18n')));
        });

        const hasContactSummary = $(model).find('> instance[id="contact-summary"]').length === 1;
        return {
          html: $html,
          model: model,
          title: form.title,
          hasContactSummary: hasContactSummary
        };
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
    const contact = instanceData && instanceData.contact;
    if (!doc.hasContactSummary || !contact) {
      return Promise.resolve();
    }
    return Promise
      .all([
        this.getContactReports(contact),
        this.getLineage(contact)
      ])
      .then(([reports, lineage]) => {
        return this.contactSummaryService.get(contact, reports, lineage);
      })
      .then((summary: any) => {
        if (!summary) {
          return;
        }

        try {
          const xmlStr = pojo2xml({ context: summary.context });
          return {
            id: 'contact-summary',
            xml: new DOMParser().parseFromString(xmlStr, 'text/xml')
          };
        } catch (e) {
          console.error('Error while converting app_summary.contact_summary.context to xml.');
          throw new Error('contact_summary context is misconfigured');
        }
      });
  }

  private getEnketoForm(wrapper, doc, instanceData) {
    return Promise
      .all([
        this.enketoPrepopulationDataService.get(doc.model, instanceData),
        this.getContactSummary(doc, instanceData),
        this.languageService.get()
      ])
      .then(([ instanceStr, contactSummary, language ]) => {
        const options: EnketoOptions = {
          modelStr: doc.model,
          instanceStr: instanceStr
        };
        if (contactSummary) {
          options.external = [contactSummary];
        }
        const form = wrapper.find('form')[0];
        return new window.EnketoForm(form, options, { language });
      });
  }

  private renderFromXmls(xmlFormContext: XmlFormContext) {
    const { doc, instanceData, titleKey, wrapper, isFormInModal } = xmlFormContext;

    const formContainer = wrapper.find('.container').first();
    formContainer.html(doc.html.get(0));

    return this
      .getEnketoForm(wrapper, doc, instanceData)
      .then((form) => {
        this.currentForm = form;
        const loadErrors = this.currentForm.init();
        if (loadErrors?.length) {
          return Promise.reject(new Error(JSON.stringify(loadErrors)));
        }
      })
      .then(() => this.getFormTitle(titleKey, doc))
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

  private setNavigation(form, $wrapper, useWindowHistory=true) {
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
              this.pauseMultimedia($wrapper);
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
        this.pauseMultimedia($wrapper);
        return false;
      });
  }

  // This code can be removed once this issue is fixed: https://github.com/enketo/enketo-core/issues/816
  private pauseMultimedia($wrapper) {
    $wrapper
      .find('audio, video')
      .each((idx, element) => element.pause());
  }

  private addPopStateHandler(form, $wrapper) {
    $(window).on('popstate.enketo-pagemode', (event: any) => {
      if (event.originalEvent &&
        event.originalEvent.state &&
        typeof event.originalEvent.state.enketo_page_number === 'number' &&
        $wrapper.find('.container').not(':empty')) {

        const targetPage = event.originalEvent.state.enketo_page_number;
        const pages = form.pages;
        const currentIndex = pages._getCurrentIndex();
        if(targetPage > currentIndex) {
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

  private renderForm(formContext: EnketoFormContext) {
    const {
      editedListener,
      formDoc,
      instanceData,
      selector,
      titleKey,
      valuechangeListener,
      isFormInModal,
    } = formContext;

    this.unload(this.currentForm);
    const $selector = $(selector);
    return this
      .transformXml(formDoc)
      .then(doc => {
        this.replaceJavarosaMediaWithLoaders(doc.html);
        const xmlFormContext: XmlFormContext = {
          doc,
          wrapper: $selector,
          instanceData,
          titleKey,
          isFormInModal
        };
        return this.renderFromXmls(xmlFormContext);
      })
      .then((form) => {
        const formContainer = $selector.find('.container').first();
        this.replaceMediaLoaders(formContainer, formDoc);
        this.registerAddrepeatListener($selector, formDoc);
        this.registerEditedListener($selector, editedListener);
        this.registerValuechangeListener($selector, valuechangeListener);
        this.registerValuechangeListener($selector,
          () => this.setupNavButtons($selector, form.pages._getCurrentIndex()));

        window.CHTCore.debugFormModel = () => form.model.getStr();
        return form;
      }).catch(err => {
        const errorMessage = `Failed during the form "${formDoc.internalId}" rendering : `;
        console.error(errorMessage, err.message);
        this.feedbackService.submit(errorMessage + err.message, false);
        return Promise.reject(new Error(errorMessage + err.message));
      });
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
      .then(() => {
        const formContext: EnketoFormContext = {
          selector,
          formDoc: form,
          instanceData,
          editedListener,
          valuechangeListener,
          isFormInModal,
        };
        return this.renderForm(formContext);
      });
  }

  renderContactForm(formContext: EnketoFormContext) {
    return this.renderForm(formContext);
  }

  private xmlToDocs(doc, formXml, xmlVersion, record) {
    const recordDoc = $.parseXML(record);
    const $record = $($(recordDoc).children()[0]);
    const repeatPaths = this.enketoTranslationService.getRepeatPaths(formXml);

    const mapOrAssignId = (e, id?) => {
      if (!id) {
        const $id = $(e).children('_id');
        if ($id.length) {
          id = $id.text();
        }
        if (!id) {
          id = uuid();
        }
      }
      e._couchId = id;
    };

    mapOrAssignId($record[0], doc._id || uuid());

    const getId = (xpath) => {
      const xPathResult = recordDoc.evaluate(xpath, recordDoc, null, XPathResult.ANY_TYPE, null);
      let node = xPathResult.iterateNext();
      while (node) {
        if (node._couchId) {
          return node._couchId;
        }
        node = xPathResult.iterateNext();
      }
    };

    const getRelativePath = (path) => {
      if (!path) {
        return;
      }
      path = path.trim();

      const repeatReference = repeatPaths?.find(repeatPath => path === repeatPath || path.startsWith(`${repeatPath}/`));
      if (repeatReference) {
        if (repeatReference === path) {
          // when the path is the repeat element itself, return the repeat element node name
          return path.split('/').slice(-1)[0];
        }

        return path.replace(`${repeatReference}/`, '');
      }

      if (path.startsWith('./')) {
        return path.replace('./', '');
      }
    };

    const getClosestPath = (element, $element, path) => {
      const relativePath = getRelativePath(path);
      if (!relativePath) {
        return;
      }

      // assign a unique id for xpath context, since the element can be inside a repeat
      if (!element.id) {
        element.id = uuid();
      }
      const uniqueElementSelector = `${element.nodeName}[@id="${element.id}"]`;

      const closestPath = `//${uniqueElementSelector}/ancestor-or-self::*/descendant-or-self::${relativePath}`;
      try {
        recordDoc.evaluate(closestPath, recordDoc);
        return closestPath;
      } catch (err) {
        console.error('Error while evaluating closest path', closestPath, err);
      }
    };

    // Chrome 30 doesn't support $xml.outerHTML: #3880
    const getOuterHTML = (xml) => {
      if (xml.outerHTML) {
        return xml.outerHTML;
      }
      return $('<temproot>').append($(xml).clone()).html();
    };

    const dbDocTags = [];
    $record
      .find('[db-doc]')
      .filter((idx, element) => {
        return $(element).attr('db-doc').toLowerCase() === 'true';
      })
      .each((idx, element) => {
        mapOrAssignId(element);
        dbDocTags.push(element.tagName);
      });

    $record
      .find('[db-doc-ref]')
      .each((idx, element) => {
        const $element = $(element);
        const reference = $element.attr('db-doc-ref');
        const path = getClosestPath(element, $element, reference);

        const refId = (path && getId(path)) || getId(reference);
        $element.text(refId);
      });

    const docsToStore = $record
      .find('[db-doc=true]')
      .map((idx, element) => {
        const docToStore: any = this.enketoTranslationService.reportRecordToJs(getOuterHTML(element));
        docToStore._id = getId(Xpath.getElementXPath(element));
        docToStore.reported_date = Date.now();
        return docToStore;
      })
      .get();

    doc._id = getId('/*');
    if (xmlVersion) {
      doc.form_version = xmlVersion;
    }
    doc.hidden_fields = this.enketoTranslationService.getHiddenFieldList(record, dbDocTags);

    const attach = (elem, file, type, alreadyEncoded, xpath?) => {
      xpath = xpath || Xpath.getElementXPath(elem);
      // replace instance root element node name with form internal ID
      const filename = 'user-file' +
        (xpath.startsWith('/' + doc.form) ? xpath : xpath.replace(/^\/[^/]+/, '/' + doc.form));
      this.attachmentService.add(doc, filename, file, type, alreadyEncoded);
    };

    $record
      .find('[type=file]')
      .each((idx, element) => {
        const xpath = Xpath.getElementXPath(element);
        const $input: any = $('input[type=file][name="' + xpath + '"]');
        const file = $input[0].files[0];
        if (file) {
          attach(element, file, file.type, false, xpath);
        }
      });

    $record
      .find('[type=binary]')
      .each((idx, element) => {
        const file = $(element).text();
        if (file) {
          $(element).text('');
          attach(element, file, 'image/png', true);
        }
      });

    record = getOuterHTML($record[0]);

    // remove old style content attachment
    this.attachmentService.remove(doc, this.getReportContentService.REPORT_ATTACHMENT_NAME);
    docsToStore.unshift(doc);

    doc.fields = this.enketoTranslationService.reportRecordToJs(record, formXml);
    return docsToStore;
  }

  private saveDocs(docs) {
    return this.dbService
      .get()
      .bulkDocs(docs)
      .then((results) => {
        results.forEach((result) => {
          if (result.error) {
            console.error('Error saving report', result);
            throw new Error('Error saving report');
          }
          const idx = docs.findIndex(doc => doc._id === result.id);
          docs[idx] = { ...docs[idx], _rev: result.rev };
        });
        return docs;
      });
  }

  private update(docId) {
    // update an existing doc.  For convenience, get the latest version
    // and then modify the content.  This will avoid most concurrent
    // edits, but is not ideal.
    return this.dbService.get().get(docId).then((doc) => {
      // previously XML was stored in the content property
      // TODO delete this and other "legacy" code support commited against
      //      the same git commit at some point in the future?
      delete doc.content;
      return doc;
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

  private create(formInternalId) {
    return this
      .getUserContact()
      .then(contact => {
        const doc:any = {
          form: formInternalId,
          type: 'data_record',
          content_type: 'xml',
          reported_date: Date.now(),
          contact: this.extractLineageService.extract(contact),
          from: contact && contact.phone
        };

        if (this.trainingCardsService.isTrainingCardForm(formInternalId)) {
          doc._id = this.trainingCardsService.getTrainingCardDocId();
        }

        return doc;
      });
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

  save(formInternalId, form, geoHandle, docId?) {
    return Promise
      .resolve(form.validate())
      .then((valid) => {
        if (!valid) {
          throw new Error('Form is invalid');
        }

        $('form.or').trigger('beforesave');

        return this.ngZone.runOutsideAngular(() => this._save(formInternalId, form, geoHandle, docId));
      });
  }

  private _save(formInternalId, form, geoHandle, docId?) {
    const getDocPromise = docId ? this.update(docId) : this.create(formInternalId);

    return Promise
      .all([
        getDocPromise,
        this.xmlFormsService.getDocAndFormAttachment(formInternalId)
      ])
      .then(([doc, formDoc]) => {
        const dataString = form.getDataStr({ irrelevant: false });
        return this.xmlToDocs(doc, formDoc.xml, formDoc.doc.xmlVersion, dataString);
      })
      .then(docs => this.validateAttachments(docs))
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

interface ContactSummary {
  id: string;
  xml: Document;
}

interface EnketoOptions {
  modelStr: string;
  instanceStr: string;
  external?: ContactSummary[];
}

interface XmlFormContext {
  doc: {
    html: JQuery;
    model: string;
    title: string;
    hasContactSummary: boolean;
  };
  wrapper: JQuery;
  instanceData: string|Record<string, any>; // String for report forms, Record<> for contact forms.
  titleKey: string;
  isFormInModal?: boolean;
}

export interface EnketoFormContext {
  selector: string;
  formDoc: Record<string, any>;
  instanceData: string|Record<string, any>; // String for report forms, Record<> for contact forms.
  editedListener: () => void;
  valuechangeListener: () => void;
  titleKey?: string;
  isFormInModal?: boolean;
}
