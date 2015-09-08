/* globals XSLTProcessor */
angular.module('inboxServices').service('Enketo', [
  '$http', 'DB', 'DbNameService',
  function($http, DB, DbNameService) {
    var processors = {},
        xmlSerializer = new XMLSerializer(),
        objUrls = [];

    (function initProcessors() {
      var static_root = '/' + DbNameService() + '/_design/medic/static';

      $http.get(static_root + '/xslt/openrosa2html5form.xsl').then(function(doc) {
        var processor = new XSLTProcessor();
        processor.importStylesheet(doc);
        processors.html = processor;
      });

      $http.get(static_root + '/xslt/openrosa2xmlmodel.xsl').then(function(doc) {
        var processor = new XSLTProcessor();
        processor.importStylesheet(doc);
        processors.model = processor;
      });
    }());

    function transformTo(processorName, doc) {
      var transformedDoc = processors[processorName].transformToDocument(doc),
          rootElement = transformedDoc.documentElement.firstElementChild;
      return xmlSerializer.serializeToString(rootElement);
    }

    function recordToJs(record) {
      var i, n, fields = {},
          data = $.parseXML(record).firstChild.childNodes;
      for(i=0; i<data.length; ++i) {
        n = data[i];
        if(n.nodeType !== Node.ELEMENT_NODE ||
            n.nodeName === 'meta') { continue; }
        fields[n.nodeName] = n.textContent;
      }
      return fields;
    }

    // TODO merge this with `save` method
    function update(formInternalId, record, docId, facilityId) {
      // update an existing doc.  For convenience, get the latest version
      // and then modify the content.  This will avoid most concurrent
      // edits, but is not ideal.
      var contact;
      return DB.get().get(facilityId).then(function(facility) {
        contact = facility;
        return DB.get().get(docId);
      }).then(function(doc) {
        doc.content = record;
        doc.fields = recordToJs(record);
        doc.contact = contact;
        return DB.get().put(doc);
      });
    }

    function create(formInternalId, record, facilityId) {
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
    }

    this.transformXml = function(doc) {
      if(!processors.html || !processors.model) {
        return console.log('[enketo] processors are not ready');
      }
      return {
        html: transformTo('html', doc),
        model: transformTo('model', doc)
      };
    };

    this.withFormByFormInternalId = function(formInternalId, callback) {
      DB.get().query('medic/forms', {include_docs:true}).then(function(res) {
        // find our form
        _.forEach(res.rows, function(row) {
          if(!row.doc._attachments.xml) { return; }
          if(row.doc.internalId !== formInternalId) { return; }
          DB.get().getAttachment(row.id, 'xml').then(function(xmlBlob) {
            var reader = new FileReader();
            reader.addEventListener('loadend', function() {
              var xml = $.parseXML(reader.result);
              callback(row.id, xml);
            });
            reader.readAsText(xmlBlob);
          });
        });
      }).catch(function(err) {
        console.log('[enketo] failure fetching forms: ' + err);
      });
    };

    this.save = function(formInternalId, record, docId, facilityId) {
      if(docId) {
        return update(formInternalId, record, docId, facilityId);
      } else {
        return create(formInternalId, record, facilityId);
      }
    };

    this.withAllForms = function(callback) {
      DB.get().query('medic/forms', {include_docs:true}).then(function(res) {
        var forms = res.rows.filter(function(row) {
          return row.doc._attachments.xml;
        }).map(function(row) {
          return row.doc;
        });
        callback(forms);
      });
    };

    this.replaceJavarosaMediaWithLoaders = function(form) {
      form.find('img,video,audio').each(function(i, e) {
        var src;
        e = $(e); src = e.attr('src');
        if(!(/^jr:\/\//.test(src))) { return; }
        // Change URL to fragment to prevent browser trying to load it
        e.attr('src', '#'+src);
        e.css('visibility', 'hidden');
        e.wrap('<div class="loader">');
      });
    };

    this.embedJavarosaMedia = function(formDocId, formContainer) {
      formContainer.find('img,video,audio').each(function(i, e) {
        var src;
        e = $(e); src = e.attr('src');
        if(!(/^#jr:\/\//.test(src))) { return; }
        DB.get().getAttachment(formDocId, src.substring(6)).then(function(blob) {
          var objUrl = (window.URL || window.webkitURL).createObjectURL(blob);
          objUrls.push(objUrl);
          e.attr('src', objUrl);
          e.css('visibility', '');
          e.unwrap();
        }).catch(function(err) {
          console.log('[enketo] error fetching media file', formDocId, src, err);
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

