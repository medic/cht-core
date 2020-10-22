import { Injectable } from '@angular/core';
import { v4 as uuid } from 'uuid';
import * as pojo2xml from 'pojo2xml';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';

import { Xpath } from '@mm-providers/xpath-element-path.provider';
import * as medicXpathExtensions from '../../js/enketo/medic-xpath-extensions';
import { AddAttachmentService } from '@mm-services/add-attachment.service';
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


/* globals EnketoForm */
@Injectable({
  providedIn: 'root'
})
export class EnketoService {
  constructor(
    private store:Store,
    private addAttachmentService:AddAttachmentService,
    // todo contact summary
    private dbService:DbService,
    private enketoPrepopulationDataService:EnketoPrepopulationDataService,
    private enketoTranslationService:EnketoTranslationService,
    private extractLineageService:ExtractLineageService,
    private fileReaderService:FileReaderService,
    private getReportContentService:GetReportContentService,
    private languageService:LanguageService,
    private lineageModelGeneratorService:LineageModelGeneratorService,
    private searchService:SearchService,
    private submitFormBySmsService:SubmitFormBySmsService,
    private translateFromService:TranslateFromService,
    private userContactService:UserContactService,
    private xmlFormsService:XmlFormsService,
    private zScoreService:ZScoreService,
    private translateService:TranslateService,
  ) {
    this.inited = this.init();
    this.servicesActions = new ServicesActions(this.store);
  }

