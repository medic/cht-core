/* globals EnketoForm */
angular.module('inboxServices').service('Enketo', [
  '$window', '$log', '$q', 'DB', 'XSLT', 'FileReader', 'UserSettings', 'Auth',
  function($window, $log, $q, DB, XSLT, FileReader, UserSettings, Auth) {
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

    var transformXml = function(formDocId, doc) {
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
          replaceJavarosaMediaWithLoaders(formDocId, result.html);
          return $q.resolve(result);
        });
    };

    var withFormByFormInternalId = function(formInternalId) {
      return DB.get()
        .query('medic/forms', { include_docs: true, key: formInternalId })
        .then(function(res) {
          if (!res.rows.length) {
            return $q.reject(new Error('Requested form not found'));
          }
          var form = res.rows[0];
          return DB.get()
            .getAttachment(form.id, 'xml')
            .then(FileReader)
            .then(function(text) {
              return transformXml(form.id, $.parseXML(text));
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

    this.render = function(wrapper, formInternalId, formInstanceData) {
      return checkPermissions()
        .then(function() {
          return withFormByFormInternalId(formInternalId)
            .then(function(doc) {
              wrapper.find('.form-footer')
                     .addClass('end')
                     .find('.previous-page,.next-page')
                     .addClass('disabled');
              var formContainer = wrapper.find('.container').first();
              formContainer.html(doc.html);
              var form = new EnketoForm(wrapper.find('form').first(), {
                modelStr: doc.model,
                instanceStr: formInstanceData
              });
              var loadErrors = form.init();
              if (loadErrors && loadErrors.length) {
                return $q.reject(loadErrors);
              }
              wrapper.show();
              return $q.resolve(form);
            });
          });
    };

    var recordToJs = function(record) {
      var i, n, fields = {},
          data = $.parseXML(record).firstChild.childNodes;
      for(i = 0; i < data.length; ++i) {
        n = data[i];
        if (n.nodeType !== Node.ELEMENT_NODE || n.nodeName === 'meta') {
          continue;
        }
        fields[n.nodeName] = n.textContent;
      }
      return fields;
    };

    var update = function(formInternalId, record, docId) {
      // update an existing doc.  For convenience, get the latest version
      // and then modify the content.  This will avoid most concurrent
      // edits, but is not ideal.
      return DB.get().get(docId).then(function(doc) {
        doc.content = record;
        doc.fields = recordToJs(record);
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
            fields: recordToJs(record),
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
      form.validate();
      if (!form.isValid()) {
        return $q.reject(new Error('Form is invalid'));
      }
      var result;
      var record = form.getDataStr();
      if (docId) {
        result = update(formInternalId, record, docId);
      } else {
        result = create(formInternalId, record);
      }
      result.then(function() {
        form.resetView();
      });
      return result;
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
