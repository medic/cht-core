/* globals XSLTProcessor, EnketoForm */
angular.module('inboxServices').service('Enketo', [
  '$http', 'DB', 'DbNameService',
  function($http, DB, DbNameService) {
    var processors = {},
        xmlSerializer = new XMLSerializer(),
        objUrls = [];

    (function initProcessors() {
      var static_root = '/' + DbNameService() + '/_design/medic/static';

      var getProcessor = function(name, file) {
        $http
          .get(static_root + file, { responseType: 'document' })
          .then(function(response) {
            var processor = new XSLTProcessor();
            processor.importStylesheet(response.data);
            processors[name] = processor;
          });
      };

      getProcessor('html', '/dist/xslt/openrosa2html5form.xsl');
      getProcessor('model', '/dist/xslt/openrosa2xmlmodel.xsl');
    }());

    var transformTo = function(processorName, doc) {
      var transformedDoc = processors[processorName].transformToDocument(doc),
          rootElement = transformedDoc.documentElement.firstElementChild;
      return xmlSerializer.serializeToString(rootElement);
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

    // TODO merge this with `save` method
    var update = function(formInternalId, record, docId, facilityId) {
      // update an existing doc.  For convenience, get the latest version
      // and then modify the content.  This will avoid most concurrent
      // edits, but is not ideal.
      var contact;
      return DB.get()
        .get(facilityId)
        .then(function(facility) {
          contact = facility;
          return DB.get().get(docId);
        })
        .then(function(doc) {
          doc.content = record;
          doc.fields = recordToJs(record);
          doc.contact = contact;
          return DB.get().put(doc);
        });
    };

    var create = function(formInternalId, record, facilityId) {
      return DB.get().get(facilityId).then(function(facility) {
        return DB.get().post({
          content: record,
          fields: recordToJs(record),
          contact: facility,
          form: formInternalId,
          type: 'data_record',
          from: facility? facility.phone: '',
          reported_date: Date.now(),
          content_type: 'xml',
        });
      }).then(function(doc) {
        return DB.get().get(doc.id);
      });
    };

    var transformXml = function(formDocId, doc) {
      if (!processors.html || !processors.model) {
        return console.log('[enketo] processors are not ready');
      }
      var html = $(transformTo('html', doc));
      replaceJavarosaMediaWithLoaders(formDocId, html);
      return {
        html: html,
        model: transformTo('model', doc)
      };
    };

    var withFormByFormInternalId = function(formInternalId, callback) {
      // TODO query by internal code
      DB.get()
        .query('medic/forms', { include_docs: true })
        .then(function(res) {
          // find our form
          _.forEach(res.rows, function(row) {
            if (!row.doc._attachments.xml || 
                row.doc.internalId !== formInternalId) {
              return;
            }
            DB.get()
              .getAttachment(row.id, 'xml')
              .then(function(xmlBlob) {
                var reader = new FileReader();
                reader.addEventListener('loadend', function() {
                  var result = transformXml(row.id, $.parseXML(reader.result));
                  callback(null, result);
                });
                reader.readAsText(xmlBlob);
              });
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
          formContainer.empty();
          formContainer.append(doc.html);
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

    this.save = function(formInternalId, record, docId, facilityId) {
      if (docId) {
        return update(formInternalId, record, docId, facilityId);
      } else {
        return create(formInternalId, record, facilityId);
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
            var objUrl = (window.URL || window.webkitURL).createObjectURL(blob);
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
        (window.URL || window.webkitURL).revokeObjectURL(url);
      });
      objUrls.length = 0;
    };
  }
]);

