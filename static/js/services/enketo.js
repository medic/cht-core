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
          console.log('xml transformed');
          var result = {
            html: $(results[0]),
            model: results[1]
          };
          if(formDocId) {
            replaceJavarosaMediaWithLoaders(formDocId, result.html);
          }
          console.log('resolving');
          return $q.resolve(result);
        });
    };

    var withFormByFormInternalId = function(formInternalId) {
      return DB.get()
        .query('medic/forms', { include_docs: true, key: formInternalId })
        .then(function(res) {
          console.log('got forms', res.rows.length);
          if (!res.rows.length) {
            throw new Error('Requested form not found');
          }
          var form = res.rows[0];
          return DB.get()
            .getAttachment(form.id, 'xml')
            .then(function(a) {
              console.log('FileReader');
              return FileReader(a); 
            })
            .then(function(text) {
              console.log('Language');
              return Language().then(function(language) {
                var xml = $.parseXML(text);
                var $xml = $(xml);
                // set the user's language as default so it'll be used for itext translations
                $xml.find('model itext translation[lang="' + language + '"]').attr('default', '');
                // manually translate the title as itext doesn't seem to work
                $xml.find('h\\:title,title').text(TranslateFrom(form.doc.title));
                console.log('transformXml');
                return transformXml(xml, form.id);
              });
            });
        });
    };

    var checkPermissions = function() {
      return Auth('can_create_records')
        .then(function() {
          return $q(function(resolve, reject) {
            UserSettings(function(err, settings) {
              if (err) {
                return reject(err);
              }
              if (!settings.contact_id) {
                return reject(new Error('Your user does not have an associated contact. Talk to your administrator to correct this.'));
              }
              resolve();
            });
          });
        });
    };

    var bindJsonToXml = function(elem, data) {
      _.pairs(data).forEach(function(pair) {
        var current = elem.find(pair[0]);
        var value = pair[1];
        if (_.isObject(value)) {
          bindJsonToXml(current, value);
        } else {
          current.text(value);
        }
      });
    };

    var getInstanceStr = function(model, data) {
      if (data && _.isString(data)) {
        return $q.resolve(data);
      }
      data = data || {};
      return $q(function(resolve, reject) {
        console.log('UserSettings');
        UserSettings(function(err, settings) {
          if (err) {
            return reject(err);
          }
          resolve(settings);
        });
      })
      .then(function(settings) {
        console.log('got settings', settings);
        data.user = settings;
        var xml = $($.parseXML(model));
        var instanceRoot = xml.find('model instance');
        bindJsonToXml(instanceRoot.find('inputs'), data);
        return instanceRoot.html();
      });
    };

    var renderFromXmls = function(doc, wrapper, instanceData) {
      wrapper.find('.form-footer')
             .addClass('end')
             .find('.previous-page,.next-page')
             .addClass('disabled');
      var formContainer = wrapper.find('.container').first();
      formContainer.html(doc.html);
      console.log('getInstanceStr', instanceData);
      return getInstanceStr(doc.model, instanceData)
        .then(function(instanceStr) {
          var form = new EnketoForm(wrapper.find('form').first(), {
            modelStr: doc.model,
            instanceStr: instanceStr
          });
          var loadErrors = form.init();
          if (loadErrors && loadErrors.length) {
            console.log('rejecting');
            return $q.reject(loadErrors);
          }
          wrapper.show();
          return form;
        });
    };

    this.render = function(wrapper, formInternalId, instanceData) {
      console.log('checking perms');
      return checkPermissions()
        .then(function() {
          console.log('withFormByFormInternalId');
          return withFormByFormInternalId(formInternalId);
        })
        .then(function(doc) {
          console.log('renderFromXmls');
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
      return $q(function(resolve, reject) {
        UserSettings(function(err, user) {
          if (err) {
            return reject(err);
          }
          if (!user || !user.contact_id) {
            return reject(new Error('User has no associated contact.'));
          }
          resolve(user.contact_id);
        });
      });
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
            from: contact && contact.phone
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
