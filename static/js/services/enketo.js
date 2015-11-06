var _ = require('underscore');

/* globals EnketoForm */
angular.module('inboxServices').service('Enketo', [
  '$window', '$log', '$q', 'Auth', 'DB', 'EnketoTranslation', 'FileReader', 'UserSettings', 'XSLT', 'Language', 'TranslateFrom',
  function($window, $log, $q, Auth, DB, EnketoTranslation, FileReader, UserSettings, XSLT, Language, TranslateFrom) {
    var objUrls = [];

    var replaceJavarosaMediaWithLoaders = function(formDocId, form) {
      form.find('img,video,audio').each(function(i, elem) {
        elem = $(elem);
        var src = elem.attr('src');
        if (!(/^jr:\/\//.test(src))) {
          return;
        }
        // Change URL to fragment to prevent browser trying to load it
        elem.attr('src', '#' + src);
        elem.css('visibility', 'hidden');
        elem.wrap('<div class="loader">');
        DB.get()
          .getAttachment(formDocId, src.substring(5))
          .then(function(blob) {
            var objUrl = ($window.URL || $window.webkitURL).createObjectURL(blob);
            objUrls.push(objUrl);
            elem.attr('src', objUrl);
            elem.css('visibility', '');
            elem.unwrap();
          })
          .catch(function(err) {
            $log.error('Error fetching media file', formDocId, src, err);
          });
      });
    };

    var transformXml = function(doc, formDocId) {
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
          if(formDocId) {
            replaceJavarosaMediaWithLoaders(formDocId, result.html);
          }
          return $q.resolve(result);
        });
    };

    var withFormByFormInternalId = function(formInternalId) {
      return DB.get()
        .query('medic/forms', { include_docs: true, key: formInternalId })
        .then(function(res) {
          if (!res.rows.length) {
            throw new Error('Requested form not found');
          }
          var form = res.rows[0];
          return DB.get()
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
                return transformXml(xml, form.id);
              });
            });
        });
    };

    var checkPermissions = function() {
      return Auth('can_create_records').then(getContactId);
    };

    var getInstanceStr = function(model, data) {
      if (data && _.isString(data)) {
        return $q.resolve(data);
      }
      data = data || {};
      var deferred = $q.defer();
      UserSettings(function(err, settings) {
        if (err) {
          return deferred.reject(err);
        }
        data.user = settings;
        var xml = $($.parseXML(model));
        var instanceRoot = xml.find('model instance');
        var bindRoot = instanceRoot.find('inputs');
        if (!bindRoot.length) {
          // used for the default contact schema forms
          bindRoot = instanceRoot.find('data');
        }
        EnketoTranslation.bindJsonToXml(bindRoot, data);
        deferred.resolve(instanceRoot.html());
      });
      return deferred.promise;
    };

    var handleKeypressOnInputField = function(e) {
      if(e.keyCode !== 13) {
        return;
      }

      var $this = $(this);

      // stop the keypress from being handled elsewhere
      e.preventDefault();

      var $thisQuestion = $this.closest('.question');

      // If there's another question on the current page, focus on that
      if($thisQuestion.attr('role') !== 'page') {
        var $nextQuestion = $thisQuestion.find('~ .question');
        if($nextQuestion.length) {
          // Hack for Android: delay focussing on the next field, so that
          // keybaord close and open events both register.  This should mean
          // that the on-screen keyboard is maintained between fields.
          setTimeout(function() {
            $nextQuestion.first().trigger('focus');
          }, 10);
          return;
        }
      }

      // If there's no question on the current page, try to go to next
      // page, or submit the form.

      // Trigger the change listener on the current field to update the enketo
      // model
      $this.trigger('change');

      var enketoContainer = $thisQuestion.closest('.enketo');
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
      return getInstanceStr(doc.model, instanceData)
        .then(function(instanceStr) {
          var form = new EnketoForm(wrapper.find('form').first(), {
            modelStr: doc.model,
            instanceStr: instanceStr
          });
          var loadErrors = form.init();
          if (loadErrors && loadErrors.length) {
            return $q.reject(loadErrors);
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
      return DB.get().get(docId).then(function(doc) {
        doc.content = record;
        doc.fields = EnketoTranslation.reportRecordToJs(record).outputs;
        return DB.get().put(doc).then(function(res) {
          doc._rev = res.rev;
          return $q.resolve(doc);
        });
      });
    };

    var getContactId = function() {
      var deferred = $q.defer();
      UserSettings(function(err, user) {
        if (err) {
          return deferred.reject(err);
        }
        if (!user || !user.contact_id) {
          return deferred.reject(new Error('Your user does not have an associated contact. Talk to your administrator to correct this.'));
        }
        deferred.resolve(user.contact_id);
      });
      return deferred.promise;
    };

    var create = function(formInternalId, record) {
      return getContactId()
        .then(function(contactId) {
          return DB.get().get(contactId);
        })
        .then(function(contact) {
          var doc = {
            content: record,
            fields: EnketoTranslation.reportRecordToJs(record).outputs,
            form: formInternalId,
            type: 'data_record',
            content_type: 'xml',
            reported_date: Date.now(),
            contact: contact,
            from: contact && contact.phone,
            hidden_fields: EnketoTranslation.getHiddenFieldList(record),
          };
          return DB.get().post(doc).then(function(res) {
            doc._id = res.id;
            doc._rev = res.rev;
            return $q.resolve(doc);
          });
        });
    };

    this.save = function(formInternalId, form, docId) {
      return form.validate()
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

    this.withAllForms = function() {
      return DB.get()
        .query('medic/forms', { include_docs: true })
        .then(function(res) {
          var forms = res.rows.filter(function(row) {
            return row.doc._attachments.xml;
          }).map(function(row) {
            return row.doc;
          });
          return $q.resolve(forms);
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
  }
]);
