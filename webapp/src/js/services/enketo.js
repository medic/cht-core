const uuid = require('uuid/v4');
const pojo2xml = require('pojo2xml');
const xpathPath = require('../modules/xpath-element-path');
const medicXpathExtensions = require('../enketo/medic-xpath-extensions');

/* globals EnketoForm */
angular.module('inboxServices').service('Enketo',
  function(
    $log,
    $ngRedux,
    $q,
    $timeout,
    $translate,
    $window,
    AddAttachment,
    ContactSummary,
    DB,
    EnketoPrepopulationData,
    EnketoTranslation,
    ExtractLineage,
    FileReader,
    GetReportContent,
    Language,
    LineageModelGenerator,
    Search,
    ServicesActions,
    SubmitFormBySms,
    TranslateFrom,
    UserContact,
    XmlForms,
    ZScore
  ) {
    'use strict';
    'ngInject';

    const HTML_ATTACHMENT_NAME = 'form.html';
    const MODEL_ATTACHMENT_NAME = 'model.xml';

    const objUrls = [];

    let currentForm;
    this.getCurrentForm = function() {
      return currentForm;
    };

    const self = this;
    const mapDispatchToTarget = (dispatch) => {
      const servicesActions = ServicesActions(dispatch);
      return {
        setLastChangedDoc: servicesActions.setLastChangedDoc
      };
    };
    $ngRedux.connect(null, mapDispatchToTarget)(self);

    const init = function() {
      ZScore()
        .then(function(zscoreUtil) {
          medicXpathExtensions.init(zscoreUtil);
        })
        .catch(function(err) {
          $log.error('Error initialising zscore util', err);
        });
    };
    const inited = init();

    const replaceJavarosaMediaWithLoaders = function(formDoc, formHtml) {
      formHtml.find('[data-media-src]').each(function() {
        $(this)
          .css('visibility', 'hidden')
          .wrap('<div class="loader">');
      });
    };

    const replaceMediaLoaders = function(selector, formDoc) {
      const wrapper = $(selector);
      const formContainer = wrapper.find('.container').first();
      formContainer.find('[data-media-src]').each(function() {
        const elem = $(this);
        const src = elem.attr('data-media-src');
        DB()
          .getAttachment(formDoc._id, src)
          .then(function(blob) {
            const objUrl = ($window.URL || $window.webkitURL).createObjectURL(blob);
            objUrls.push(objUrl);
            elem
              .attr('src', objUrl)
              .css('visibility', '')
              .unwrap();
          })
          .catch(function(err) {
            $log.error('Error fetching media file', formDoc._id, src, err);
            elem.closest('.loader').hide();
          });
      });
    };

    const transformXml = function(form) {
      return $q.all([
        getAttachment(form._id, HTML_ATTACHMENT_NAME),
        getAttachment(form._id, MODEL_ATTACHMENT_NAME)
      ])
        .then(function(results) {
          const $html = $(results[0]);
          const model = results[1];
          $html.find('[data-i18n]').each(function() {
            const $this = $(this);
            $this.text($translate.instant('enketo.' + $this.attr('data-i18n')));
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

    const getAttachment = function(id, name) {
      return DB().getAttachment(id, name).then(FileReader.utf8);
    };

    const getFormAttachment = function(doc) {
      return getAttachment(doc._id, XmlForms.findXFormAttachmentName(doc));
    };

    const handleKeypressOnInputField = function(e) {
      // Here we capture both CR and TAB characters, and handle field-skipping
      if(!$window.medicmobile_android || (e.keyCode !== 9 && e.keyCode !== 13)) {
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
            $timeout(function() {
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
        angular.element(enketoContainer.find('.btn.submit')).triggerHandler('click');
      }
    };

    const getLineage = function(contact) {
      return LineageModelGenerator.contact(contact._id)
        .then(function(model) {
          return model.lineage;
        })
        .catch(function(err) {
          if (err.code === 404) {
            $log.warn(`Enketo failed to get lineage of contact '${contact._id}' because document does not exist`, err);
            return [];
          }

          throw err;
        });
    };

    const getContactReports = function(contact) {
      const subjectIds = [ contact._id ];
      const shortCode = contact.patient_id || contact.place_id;
      if (shortCode) {
        subjectIds.push(shortCode);
      }
      return Search('reports', { subjectIds: subjectIds }, { include_docs: true });
    };

    const getContactSummary = function(doc, instanceData) {
      const contact = instanceData && instanceData.contact;
      if (!doc.hasContactSummary || !contact) {
        return $q.resolve();
      }
      return $q.all([
        getContactReports(contact),
        getLineage(contact)
      ])
        .then(function(results) {
          return ContactSummary(contact, results[0], results[1]);
        })
        .then(function(summary) {
          if (!summary) {
            return;
          }

          try {
            return {
              id: 'contact-summary',
              xmlStr: pojo2xml({ context: summary.context })
            };
          } catch (e) {
            $log.error('Error while converting app_summary.contact_summary.context to xml.');
            throw new Error('contact_summary context is misconfigured');
          }
        });
    };

    const getEnketoForm = function(wrapper, doc, instanceData) {
      return $q.all([
        EnketoPrepopulationData(doc.model, instanceData),
        getContactSummary(doc, instanceData),
        Language()
      ])
        .then(([ instanceStr, contactSummary, language ]) => {
          const data = {
            modelStr: doc.model,
            instanceStr: instanceStr
          };
          if (contactSummary) {
            data.external = [ contactSummary ];
          }
          const form = wrapper.find('form').first();
          return new EnketoForm(form, data, { language });
        });
    };

    const renderFromXmls = function(doc, selector, instanceData) {
      const wrapper = $(selector);

      const formContainer = wrapper.find('.container').first();
      formContainer.html(doc.html);

      return getEnketoForm(wrapper, doc, instanceData).then(function(form) {
        currentForm = form;
        const loadErrors = currentForm.init();
        if (loadErrors && loadErrors.length) {
          return $q.reject(new Error(JSON.stringify(loadErrors)));
        }
        // manually translate the title as enketo-core doesn't have any way to do this
        // https://github.com/enketo/enketo-core/issues/405
        const $title = wrapper.find('#form-title');
        if (doc.title) {
          // title defined in the doc - overwrite contents
          $title.text(TranslateFrom(doc.title));
        } else if ($title.text() === 'No Title') {
          // useless enketo default - remove it
          $title.remove();
        } // else the title is hardcoded in the form definition - leave it alone
        wrapper.show();

        wrapper.find('input').on('keydown', handleKeypressOnInputField);

        // handle page turning using browser history
        $window.history.replaceState({ enketo_page_number: 0 }, '');
        overrideNavigationButtons(currentForm, wrapper);
        addPopStateHandler(currentForm, wrapper);
        addDynamicUrlListener();
        forceRecalculate(currentForm);
        setupNavButtons(currentForm, wrapper, 0);
        return currentForm;
      });
    };

    const setupNavButtons = function(form, $wrapper, currentIndex) {
      if (form.pages) {
        const lastIndex = form.pages.$activePages.length - 1;
        const footer = $wrapper.find('.form-footer');
        footer.removeClass('end');
        footer.find('.previous-page, .next-page').removeClass('disabled');

        if (currentIndex >= lastIndex) {
          footer.addClass('end');
          footer.find('.next-page').addClass('disabled');
        }
        if (currentIndex === 0) {
          footer.find('.previous-page').addClass('disabled');
        }
      }
    };

    const overrideNavigationButtons = function(form, $wrapper) {
      $wrapper.find('.btn.next-page')
        .off('.pagemode')
        .on('click.pagemode', function() {
          form.pages._next()
            .then(function(valid) {
              if(valid) {
                const currentIndex = form.pages._getCurrentIndex();
                if(typeof currentIndex === 'number') {
                  $window.history.pushState({ enketo_page_number: currentIndex }, '');
                }
                setupNavButtons(form, $wrapper, currentIndex);
              }
              forceRecalculate(form);
            });
          return false;
        });

      $wrapper.find('.btn.previous-page')
        .off('.pagemode')
        .on('click.pagemode', function() {
          $window.history.back();
          setupNavButtons(form, $wrapper, form.pages._getCurrentIndex() - 1);
          forceRecalculate(form);
          return false;
        });
    };

    const dynamicUrlHander = function() {
      this.href = $(this).find('.url').text();
    };

    const addDynamicUrlListener = function() {
      $(document.body).on('click', '.enketo a.dynamic-url', dynamicUrlHander);
    };

    const removeDynamicUrlListener = function() {
      $(document.body).off('click', '.enketo a.dynamic-url', dynamicUrlHander);
    };

    const addPopStateHandler = function(form, $wrapper) {
      $($window).on('popstate.enketo-pagemode', function(event) {
        if (event.originalEvent &&
            event.originalEvent.state &&
            typeof event.originalEvent.state.enketo_page_number === 'number' &&
            $wrapper.find('.container').not(':empty')) {
          form.pages._prev();
        }
      });
    };

    const registerEditedListener = function(selector, listener) {
      if (listener) {
        $(selector).on('edited.enketo', listener);
      }
    };

    const registerValuechangeListener = function(selector, listener) {
      if (listener) {
        $(selector).on('valuechange.enketo', listener);
      }
    };

    const renderForm = function(selector, formDoc, instanceData, editedListener, valuechangeListener) {
      return transformXml(formDoc)
        .then(doc => {
          replaceJavarosaMediaWithLoaders(formDoc, doc.html);
          return renderFromXmls(doc, selector, instanceData);
        })
        .then(function(form) {
          replaceMediaLoaders(selector, formDoc);
          registerEditedListener(selector, editedListener);
          registerValuechangeListener(selector, valuechangeListener);
          return form;
        });
    };

    this.render = function(selector, form, instanceData, editedListener, valuechangeListener) {
      return $q.all([inited, getUserContact()]).then(function() {
        return renderForm(selector, form, instanceData, editedListener, valuechangeListener);
      });
    };

    this.renderContactForm = renderForm;

    const xmlToDocs = function(doc, record) {

      function mapOrAssignId(e, id) {
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

      function getId(xpath) {
        return recordDoc
          .evaluate(xpath, recordDoc, null, XPathResult.ANY_TYPE, null)
          .iterateNext()
          ._couchId;
      }

      // Chrome 30 doesn't support $xml.outerHTML: #3880
      function getOuterHTML(xml) {
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
        .each(function() {
          mapOrAssignId(this);
        });

      $record.find('[db-doc-ref]').each(function() {
        const $ref = $(this);
        const refId = getId($ref.attr('db-doc-ref'));
        $ref.text(refId);
      });

      const docsToStore = $record.find('[db-doc=true]').map(function() {
        const docToStore = EnketoTranslation.reportRecordToJs(getOuterHTML(this));
        docToStore._id = getId(xpathPath(this));
        docToStore.reported_date = Date.now();
        return docToStore;
      }).get();

      doc._id = getId('/*');
      doc.hidden_fields = EnketoTranslation.getHiddenFieldList(record);

      const attach = function(elem, file, type, alreadyEncoded, xpath) {
        xpath = xpath || xpathPath(elem);
        // replace instance root element node name with form internal ID
        const filename = 'user-file' +
                       (xpath.startsWith('/' + doc.form) ? xpath : xpath.replace(/^\/[^/]+/, '/' + doc.form));
        AddAttachment(doc, filename, file, type, alreadyEncoded);
      };

      $record.find('[type=file]').each(function() {
        const xpath = xpathPath(this);
        const $input = $('input[type=file][name="' + xpath + '"]');
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

      AddAttachment(doc, GetReportContent.REPORT_ATTACHMENT_NAME, record, 'application/xml');

      docsToStore.unshift(doc);

      return XmlForms.get(doc.form)
        .then(getFormAttachment)
        .then(function(form) {
          doc.fields = EnketoTranslation.reportRecordToJs(record, form);
          return docsToStore;
        });
    };

    const saveDocs = function(docs) {
      return DB().bulkDocs(docs)
        .then(function(results) {
          results.forEach(function(result) {
            if (result.error) {
              $log.error('Error saving report', result);
              throw new Error('Error saving report');
            }
            docs.forEach(function(doc) {
              if (doc._id === result.id) {
                doc._rev = result.rev;
              }
            });
          });
          return docs;
        });
    };

    const update = function(docId) {
      // update an existing doc.  For convenience, get the latest version
      // and then modify the content.  This will avoid most concurrent
      // edits, but is not ideal.
      return DB().get(docId).then(function(doc) {
        // previously XML was stored in the content property
        // TODO delete this and other "legacy" code support commited against
        //      the same git commit at some point in the future?
        delete doc.content;
        return doc;
      });
    };

    const getUserContact = function() {
      return UserContact().then(function(contact) {
        if (!contact) {
          const err = new Error('Your user does not have an associated contact, or does not have access to the ' +
            'associated contact. Talk to your administrator to correct this.');
          err.translationKey = 'error.loading.form.no_contact';
          throw err;
        }
        return contact;
      });
    };

    const create = function(formInternalId) {
      return getUserContact().then(function(contact) {
        return {
          form: formInternalId,
          type: 'data_record',
          content_type: 'xml',
          reported_date: Date.now(),
          contact: ExtractLineage(contact),
          from: contact && contact.phone
        };
      });
    };

    const forceRecalculate = function(form) {
      // Work-around for stale jr:choice-name() references in labels.  ref #3870
      form.calc.update();

      // Force forms to update jr:itext references in output fields that contain
      // calculated values.  ref #4111
      form.output.update();
    };

    this.save = function(formInternalId, form, geolocation, docId) {
      return $q.resolve(form.validate())
        .then(function(valid) {
          if (!valid) {
            throw new Error('Form is invalid');
          }

          $('form.or').trigger('beforesave');

          if (docId) {
            return update(docId);
          }
          return create(formInternalId);
        })
        .then(function(doc) {
          return xmlToDocs(doc, form.getDataStr({ irrelevant: false }));
        })
        .then(function(docs) {
          if (geolocation) {
            // Only update geolocation if one is provided.  Otherwise, maintain
            // whatever is already set in the docs.
            docs.forEach(function(doc) {
              doc.geolocation = geolocation;
            });
          }
          self.setLastChangedDoc(docs[0]);
          return docs;
        })
        .then(saveDocs)
        .then(function(docs) {
          // submit by sms _after_ saveDocs so that the main doc's ID is available
          SubmitFormBySms(docs[0]);
          return docs;
        });
    };

    this.unload = function(form) {
      $($window).off('.enketo-pagemode');
      removeDynamicUrlListener();
      if (form) {
        form.resetView();
      }
      // unload blobs
      objUrls.forEach(function(url) {
        ($window.URL || $window.webkitURL).revokeObjectURL(url);
      });
      objUrls.length = 0;
    };

  }
);