  private servicesActions;
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
        medicXpathExtensions.init(zscoreUtil);
      })
      .catch(function(err) {
        console.error('Error initialising zscore util', err);
      });
  }

  private replaceJavarosaMediaWithLoaders(formDoc, formHtml) {
    formHtml.find('[data-media-src]').each(function() {
      const $img = $(this);
      const lang = $img.attr('lang');
      const active = $img.is('.active') ? 'active' : '';
      $img
        .css('visibility', 'hidden')
        .wrap(() => '<div class="loader ' + active + '" lang="' + lang + '"></div>');
    });
  }

  private replaceMediaLoaders(formContainer, formDoc) {
    const $service = this;
    formContainer.find('[data-media-src]').each(function() {
      const elem = $(this);
      const src = elem.attr('data-media-src');
      $service.dbService
        .get()
        .getAttachment(formDoc._id, src)
        .then((blob) => {
          const objUrl = (window.URL || window.webkitURL).createObjectURL(blob);
          $service.objUrls.push(objUrl);
          elem
            .attr('src', objUrl)
            .css('visibility', '')
            .unwrap();
        })
        .catch(function(err) {
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

  private getFormAttachment(doc) {
    return this.getAttachment(doc._id, this.xmlFormsService.findXFormAttachmentName(doc));
  }

  private transformXml(form, language) {
    return Promise
      .all([
        this.getAttachment(form._id, this.HTML_ATTACHMENT_NAME),
        this.getAttachment(form._id, this.MODEL_ATTACHMENT_NAME)
      ])
      .then(([html, model]) => {
        const $html = $(html);
        const $translate = this.translateService;
        $html.find('[data-i18n]').each(function() {
          const $this = $(this);
          $this.text($translate.instant('enketo.' + $this.attr('data-i18n')));
        });

        // TODO remove this when our enketo-core dependency is updated as the latest
        //      version uses the language passed to the constructor
        const languages = $html.find('#form-languages option');
        if (languages.length > 1) { // TODO how do we detect a non-localized form?
          // for localized forms, change language to user's language
          $html
            .find('[lang]')
            .removeClass('active')
            .filter('[lang="' + language + '"], [lang=""]')
            .filter(function() {
              // localized forms can support a short and long version for labels
              // Enketo takes this into account when switching languages
              // https://opendatakit.github.io/xforms-spec/#languages
              return !$(this).hasClass('or-form-short') ||
                ($(this).hasClass('or-form-short') && $(this).siblings( '.or-form-long' ).length === 0 );
            })
            .addClass( 'active' );
        }

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
    if(!window.medicmobile_android || (e.keyCode !== 9 && e.keyCode !== 13)) {
      return;
    }

    const $this = $(this);

    // stop the keypress from being handled elsewhere
    e.preventDefault();

    const $thisQuestion = $this.closest('.question');

    // If there's another question on the current page, focus on that
    if($thisQuestion.attr('role') !== 'page') {
      const $nextQuestion = $thisQuestion.find(
        '~ .question:not(.disabled):not(.or-appearance-hidden), ~ .repeat-buttons button.repeat:not(:disabled)'
      );
      if($nextQuestion.length) {
        if($nextQuestion[0].tagName !== 'LABEL') {
          // The next question is something complicated, so we can't just
          // focus on it.  Next best thing is to blur the current selection
          // so the on-screen keyboard closes.
          $this.trigger('blur');
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
    $this.trigger('change');

    const enketoContainer = $thisQuestion.closest('.enketo');

    // If there's no question on the current page, try to go to change page,
    // or submit the form.
    const next = enketoContainer.find('.btn.next-page:enabled:not(.disabled)');
    if(next.length) {
      next.trigger('click');
    } else {
      //todo
      //angular.element(enketoContainer.find('.btn.submit')).triggerHandler('click');
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
    const subjectIds = [ contact._id ];
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
        return {};
        // todo
        //return this.contactSummaryService(contact, reports, lineage);
      })
      .then((summary:any) => {
        if (!summary) {
          return;
        }

        try {
          return {
            id: 'contact-summary',
            xmlStr: pojo2xml({ context: summary.context })
          };
        } catch (e) {
          console.error('Error while converting app_summary.contact_summary.context to xml.');
          throw new Error('contact_summary context is misconfigured');
        }
      });
  }

  private getEnketoOptions(doc, instanceData) {
    return Promise
      .all([
        this.enketoPrepopulationDataService.get(doc.model, instanceData),
        this.getContactSummary(doc, instanceData),
        this.languageService.get()
      ])
      .then(([ instanceStr, contactSummary, language ]) => {
        const options:any = {
          modelStr: doc.model,
          instanceStr: instanceStr,
          language: language
        };
        if (contactSummary) {
          options.external = [ contactSummary ];
        }
        return options;
      });
  }

  private renderFromXmls(doc, wrapper, instanceData) {
    wrapper
      .find('.form-footer')
      .addClass('end')
      .find('.previous-page,.next-page')
      .addClass('disabled');

    const formContainer = wrapper.find('.container').first();
    formContainer.html(doc.html);

    return this.getEnketoOptions(doc, instanceData).then((options) => {
      this.currentForm = new window.EnketoForm(wrapper.find('form').first(), options);
      const loadErrors = this.currentForm.init();
      if (loadErrors && loadErrors.length) {
        return Promise.reject(new Error(JSON.stringify(loadErrors)));
      }
      // manually translate the title as enketo-core doesn't have any way to do this
      // https://github.com/enketo/enketo-core/issues/405
      const $title = wrapper.find('#form-title');
      if (doc.title) {
        // title defined in the doc - overwrite contents
        $title.text(this.translateFromService.get(doc.title));
      } else if ($title.text() === 'No Title') {
        // useless enketo default - remove it
        $title.remove();
      } // else the title is hardcoded in the form definition - leave it alone
      wrapper.show();

      wrapper.find('input').on('keydown', this.handleKeypressOnInputField);

      // handle page turning using browser history
      window.history.replaceState({ enketo_page_number: 0 }, '');
      this.overrideNavigationButtons(this.currentForm, wrapper);
      this.addPopStateHandler(this.currentForm, wrapper);
      this.forceRecalculate(this.currentForm);

      return this.currentForm;
    });
  }

  private overrideNavigationButtons(form, $wrapper) {
    $wrapper
      .find('.btn.next-page')
      .off('.pagemode')
      .on('click.pagemode',() => {
        form.pages
          .next()
          .then((newPageIndex) => {
            if(typeof newPageIndex === 'number') {
              window.history.pushState({ enketo_page_number: newPageIndex }, '');
            }
            this.forceRecalculate(form);
          });
        return false;
      });

    $wrapper
      .find('.btn.previous-page')
      .off('.pagemode')
      .on('click.pagemode', () => {
        window.history.back();
        this.forceRecalculate(form);
        return false;
      });
  }

  private addPopStateHandler(form, $wrapper) {
    $(window).on('popstate.enketo-pagemode', (event:any) => {
      if(event.originalEvent &&
        event.originalEvent.state &&
        typeof event.originalEvent.state.enketo_page_number === 'number') {
        const targetPage = event.originalEvent.state.enketo_page_number;

        if ($wrapper.find('.container').not(':empty')) {
          const pages = form.pages;
          pages.flipTo(pages.getAllActive()[targetPage], targetPage);
        }
      }
    });
  }

  private registerEditedListener($selector, listener) {
    if (listener) {
      $selector.on('edited.enketo', listener);
    }
  }

  private registerValuechangeListener($selector, listener) {
    if (listener) {
      $selector.on('valuechange.enketo', listener);
    }
  }

  private registerAddrepeatListener($selector, formDoc) {
    $selector.on('addrepeat', (ev) => {
      setTimeout(() => { // timeout to allow enketo to finish first
        this.replaceMediaLoaders($(ev.target), formDoc);
      });
    });
  }

  private renderForm(selector, formDoc, instanceData, editedListener, valuechangeListener) {
    return this.languageService.get().then(language => {
      const $selector = $(selector);
      return this
        .transformXml(formDoc, language)
        .then(doc => {
          this.replaceJavarosaMediaWithLoaders(formDoc, doc.html);
          return this.renderFromXmls(doc, $selector, instanceData);
        })
        .then((form) => {
          const formContainer = $selector.find('.container').first();
          this.replaceMediaLoaders(formContainer, formDoc);
          this.registerAddrepeatListener($selector, formDoc);
          this.registerEditedListener($selector, editedListener);
          this.registerValuechangeListener($selector, valuechangeListener);
          // todo move this to the new API
          //window.debugFormModel = () => form.model.getStr();
          return form;
        });
    });
  }

  render(selector, form, instanceData, editedListener, valuechangeListener) {
    return Promise.all([this.inited, this.getUserContact()]).then(() => {
      return this.renderForm(selector, form, instanceData, editedListener, valuechangeListener);
    });
  }

  renderContactForm(selector, formDoc, instanceData, editedListener, valuechangeListener) {
    return this.renderForm(selector, formDoc, instanceData, editedListener, valuechangeListener);
  }

  private xmlToDocs(doc, record) {
    const $service = this;
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
    }

    const getId = (xpath) => {
      return recordDoc
        .evaluate(xpath, recordDoc, null, XPathResult.ANY_TYPE, null)
        .iterateNext()
        //@ts-ignore
        ._couchId;
    }

    // Chrome 30 doesn't support $xml.outerHTML: #3880
    const getOuterHTML = (xml) => {
      if (xml.outerHTML) {
        return xml.outerHTML;
      }
      return $('<temproot>').append($(xml).clone()).html();
    }

    const recordDoc = $.parseXML(record);
    const $record = $($(recordDoc).children()[0]);
    mapOrAssignId($record[0], doc._id || uuid());

    $record.find('[db-doc]')
      .filter(function() {
        return $(this).attr('db-doc').toLowerCase() === 'true';
      })
      .each(() => {
        mapOrAssignId(this);
      });

    $record.find('[db-doc-ref]').each(function() {
      const $ref = $(this);
      const refId = getId($ref.attr('db-doc-ref'));
      $ref.text(refId);
    });

    const docsToStore = $record.find('[db-doc=true]').map(function() {
      const docToStore:any = $service.enketoTranslationService.reportRecordToJs(getOuterHTML(this));
      console.log(this);
      docToStore._id = getId(Xpath.getElementXPath(this));
      docToStore.reported_date = Date.now();
      return docToStore;
    }).get();

    doc._id = getId('/*');
    doc.hidden_fields = this.enketoTranslationService.getHiddenFieldList(record);

    const attach = (elem, file, type, alreadyEncoded, xpath?) => {
      xpath = xpath || Xpath.getElementXPath(elem);
      // replace instance root element node name with form internal ID
      const filename = 'user-file' +
        (xpath.startsWith('/' + doc.form) ? xpath : xpath.replace(/^\/[^/]+/, '/' + doc.form));
      $service.addAttachmentService.add(doc, filename, file, type, alreadyEncoded);
    };

    $record.find('[type=file]').each(function() {
      const xpath = Xpath.getElementXPath(this);
      const $input:any = $('input[type=file][name="' + xpath + '"]');
      const file = $input[0].files[0];
      if (file) {
        attach(this, file, file.type, false, xpath);
      }
    });

    $record.find('[type=binary]').each(function() {
      const file = $(this).text();
      if (file) {
        $(this).text('');
        attach(this, file, 'image/png', true);
      }
    });

    record = getOuterHTML($record[0]);

    this.addAttachmentService.add(doc, this.getReportContentService.REPORT_ATTACHMENT_NAME, record, 'application/xml');

    docsToStore.unshift(doc);

    return this.xmlFormsService
      .get(doc.form)
      .then(form => this.getFormAttachment(form))
      .then((form) => {
        doc.fields = this.enketoTranslationService.reportRecordToJs(record, form);
        return docsToStore;
      });
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
          const idx = docs.findIndex(doc => doc._id === result._id);
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
          const err:any = new Error('Your user does not have an associated contact, or does not have access to the ' +
            'associated contact. Talk to your administrator to correct this.');
          err.translationKey = 'error.loading.form.no_contact';
          throw err;
        }
        return contact;
      });
  }

  private create(formInternalId) {
    return this.getUserContact().then((contact) => {
      return {
        form: formInternalId,
        type: 'data_record',
        content_type: 'xml',
        reported_date: Date.now(),
        contact: this.extractLineageService.extract(contact),
        from: contact && contact.phone
      };
    });
  }

  private forceRecalculate(form) {
    // Work-around for stale jr:choice-name() references in labels.  ref #3870
    form.calc.update();

    // Force forms to update jr:itext references in output fields that contain
    // calculated values.  ref #4111
    form.output.update();
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

  save(formInternalId, form, geoHandle, docId) {
    return Promise
      .resolve(form.validate())
      .then((valid) => {
        if (!valid) {
          throw new Error('Form is invalid');
        }

        $('form.or').trigger('beforesave');

        if (docId) {
          return this.update(docId);
        }
        return this.create(formInternalId);
      })
      .then((doc) => {
        return this.xmlToDocs(doc, form.getDataStr({ irrelevant: false }));
      })
      .then(docs => this.saveGeo(geoHandle, docs))
      .then(docs => {
        this.servicesActions.setLastChangedDoc(docs[0]);
        return docs;
      })
      .then(docs => this.saveDocs(docs))
      .then((docs) => {
        // submit by sms _after_ saveDocs so that the main doc's ID is available
        this.submitFormBySmsService.submit(docs[0]);
        return docs;
      });
  }

  unload(form) {
    $(window).off('.enketo-pagemode');
    if (form) {
      form.resetView();
    }
    // unload blobs
    this.objUrls.forEach(function(url) {
      (window.URL || window.webkitURL).revokeObjectURL(url);
    });
    // todo
    //delete $window.debugFormModel;
    this.objUrls.length = 0;
  };
}
