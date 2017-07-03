var uuid = require('uuid/v4'),
    json2xml = require('json2xml'),
    xpathPath = require('../modules/xpath-element-path');

/* globals EnketoForm */
angular.module('inboxServices').service('Enketo',
  function(
    $log,
    $q,
    $translate,
    $window,
    AddAttachment,
    ContactSummary,
    DB,
    EnketoPrepopulationData,
    EnketoTranslation,
    ExtractLineage,
    FileReader,
    Language,
    LineageModelGenerator,
    Search,
    TranslateFrom,
    UserContact,
    UserSettings,
    XmlForm,
    XSLT
  ) {

    'ngInject';

    var objUrls = [];
    var xmlCache = {};
    var FORM_ATTACHMENT_NAME = 'xml';
    var REPORT_ATTACHMENT_NAME = this.REPORT_ATTACHMENT_NAME = 'content';

    var replaceJavarosaMediaWithLoaders = function(id, form) {
      form.find('img,video,audio').each(function() {
        var elem = $(this);
        var src = elem.attr('src');
        if (!(/^jr:\/\//.test(src))) {
          return;
        }
        // Change URL to fragment to prevent browser trying to load it
        elem.attr('src', '#' + src);
        elem.css('visibility', 'hidden');
        elem.wrap('<div class="loader">');
        DB()
          .getAttachment(id, src.substring(5))
          .then(function(blob) {
            var objUrl = ($window.URL || $window.webkitURL).createObjectURL(blob);
            objUrls.push(objUrl);
            elem.attr('src', objUrl);
            elem.css('visibility', '');
            elem.unwrap();
          })
          .catch(function(err) {
            $log.error('Error fetching media file', id, src, err);
          });
      });
    };

    var transformXml = function(xml) {
      return $q.all([
        XSLT.transform('openrosa2html5form.xsl', xml),
        XSLT.transform('openrosa2xmlmodel.xsl', xml)
      ])
      .then(function(results) {
        var $html = $(results[0]);
        var model = results[1];
        $html.find('[data-i18n]').each(function() {
          var $this = $(this);
          $this.text($translate.instant('enketo.' + $this.attr('data-i18n')));
        });
        var hasContactSummary = $(model).find('> instance[id="contact-summary"]').length === 1;
        return {
          html: $html,
          model: model,
          hasContactSummary: hasContactSummary
        };
      });
    };

    var translateXml = function(text, language, title) {
      var xml = $.parseXML(text);
      var $xml = $(xml);
      // set the user's language as default so it'll be used for itext translations
      $xml.find('model itext translation[lang="' + language + '"]').attr('default', '');
      // manually translate the title as enketo-core doesn't have any way to do this
      // https://github.com/enketo/enketo-core/issues/405
      if (title) {
        $xml.find('h\\:title,title').text(TranslateFrom(title));
      }
      return xml;
    };

    var getFormAttachment = function(id) {
      return DB().getAttachment(id, FORM_ATTACHMENT_NAME)
        .then(FileReader);
    };

    var getFormXml = function(form, language) {
      return getFormAttachment(form._id).then(function(text) {
        return translateXml(text, language, form.title);
      });
    };

    var withForm = function(id, language) {
      if (!xmlCache[id]) {
        xmlCache[id] = {};
      }
      if (!xmlCache[id][language]) {
        xmlCache[id][language] = DB()
          .get(id)
          .then(function(form) {
            return getFormXml(form, language);
          })
          .then(transformXml);
      }
      return xmlCache[id][language].then(function(form) {
        // clone form to avoid leaking of data between instances of a form
        return {
          html: form.html.clone(),
          model: form.model,
          hasContactSummary: form.hasContactSummary
        };
      });
    };

    var handleKeypressOnInputField = function(e) {
      // Here we capture both CR and TAB characters, and handle field-skipping
      if(!window.medicmobile_android || (e.keyCode !== 9 && e.keyCode !== 13)) {
        return;
      }

      var $this = $(this);

      // stop the keypress from being handled elsewhere
      e.preventDefault();

      var $thisQuestion = $this.closest('.question');

      // If there's another question on the current page, focus on that
      if($thisQuestion.attr('role') !== 'page') {
        var $nextQuestion = $thisQuestion.find('~ .question:not(.disabled):not(.or-appearance-hidden), ~ .repeat-buttons button.repeat:not(:disabled)');
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
            setTimeout(function() {
              $nextQuestion.first().trigger('focus');
            }, 10);
          }
          return;
        }
      }

      // Trigger the change listener on the current field to update the enketo
      // model
      $this.trigger('change');

      var enketoContainer = $thisQuestion.closest('.enketo');

      // If there's no question on the current page, try to go to change page,
      // or submit the form.
      var next = enketoContainer.find('.btn.next-page:enabled:not(.disabled)');
      if(next.length) {
        next.trigger('click');
      } else {
        angular.element(enketoContainer.find('.btn.submit')).triggerHandler('click');
      }
    };

    var getLineage = function(contact) {
      return LineageModelGenerator.contact(contact._id)
        .then(function(model) {
          return model.lineage;
        });
    };

    var getContactReports = function(contact) {
      var subjectIds = [ contact._id ];
      var shortCode = contact.patient_id || contact.place_id;
      if (shortCode) {
        subjectIds.push(shortCode);
      }
      return Search('reports', { subjectIds: subjectIds }, { include_docs: true });
    };

    var getContactSummary = function(doc, instanceData) {
      var contact = instanceData && instanceData.contact;
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
          return {
            id: 'contact-summary',
            xmlStr: json2xml({ context: summary.context })
          };
        });
    };

    var getEnketoOptions = function(doc, instanceData) {
      return $q.all([
        EnketoPrepopulationData(doc.model, instanceData),
        getContactSummary(doc, instanceData)
      ])
        .then(function(results) {
          var instanceStr = results[0];
          var contactSummary = results[1];
          var options = {
            modelStr: doc.model,
            instanceStr: instanceStr
          };
          if (contactSummary) {
            options.external = [ contactSummary ];
          }
          return options;
        });
    };

    var renderFromXmls = function(doc, selector, instanceData) {
      var wrapper = $(selector);
      wrapper.find('.form-footer')
             .addClass('end')
             .find('.previous-page,.next-page')
             .addClass('disabled');

      var formContainer = wrapper.find('.container').first();
      formContainer.html(doc.html);

      return getEnketoOptions(doc, instanceData).then(function(options) {
        var form = new EnketoForm(wrapper.find('form').first(), options);
        var loadErrors = form.init();
        if (loadErrors && loadErrors.length) {
          return $q.reject(new Error(JSON.stringify(loadErrors)));
        }
        wrapper.show();

        wrapper.find('input').on('keydown', handleKeypressOnInputField);

        // handle page turning using browser history
        window.history.replaceState({ enketo_page_number: 0 }, '');
        overrideNavigationButtons(form, wrapper);
        addPopStateHandler(form, wrapper);

        return form;
      });
    };

    var overrideNavigationButtons = function(form, $wrapper) {
      $wrapper.find('.btn.next-page')
        .off('.pagemode')
        .on('click.pagemode', function() {
          form.getView().pages.next()
            .then(function(newPageIndex) {
              if(typeof newPageIndex === 'number') {
                window.history.pushState({ enketo_page_number: newPageIndex }, '');
              }
            });
          return false;
        });

      $wrapper.find('.btn.previous-page')
        .off('.pagemode')
        .on('click.pagemode', function() {
          window.history.back();
          return false;
        });
    };

    var addPopStateHandler = function(form, $wrapper) {
      $(window).on('popstate.enketo-pagemode', function(event) {
        if(event.originalEvent &&
            event.originalEvent.state &&
            typeof event.originalEvent.state.enketo_page_number === 'number') {
          var targetPage = event.originalEvent.state.enketo_page_number;

          if ($wrapper.find('.container').not(':empty')) {
            var pages = form.getView().pages;
            pages.flipTo(pages.getAllActive()[targetPage], targetPage);
          }
        }
      });
    };

    var registerEditedListener = function(selector, listener) {
      if (listener) {
        $(selector).on('edited.enketo', listener);
      }
    };

    var renderForm = function(selector, id, instanceData, editedListener) {
      return Language()
        .then(function(language) {
          return withForm(id, language);
        })
        .then(function(doc) {
          replaceJavarosaMediaWithLoaders(id, doc.html);
          var form = renderFromXmls(doc, selector, instanceData);
          registerEditedListener(selector, editedListener);
          return form;
        });
    };

    this.render = function(selector, id, instanceData, editedListener) {
      return getUserContact().then(function() {
        return renderForm(selector, id, instanceData, editedListener);
      });
    };

    this.renderContactForm = renderForm;

    this.renderFromXmlString = function(selector, xmlString, instanceData, editedListener) {
      return Language()
        .then(function(language) {
          return translateXml(xmlString, language);
        })
        .then(transformXml)
        .then(function(doc) {
          var form = renderFromXmls(doc, selector, instanceData);
          registerEditedListener(selector, editedListener);
          return form;
        });
    };

    var xmlToDocs = function(doc, record) {

      function mapOrAssignId(e, id) {
        if (!id) {
          var $id = $(e).children('_id');
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

      var recordDoc = $.parseXML(record);
      var $record = $($(recordDoc).children()[0]);
      mapOrAssignId($record[0], doc._id || uuid());

      $record.find('[db-doc=true]').each(function() {
        mapOrAssignId(this);
      });

      $record.find('[db-doc-ref]').each(function() {
        var $ref = $(this);
        var refId = getId($ref.attr('db-doc-ref'));
        $ref.text(refId);
      });

      var docsToStore = $record.find('[db-doc=true]').map(function() {
        var docToStore = EnketoTranslation.reportRecordToJs(this.outerHTML);
        docToStore._id = getId(xpathPath(this));
        return docToStore;
      }).get();

      return XmlForm(doc.form)
        .then(function(form) {
          return getFormAttachment(form.id);
        })
        .then(function(form) {
          doc._id = getId('/*');
          record = $record[0].outerHTML;
          doc.fields = EnketoTranslation.reportRecordToJs($record[0].outerHTML, form);
          doc.hidden_fields = EnketoTranslation.getHiddenFieldList(record);
          AddAttachment(doc, REPORT_ATTACHMENT_NAME, record, 'application/xml');
          docsToStore.unshift(doc);
          return docsToStore;
        });
    };

    var saveDocs = function(docs) {
      return $q.all(docs.map(function(doc) {
        return DB()
          .put(doc)
          .then(function(res) {
            doc._rev = res.rev;
            return doc;
          });
      }));
    };

    var update = function(docId) {
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

    var getUserContact = function() {
      return UserContact().then(function(contact) {
        if (!contact) {
          throw new Error('Your user does not have an associated contact, or does not have access to the associated contact. Talk to your administrator to correct this.');
        }
        return contact;
      });
    };

    var create = function(formInternalId) {
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

    this.save = function(formInternalId, form, docId) {
      return $q.resolve(form.validate())
        .then(function(valid) {
          if (!valid) {
            throw new Error('Form is invalid');
          }
          if (docId) {
            return update(docId);
          }
          return create(formInternalId);
        })
        .then(function(doc) {
          return xmlToDocs(doc, form.getDataStr());
        })
        .then(saveDocs);
    };

    this.unload = function(form) {
      $(window).off('.enketo-pagemode');
      if (form) {
        form.resetView();
      }
      // unload blobs
      objUrls.forEach(function(url) {
        ($window.URL || $window.webkitURL).revokeObjectURL(url);
      });
      objUrls.length = 0;
    };

    this.clearXmlCache = function() {
      xmlCache = {};
    };
  }
);
