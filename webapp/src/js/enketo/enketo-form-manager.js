const uuid = require('uuid').v4;
const pojo2xml = require('pojo2xml');
const $ = require('jquery');
const { getElementXPath } = require('./xpath-element-path');
const enketoConstants = require('./constants');
const EnketoDataPrepopulator = require('./enketo-data-prepopulator');
const EnketoDataTranslator = require('./enketo-data-translator');
const ContactSaver = require('./contact-saver');

const HTML_ATTACHMENT_NAME = 'form.html';
const MODEL_ATTACHMENT_NAME = 'model.xml';

const getUserContact = (userContactService) => {
  return userContactService
    .get()
    .then((contact) => {
      if(!contact) {
        const err = new Error('Your user does not have an associated contact, or does not have access to the ' +
          'associated contact. Talk to your administrator to correct this.');
        err.translationKey = 'error.loading.form.no_contact';
        throw err;
      }
      return contact;
    });
};

const getAttachment = (fileServices, id, name) => {
  return fileServices.db
    .get()
    .getAttachment(id, name)
    .then(blob => fileServices.fileReader.utf8(blob));
};

const transformXml = (fileServices, translateService, form) => {
  return Promise
    .all([
      getAttachment(fileServices, form._id, HTML_ATTACHMENT_NAME),
      getAttachment(fileServices, form._id, MODEL_ATTACHMENT_NAME)
    ])
    .then(([html, model]) => {
      const $html = $(html);
      $html.find('[data-i18n]').each((idx, element) => {
        const $element = $(element);
        $element.text(translateService.instant('enketo.' + $element.attr('data-i18n')));
      });

      const hasContactSummary = $(model).find('> instance[id="contact-summary"]').length === 1;
      return {
        html: $html,
        model: model,
        title: form.title,
        hasContactSummary: hasContactSummary
      };
    });
};

const replaceJavarosaMediaWithLoaders = (formDoc, formHtml) => {
  formHtml.find('[data-media-src]').each((idx, element) => {
    const $img = $(element);
    const lang = $img.attr('lang');
    const active = $img.is('.active') ? 'active' : '';
    $img
      .css('visibility', 'hidden')
      .wrap(() => '<div class="loader ' + active + '" lang="' + lang + '"></div>');
  });
};

const getContactReports = (searchService, contact) => {
  const subjectIds = [contact._id];
  const shortCode = contact.patient_id || contact.place_id;
  if(shortCode) {
    subjectIds.push(shortCode);
  }
  return searchService.search('reports', { subjectIds: subjectIds }, { include_docs: true });
};

const getLineage = (lineageModelGeneratorService, contact) => {
  return lineageModelGeneratorService
    .contact(contact._id)
    .then((model) => model.lineage)
    .catch((err) => {
      if(err.code === 404) {
        // eslint-disable-next-line no-console
        console.warn(`Enketo failed to get lineage of contact '${contact._id}' because document does not exist`, err);
        return [];
      }

      throw err;
    });
};

const getContactSummary = (formDataServices, doc, instanceData) => {
  const contact = instanceData && instanceData.contact;
  if(!doc.hasContactSummary || !contact) {
    return Promise.resolve();
  }
  return Promise
    .all([
      getContactReports(formDataServices.search, contact),
      getLineage(formDataServices.lineageModelGenerator, contact)
    ])
    .then(([reports, lineage]) => {
      return formDataServices.contactSummary.get(contact, reports, lineage);
    })
    .then((summary) => {
      if(!summary) {
        return;
      }

      try {
        const xmlStr = pojo2xml({ context: summary.context });
        return {
          id: 'contact-summary',
          xml: new DOMParser().parseFromString(xmlStr, 'text/xml')
        };
      } catch(e) {
        // eslint-disable-next-line no-console
        console.error('Error while converting app_summary.contact_summary.context to xml.');
        throw new Error('contact_summary context is misconfigured');
      }
    });
};

const getEnketoForm = (formDataServices, wrapper, doc, instanceData) => {
  return Promise
    .all([
      formDataServices.enketoDataPrepopulator.get(doc.model, instanceData),
      getContactSummary(formDataServices, doc, instanceData),
      formDataServices.language.get()
    ])
    .then(([instanceStr, contactSummary, language]) => {
      const data = {
        modelStr: doc.model,
        instanceStr: instanceStr
      };
      if(contactSummary) {
        data.external = [contactSummary];
      }
      const form = wrapper.find('form')[0];
      return new window.EnketoForm(form, data, { language });
    });
};

