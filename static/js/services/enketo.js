/* globals EnketoForm */
angular.module('inboxServices').service('Enketo',
  function(
    $log,
    $q,
    $window,
    Auth,
    DB,
    EnketoPrepopulationData,
    EnketoTranslation,
    FileReader,
    Language,
    TranslateFrom,
    UserSettings,
    XSLT
  ) {

    'ngInject';

    var objUrls = [];

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
      return $q
        .all([
          XSLT.transform('openrosa2html5form.xsl', doc),
          XSLT.transform('openrosa2xmlmodel.xsl', doc),
        ])
        .then(function(results) {
          var result = {
            html: $(results[0]),
            model: results[1]
          };
          return result;
        });
    };

    var xmlCache = {};

    var withFormByFormInternalId = function(formInternalId) {
      if (!xmlCache[formInternalId]) {
        xmlCache[formInternalId] = DB()
          .query('medic-client/forms', { include_docs: true, key: formInternalId })
          .then(function(res) {
            if (!res.rows.length) {
              throw new Error('Requested form not found');
            }
            var form = res.rows[0];
            return DB()
              .getAttachment(form.id, 'xml')
              .then(function(a) {
                return FileReader(a);
              })
              .then(function(text) {
                return Language().then(function(language) {
                  var xml = $.parseXML(text);
                  var $xml = $(xml);
                  // set the user's language as default so it'll be used for itext translations
                  $xml.find('model itext translation[lang="' + language + '"]').attr('default', '');
                  // manually translate the title as itext doesn't seem to work
                  $xml.find('h\\:title,title').text(TranslateFrom(form.doc.title));
                  return transformXml(xml);
                });
              });
          });
      }
      return xmlCache[formInternalId];
    };

    var checkPermissions = function() {
      return Auth('can_create_records').then(getContactId);
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
        .then(function() {
          return withFormByFormInternalId(formInternalId);
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
      return transformXml($.parseXML(xmlString))
        .then(function(doc) {
          return renderFromXmls(doc, wrapper, instanceData);
        });
    };

    var update = function(formInternalId, record, docId) {
      // update an existing doc.  For convenience, get the latest version
      // and then modify the content.  This will avoid most concurrent
      // edits, but is not ideal.
      return DB().get(docId).then(function(doc) {
        doc.content = record;
        doc.fields = EnketoTranslation.reportRecordToJs(record);
        return DB().put(doc).then(function(res) {
          doc._rev = res.rev;
          return $q.resolve(doc);
        });
      });
    };

    var getContactId = function() {
      return UserSettings()
        .then(function(user) {
          if (!user || !user.contact_id) {
            throw new Error('Your user does not have an associated contact. Talk to your administrator to correct this.');
          }
          return user.contact_id;
        });
    };

    var create = function(formInternalId, record) {
      return getContactId()
        .then(function(contactId) {
          return DB().get(contactId);
        })
        .then(function(contact) {
          var doc = {
            content: record,
            fields: EnketoTranslation.reportRecordToJs(record),
            form: formInternalId,
            type: 'data_record',
            content_type: 'xml',
            reported_date: Date.now(),
            contact: contact,
            from: contact && contact.phone,
            hidden_fields: EnketoTranslation.getHiddenFieldList(record),
          };
          return DB().post(doc).then(function(res) {
            doc._id = res.id;
            doc._rev = res.rev;
            return $q.resolve(doc);
          });
        });
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
