var lineageFactory = require('lineage');

/**
 * Hydrates the given doc by uuid and creates a model which holds
 * the doc and associated contacts. eg:
 * {
 *   _id: <doc uuid>,
 *   doc: <doc>,
 *   contact: <doc reporter>, // only relevant for reports
 *   lineage: <array of parents>
 * }
 */
angular.module('inboxServices').factory('LineageModelGenerator',
  function(
    $q,
    DB
  ) {
    'ngInject';
    'use strict';
    var lineage = lineageFactory($q,DB());

    var get = function(id) {
      return lineage.fetchLineageById(id)
        .then(function(docs) {
          if (!docs.length) {
            var err = new Error('Document not found');
            err.code = 404;
            throw err;
          }
          return docs;
        });
    };

    var hydrate = function(docs) {
      return lineage.fetchContacts(docs)
        .then(function(contacts) {
          lineage.fillContactsInDocs(docs, contacts);
          return docs;
        });
    };

    return {
      /**
       * Fetch a contact and its lineage by the given uuid. Returns a
       * contact model, or if options.merge is true the doc with the
       * lineage inline.
       */
      contact: function(id, options) {
        options = options || {};
        return get(id)
          .then(function(docs) {
            return hydrate(docs);
          })
          .then(function(docs) {
            // the first row is the contact
            var doc = docs.shift();
            // everything else is the lineage
            var result = {
              _id: id,
              lineage: docs
            };
            if (options.merge) {
              result.doc = lineage.fillParentsInDocs(doc, docs);
            } else {
              result.doc = doc;
            }
            return result;
          });
      },

      /**
       * Fetch a contact and its lineage by the given uuid. Returns a
       * report model.
       */
      report: function(id, options) {
        options = options || {};
        return get(id)
          .then(function(docs) {
            return hydrate(docs);
          })
          .then(function(docs) {
            // the first row is the report
            var doc = docs.shift();
            // the second row is the report's contact
            var contact = docs.shift();
            // everything else is the lineage
            if (options.merge) {
              lineage.fillParentsInDocs(doc.contact, docs);
            }
            return {
              _id: id,
              doc: doc,
              contact: contact,
              lineage: docs
            };
          });
      },
      reportSubjects: function(ids) {
        return lineage.fetchLineageByIds(ids)
          .then(function(docsList) {
            return docsList.map(function(docs){
              return {
                _id: docs[0]._id,
                doc: docs.shift(),
                lineage: docs
              };
            });
          });
      }
    };

  }
);
