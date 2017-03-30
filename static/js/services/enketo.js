/* globals EnketoForm */
angular.module('inboxServices').service('Enketo',
  function(
    $log,
    $q,
    $translate,
    $window,
    AddAttachment,
    Auth,
    DB,
    EnketoPrepopulationData,
    EnketoTranslation,
    FileReader,
    Language,
    TranslateFrom,
    UserContact,
    XSLT
  ) {

    'ngInject';

    var objUrls = [];
    var xmlCache = {};
    var FORM_ATTACHMENT_NAME = 'xml';
    var REPORT_ATTACHMENT_NAME = this.REPORT_ATTACHMENT_NAME = 'content';

    var replaceJavarosaMediaWithLoaders = function(formInternalId, form) {
      var mediaElements = form.find('img,video,audio');

      if (!mediaElements.length) {
        return;
      }

      DB().query('medic-client/forms', { key: formInternalId })
        .then(function(res) {
          if (!res.rows.length) {
            throw new Error('Requested form not found');
          }
          var formDoc = res.rows[0];

          mediaElements.each(function(i, elem) {
            elem = $(elem);
            var src = elem.attr('src');
            if (!(/^jr:\/\//.test(src))) {
              return;
            }
            // Change URL to fragment to prevent browser trying to load it
            elem.attr('src', '#' + src);
            elem.css('visibility', 'hidden');
            elem.wrap('<div class="loader">');
            DB()
              .getAttachment(formDoc.id, src.substring(5))
              .then(function(blob) {
                var objUrl = ($window.URL || $window.webkitURL).createObjectURL(blob);
                objUrls.push(objUrl);
                elem.attr('src', objUrl);
                elem.css('visibility', '');
                elem.unwrap();
              })
              .catch(function(err) {
                $log.error('Error fetching media file', formDoc.id, src, err);
              });
          });
        })
        .catch(function(err) {
          $log.error('replaceJavarosaMediaWithLoaders', 'Error finding form by internal ID', formInternalId, err);
        });
    };

    var transformXml = function(doc) {
      return $q.all([
        XSLT.transform('openrosa2html5form.xsl', doc),
        XSLT.transform('openrosa2xmlmodel.xsl', doc),
      ])
      .then(function(results) {
        var html = $(results[0]);
        html.find('[data-i18n]')
          .each(function() {
            var $this = $(this);
            $this.text($translate.instant('enketo.' + $this.attr('data-i18n')));
          });
        return {
          html: html,
          model: results[1]
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

    var getFormXml = function(form, language) {
      return DB().getAttachment(form.id, FORM_ATTACHMENT_NAME)
        .then(FileReader)
        .then(function(text) {
          return translateXml(text, language, form.doc.title);
        });
    };

    var withFormByFormInternalId = function(formInternalId, language) {
      if (!xmlCache[formInternalId]) {
        xmlCache[formInternalId] = {};
      }
      if (!xmlCache[formInternalId][language]) {
        xmlCache[formInternalId][language] = DB()
          .query('medic-client/forms', { include_docs: true, key: formInternalId })
          .then(function(res) {
            if (!res.rows.length) {
              throw new Error('Requested form not found: ' + formInternalId);
            }
            return res.rows[0];
          })
          .then(function(form) {
            return getFormXml(form, language);
          })
          .then(transformXml);
      }
      return xmlCache[formInternalId][language];
    };

    var checkPermissions = function() {
      return Auth('can_create_records').then(getUserContact);
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

    var renderFromXmls = function(doc, wrapper, instanceData) {
      wrapper.find('.form-footer')
             .addClass('end')
             .find('.previous-page,.next-page')
             .addClass('disabled');

      var formContainer = wrapper.find('.container').first();
      formContainer.html(doc.html);

      return EnketoPrepopulationData(doc.model, instanceData)
        .then(function(instanceStr) {
          var form = new EnketoForm(wrapper.find('form').first(), {
            modelStr: doc.model,
            instanceStr: instanceStr
          });
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

    this.render = function(wrapper, formInternalId, instanceData) {
      return checkPermissions()
        .then(Language)
        .then(function(language) {
          return withFormByFormInternalId(formInternalId, language);
        })
        .then(function(doc) {
          // clone doc to avoid leaking of data between instances of a form
          doc = {
            html: doc.html.clone(),
            model: doc.model,
          };
          replaceJavarosaMediaWithLoaders(formInternalId, doc.html);
          return renderFromXmls(doc, wrapper, instanceData);
        });
    };

    this.renderFromXmlString = function(wrapper, xmlString, instanceData) {
      return Language()
        .then(function(language) {
          return translateXml(xmlString, language);
        })
        .then(transformXml)
        .then(function(doc) {
          return renderFromXmls(doc, wrapper, instanceData);
        });
    };

    var storeXMLRecord = function(doc, record) {
      AddAttachment(doc, REPORT_ATTACHMENT_NAME, record, 'application/xml');
      doc.fields = EnketoTranslation.reportRecordToJs(record);
      doc.hidden_fields = EnketoTranslation.getHiddenFieldList(record);
      return doc;
    };

    var saveReport = function(doc) {
      return DB().post(doc).then(function(res) {
        doc._id = res.id;
        doc._rev = res.rev;
        return doc;
      });
    };

    var update = function(formInternalId, record, docId) {
      // update an existing doc.  For convenience, get the latest version
      // and then modify the content.  This will avoid most concurrent
      // edits, but is not ideal.
      return DB().get(docId)
        .then(function(doc) {
          // previously XML was stored in the content property
          // TODO delete this and other "legacy" code support commited against
          //      the same git commit at some point in the future?
          delete doc.content;
          return storeXMLRecord(doc, record);
        })
        .then(saveReport);
    };

    var getUserContact = function() {
      return UserContact().then(function(contact) {
        if (!contact) {
          throw new Error('Your user does not have an associated contact. Talk to your administrator to correct this.');
        }
        return contact;
      });
    };

    var create = function(formInternalId, record) {
      return getUserContact()
        .then(function(contact) {
          var doc = {
            form: formInternalId,
            type: 'data_record',
            content_type: 'xml',
            reported_date: Date.now(),
            contact: contact,
            from: contact && contact.phone
          };
          return storeXMLRecord(doc, record);
        })
        .then(saveReport);
    };

    this.save = function(formInternalId, form, docId) {
      return $q.when(form.validate())
        .then(function(valid) {
          if (!valid) {
            throw new Error('Form is invalid');
          }
          var record = form.getDataStr();
          if (docId) {
            return update(formInternalId, record, docId);
          } else {
            return create(formInternalId, record);
          }
        });
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