const getFormTitle = (translationServices, titleKey, doc) => {
  if(titleKey) {
    // using translation key
    return translationServices.translate.get(titleKey);
  }

  if(doc.title) {
    // title defined in the doc
    return Promise.resolve(translationServices.translateFrom.get(doc.title));
  }
};

const setFormTitle = (wrapper, title) => {
  // manually translate the title as enketo-core doesn't have any way to do this
  // https://github.com/enketo/enketo-core/issues/405
  const $title = wrapper.find('#form-title');
  if(title) {
    // overwrite contents
    $title.text(title);
  } else if($title.text() === 'No Title') {
    // useless enketo default - remove it
    $title.remove();
  } // else the title is hardcoded in the form definition - leave it alone
};

// eslint-disable-next-line func-style
function handleKeypressOnInputField(e) {
  // Here we capture both CR and TAB characters, and handle field-skipping
  if(!window.medicmobile_android || (e.keyCode !== 9 && e.keyCode !== 13)) {
    return;
  }

  const $input = $(this);

  // stop the keypress from being handled elsewhere
  e.preventDefault();

  const $thisQuestion = $input.closest('.question');

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
  if(next.length) {
    next.trigger('click');
  } else {
    enketoContainer.find('.btn.submit').trigger('click');
  }
}

const setupNavButtons = (currentForm, $wrapper, currentIndex) => {
  if(!currentForm.pages) {
    return;
  }
  const lastIndex = currentForm.pages.activePages.length - 1;
  const footer = $wrapper.find('.form-footer');
  footer.removeClass('end');
  footer.find('.previous-page, .next-page').removeClass('disabled');

  if(currentIndex >= lastIndex) {
    footer.addClass('end');
    footer.find('.next-page').addClass('disabled');
  }
  if(currentIndex <= 0) {
    footer.find('.previous-page').addClass('disabled');
  }
};

const forceRecalculate = (form) => {
  // Work-around for stale jr:choice-name() references in labels.  ref #3870
  form.calc.update();

  // Force forms to update jr:itext references in output fields that contain
  // calculated values.  ref #4111
  form.output.update();
};

const overrideNavigationButtons = (form, $wrapper) => {
  $wrapper
    .find('.btn.next-page')
    .off('.pagemode')
    .on('click.pagemode', () => {
      form.pages
        ._next()
        .then(valid => {
          if(valid) {
            const currentIndex = form.pages._getCurrentIndex();
            window.history.pushState({ enketo_page_number: currentIndex }, '');
            setupNavButtons(form, $wrapper, currentIndex);
            pauseMultimedia($wrapper);
          }
          forceRecalculate(form);
        });
      return false;
    });

  $wrapper
    .find('.btn.previous-page')
    .off('.pagemode')
    .on('click.pagemode', () => {
      window.history.back();
      setupNavButtons(form, $wrapper, form.pages._getCurrentIndex() - 1);
      forceRecalculate(form);
      pauseMultimedia($wrapper);
      return false;
    });
};

// This code can be removed once this issue is fixed: https://github.com/enketo/enketo-core/issues/816
const pauseMultimedia = ($wrapper) => {
  $wrapper
    .find('audio, video')
    .each((idx, element) => element.pause());
};

