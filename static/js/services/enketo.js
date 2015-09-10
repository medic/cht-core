/* globals EnketoForm */
angular.module('inboxServices').service('Enketo', [
  '$window', 'DB', 'XSLT', 'FileReader',
  function($window, DB, XSLT, FileReader) {
    var objUrls = [];

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

    var update = function(formInternalId, record, docId, contactId) {
      // update an existing doc.  For convenience, get the latest version
      // and then modify the content.  This will avoid most concurrent
      // edits, but is not ideal.
      var contact;
      if(contactId) {
        return DB.get()
          .get(contactId)
          .then(function(c) {
            contact = c;
            return DB.get().get(docId);
          })
          .then(function(doc) {
            doc.content = record;
            doc.fields = recordToJs(record);
            doc.contact = contact;
            doc.from = contact? contact.phone: '';
            return DB.get().put(doc);
          });
      } else {
        return DB.get()
          .get(docId)
          .then(function(doc) {
            doc.content = record;
            doc.fields = recordToJs(record);
            doc.from = '';
            return DB.get().put(doc);
          });
      }
    };

    var create = function(formInternalId, record, contactId) {
      if(contactId) {
        return DB.get().get(contactId).then(function(contact) {
          return DB.get().post({
              content: record,
              fields: recordToJs(record),
              contact: contact,
              form: formInternalId,
              type: 'data_record',
              from: contact? contact.phone: '',
              reported_date: Date.now(),
              content_type: 'xml',
          });
        }).then(function(doc) {
          return DB.get().get(doc.id);
        });
      } else {
        return DB.get().post({
            content: record,
            fields: recordToJs(record),
            form: formInternalId,
            type: 'data_record',
            from: '',
            reported_date: Date.now(),
            content_type: 'xml',
        }).then(function(doc) {
          return DB.get().get(doc.id);
        });
      }
    };

    var transformXml = function(formDocId, doc, callback) {
      Promise
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
          callback(null, result);
        })
        .catch(callback);
    };

    var withFormByFormInternalId = function(formInternalId, callback) {
      DB.get()
        .query('medic/forms', { include_docs: true, key: formInternalId })
        .then(function(res) {
          if (!res.rows.length) {
            return callback(new Error('Requested form not found'));
          }
          var form = res.rows[0];
          DB.get()
            .getAttachment(form.id, 'xml')
            .then(FileReader)
            .then(function(text) {
              transformXml(form.id, $.parseXML(text), callback);
            })
            .catch(function(err) {
              callback(err);
            });
        })
        .catch(function(err) {
          callback(err);
        });
    };

    this.render = function(wrapper, formInternalId, formInstanceData) {
      return new Promise(function(resolve, reject) {
        withFormByFormInternalId(formInternalId, function(err, doc) {
          if (err) {
            return reject(err);
          }
          var formContainer = wrapper.find('.container').first();
          formContainer.html(doc.html);
          var form = new EnketoForm(wrapper.find('form').first(), {
            modelStr: doc.model,
            instanceStr: formInstanceData
          });
          var loadErrors = form.init();
          if (loadErrors && loadErrors.length) {
            return reject(loadErrors);
          }
          resolve(form);
        });
      });
    };

    this.save = function(formInternalId, record, docId) {
      // TODO get the current logged-in user, and pass his docId as the final
      // argument to update()/create()
      if (docId) {
        return update(formInternalId, record, docId);
      } else {
        return create(formInternalId, record);
      }
    };

    this.withAllForms = function(callback) {
      DB.get()
        .query('medic/forms', { include_docs: true })
        .then(function(res) {
          var forms = res.rows.filter(function(row) {
            return row.doc._attachments.xml;
          }).map(function(row) {
            return row.doc;
          });
          callback(forms);
        });
    };

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
            console.error('Error fetching media file', formDocId, src, err);
          });
      });
    };

    this.discardBlobs = function() {
      // unload blobs
      objUrls.forEach(function(url) {
        ($window.URL || $window.webkitURL).revokeObjectURL(url);
      });
      objUrls.length = 0;
    };
  }
]);