const addPopStateHandler = (form, $wrapper) => {
  $(window).on('popstate.enketo-pagemode', (event) => {
    if(event.originalEvent &&
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
};

const renderFromXmls = (formDataServices, translationServices, xmlFormContext) => {
  const { doc, instanceData, titleKey, wrapper } = xmlFormContext;

  const formContainer = wrapper.find('.container').first();
  formContainer.html(doc.html.get(0));

  return Promise.all([
    getEnketoForm(formDataServices, wrapper, doc, instanceData).then((form) => {
      const loadErrors = form.init();
      if(loadErrors && loadErrors.length) {
        return Promise.reject(new Error(JSON.stringify(loadErrors)));
      }
      return form;
    }),
    getFormTitle(translationServices, titleKey, doc)
  ]).then(([form, title]) => {
    setFormTitle(wrapper, title);
    wrapper.show();

    wrapper.find('input').on('keydown', handleKeypressOnInputField);

    // handle page turning using browser history
    window.history.replaceState({ enketo_page_number: 0 }, '');
    overrideNavigationButtons(form, wrapper);
    addPopStateHandler(form, wrapper);
    forceRecalculate(form);
    setupNavButtons(form, wrapper, 0);
    return form;
  });
};

const update = (dbService, docId) => {
  // update an existing doc.  For convenience, get the latest version
  // and then modify the content.  This will avoid most concurrent
  // edits, but is not ideal.
  return dbService.get().get(docId).then((doc) => {
    // previously XML was stored in the content property
    // TODO delete this and other "legacy" code support commited against
    //      the same git commit at some point in the future?
    delete doc.content;
    return doc;
  });
};

const create = (contactServices, formInternalId) => {
  return getUserContact(contactServices.userContact).then((contact) => {
    return {
      form: formInternalId,
      type: 'data_record',
      content_type: 'xml',
      reported_date: Date.now(),
      contact: contactServices.extractLineage.extract(contact),
      from: contact && contact.phone
    };
  });
};

const xmlToDocs = (xmlServices, doc, formXml, xmlVersion, record) => {
  const recordDoc = $.parseXML(record);
  const $record = $($(recordDoc).children()[0]);
  const repeatPaths = EnketoDataTranslator.getRepeatPaths(formXml);

  const mapOrAssignId = (e, id) => {
    if(!id) {
      const $id = $(e).children('_id');
      if($id.length) {
        id = $id.text();
      }
      if(!id) {
        id = uuid();
      }
    }
    e._couchId = id;
  };

  mapOrAssignId($record[0], doc._id || uuid());

  const getId = (xpath) => {
    const xPathResult = recordDoc.evaluate(xpath, recordDoc, null, window.XPathResult.ANY_TYPE, null);
    let node = xPathResult.iterateNext();
    while(node) {
      if(node._couchId) {
        return node._couchId;
      }
      node = xPathResult.iterateNext();
    }
  };

  const getRelativePath = (path) => {
    if(!path) {
      return;
    }
    path = path.trim();

    if(repeatPaths) {
      const repeatReference = repeatPaths.find(repeatPath => path === repeatPath || path.startsWith(`${repeatPath}/`));
      if(repeatReference) {
        if(repeatReference === path) {
          // when the path is the repeat element itself, return the repeat element node name
          return path.split('/').slice(-1)[0];
        }

        return path.replace(`${repeatReference}/`, '');
      }
    }

    if(path.startsWith('./')) {
      return path.replace('./', '');
    }
  };

  const getClosestPath = (element, $element, path) => {
    const relativePath = getRelativePath(path);
    if(!relativePath) {
      return;
    }

    // assign a unique id for xpath context, since the element can be inside a repeat
    if(!element.id) {
      element.id = uuid();
    }
    const uniqueElementSelector = `${element.nodeName}[@id="${element.id}"]`;

    const closestPath = `//${uniqueElementSelector}/ancestor-or-self::*/descendant-or-self::${relativePath}`;
    try {
      recordDoc.evaluate(closestPath, recordDoc);
      return closestPath;
    } catch(err) {
      // eslint-disable-next-line no-console
      console.error('Error while evaluating closest path', closestPath, err);
    }
  };

  // Chrome 30 doesn't support $xml.outerHTML: #3880
  const getOuterHTML = (xml) => {
    if(xml.outerHTML) {
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
      const docToStore = EnketoDataTranslator.reportRecordToJs(getOuterHTML(element));
      docToStore._id = getId(getElementXPath(element));
      docToStore.reported_date = Date.now();
      return docToStore;
    })
    .get();

  doc._id = getId('/*');
  if (xmlVersion) {
    doc.form_version = xmlVersion;
  }
  doc.hidden_fields = EnketoDataTranslator.getHiddenFieldList(record, dbDocTags);

  const attach = (elem, file, type, alreadyEncoded, xpath) => {
    xpath = xpath || getElementXPath(elem);
    // replace instance root element node name with form internal ID
    const filename = 'user-file' +
      (xpath.startsWith('/' + doc.form) ? xpath : xpath.replace(/^\/[^/]+/, '/' + doc.form));
    xmlServices.addAttachment.add(doc, filename, file, type, alreadyEncoded);
  };

  $record
    .find('[type=file]')
    .each((idx, element) => {
      const xpath = getElementXPath(element);
      const $input = $('input[type=file][name="' + xpath + '"]');
      const file = $input[0].files[0];
      if(file) {
        attach(element, file, file.type, false, xpath);
      }
    });

  $record
    .find('[type=binary]')
    .each((idx, element) => {
      const file = $(element).text();
      if(file) {
        $(element).text('');
        attach(element, file, 'image/png', true);
      }
    });

  record = getOuterHTML($record[0]);

  // remove old style content attachment
  xmlServices.addAttachment.remove(doc, xmlServices.getReportContentService.REPORT_ATTACHMENT_NAME);

  docsToStore.unshift(doc);

  doc.fields = EnketoDataTranslator.reportRecordToJs(record, formXml);
  return docsToStore;
};

const validateAttachments = (docs, translateService, globalActions) => {
  const oversizeDoc = docs.find(doc => {
    let attachmentsSize = 0;

    if(doc._attachments) {
      Object
        .keys(doc._attachments)
        .forEach(name => {
          // It can be Base64 (binary) or object (file)
          const data = doc._attachments[name] ? doc._attachments[name].data : null;
          const getSize = data => data && data.size ? data.size : 0;
          const size = typeof data === 'string' ? data.length : getSize(data);
          attachmentsSize += size;
        });
    }

    return attachmentsSize > enketoConstants.maxAttachmentSize;
  });

  return new Promise((resolve, reject) => {
    if(oversizeDoc) {
      translateService.get('enketo.error.max_attachment_size')
        .then(errorMessage => {
          globalActions.setSnackbarContent(errorMessage);
          reject(new Error(errorMessage));
        });
    } else {
      resolve(docs);
    }
  });
};

const saveGeo = (geoHandle, docs) => {
  if(!geoHandle) {
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
};

const saveDocs = (dbService, docs) => {
  return dbService
    .get()
    .bulkDocs(docs)
    .then((results) => {
      results.forEach((result) => {
        if(result.error) {
          // eslint-disable-next-line no-console
          console.error('Error saving report', result);
          throw new Error('Error saving report');
        }
        const idx = docs.findIndex(doc => doc._id === result.id);
        docs[idx] = Object.assign({}, docs[idx]);
        docs[idx]._rev = result.rev;
      });
      return docs;
    });
};

class ContactServices {
  constructor(extractLineageService, userContactService, contactTypesService) {
    this.extractLineageService = extractLineageService;
    this.userContactService = userContactService;
    this.contactTypesService = contactTypesService;
  }

  get extractLineage() {
    return this.extractLineageService;
  }

  get userContact() {
    return this.userContactService;
  }

  get contactTypes() {
    return this.contactTypesService;
  }
}

class FileServices {
  constructor(dbService, fileReaderService) {
    this.dbService = dbService;
    this.fileReaderService = fileReaderService;
  }

  get db() {
    return this.dbService;
  }

  get fileReader() {
    return this.fileReaderService;
  }
}

class FormDataServices {
  constructor(
    contactSummaryService,
    userSettingsService,
    languageService,
    lineageModelGeneratorService,
    searchService
  ) {
    this.contactSummaryService = contactSummaryService;
    this.enketoDataPrepopulatorService = new EnketoDataPrepopulator(userSettingsService, languageService);
    this.languageService = languageService;
    this.searchService = searchService;
    this.lineageModelGeneratorService = lineageModelGeneratorService;
  }

  get contactSummary() {
    return this.contactSummaryService;
  }

  get enketoDataPrepopulator() {
    return this.enketoDataPrepopulatorService;
  }

  get language() {
    return this.languageService;
  }

  get search() {
    return this.searchService;
  }

  get lineageModelGenerator() {
    return this.lineageModelGeneratorService;
  }
}

class TranslationServices {
  constructor(translateService, translateFromService) {
    this.translateService = translateService;
    this.translateFromService = translateFromService;
  }

  get translate() {
    return this.translateService;
  }

  get translateFrom() {
    return this.translateFromService;
  }
}

class XmlServices {
  constructor(addAttachmentService, getReportContentService, xmlFormsService) {
    this.addAttachmentService = addAttachmentService;
    this.getReportContentService = getReportContentService;
    this.xmlFormsService = xmlFormsService;
  }

  get addAttachment() {
    return this.addAttachmentService;
  }

  get getReportContent() {
    return this.getReportContentService;
  }

  get xmlForms() {
    return this.xmlFormsService;
  }
}

class EnketoFormManager {
  constructor(
    contactServices,
    fileServices,
    formDataServices,
    translationServices,
    xmlServices,
    transitionsService,
    globalActions
  ) {
    this.contactServices = contactServices;
    this.fileServices = fileServices;
    this.formDataServices = formDataServices;
    this.translationServices = translationServices;
    this.xmlServices = xmlServices;
    this.transitionsService = transitionsService;
    this.globalActions = globalActions;

    this.contactSaver = new ContactSaver(contactServices, fileServices, transitionsService);

    this.currentForm = null;
    this.objUrls = [];
  }

  getCurrentForm() {
    return this.currentForm;
  }

  render(selector, form, instanceData) {
    return getUserContact(this.contactServices.userContact).then(() => {
      const formContext = {
        selector,
        formDoc: form,
        instanceData,
      };

      return this._renderForm(formContext);
    });
  }

  renderContactForm(formContext) {
    return this._renderForm(formContext);
  }

  validate(form) {
    return Promise
      .resolve(form.validate())
      .then((valid) => {
        if (!valid) {
          throw new Error('Form is invalid');
        }
      });
  }

  save(formInternalId, form, geoHandle, docId) {
    const getDocPromise = docId ? update(this.fileServices.db, docId) :
      create(this.contactServices, formInternalId);

    return Promise
      .all([
        getDocPromise,
        this.xmlServices.xmlForms.getDocAndFormAttachment(formInternalId)
      ])
      .then(([doc, formDoc]) => {
        const dataString = form.getDataStr({ irrelevant: false });
        return xmlToDocs(this.xmlServices, doc, formDoc.xml, formDoc.doc.xmlVersion, dataString);
      })
      .then(docs => validateAttachments(docs, this.translationServices.translateService, this.globalActions))
      .then((docs) => saveGeo(geoHandle, docs))
      .then((docs) => this.transitionsService.applyTransitions(docs))
      .then((docs) => saveDocs(this.fileServices.db, docs));
  }

  saveContactForm(form, docId, type, xmlVersion) {
    return this.contactSaver.save(form, docId, type, xmlVersion);
  }

  unload(form) {
    $(window).off('.enketo-pagemode');
    if(form) {
      form.resetView();
    }
    // unload blobs
    this.objUrls.forEach((url) => {
      (window.URL || window.webkitURL).revokeObjectURL(url);
    });

    delete window.CHTCore.debugFormModel;
    delete this.currentForm;
    this.objUrls.length = 0;
  }

  setupNavButtons(currentForm, $wrapper, currentIndex) {
    setupNavButtons(currentForm, $wrapper, currentIndex);
  }

  _renderForm(formContext) {
    const {
      formDoc,
      instanceData,
      selector,
      titleKey,
    } = formContext;

    const $selector = $(selector);
    return transformXml(this.fileServices, this.translationServices.translate, formDoc).then(doc => {
      replaceJavarosaMediaWithLoaders(formDoc, doc.html);
      const xmlFormContext = {
        doc,
        wrapper: $selector,
        instanceData,
        titleKey,
      };
      return renderFromXmls(this.formDataServices, this.translationServices, xmlFormContext);
    }).then((form) => {
      this.currentForm = form;
      const formContainer = $selector.find('.container').first();
      const replaceMediaLoaders = (formContainer, formDoc) => {
        formContainer.find('[data-media-src]').each((idx, element) => {
          const elem = $(element);
          const src = elem.attr('data-media-src');
          this.fileServices.db
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
              // eslint-disable-next-line no-console
              console.error('Error fetching media file', formDoc._id, src, err);
              elem.closest('.loader').hide();
            });
        });
      };

      replaceMediaLoaders(formContainer, formDoc);

      $selector.on('addrepeat', (ev) => {
        setTimeout(() => { // timeout to allow enketo to finish first
          replaceMediaLoaders($(ev.target), formDoc);
        });
      });

      window.CHTCore.debugFormModel = () => form.model.getStr();
      return form;
    });
  }
}

module.exports = {
  ContactServices,
  FileServices,
  FormDataServices,
  TranslationServices,
  XmlServices,
  EnketoFormManager
};
