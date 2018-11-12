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

    var get = function(id) {
      return DB()
        .query('medic-client/docs_by_id_lineage', {
          startkey: [ id ],
          endkey: [ id, {} ],
          include_docs: true
        })
        .then(function(result) {
          if (!result.rows.length) {
            var err = new Error('Document not found: ' + id);
            err.code = 404;
            throw err;
          }
          return result.rows.map(function(row) {
            return row && row.doc;
          });
        });
    };

    var hydrate = function(docs) {
      var contactIds = docs
        .map(function(parent) {
          return parent && parent.contact && parent.contact._id;
        })
        .filter(function(id) {
          return !!id;
        });
      if (!contactIds.length) {
        return $q.resolve(docs);
      }
      return DB().allDocs({ keys: contactIds, include_docs: true })
        .then(function(response) {
          docs.forEach(function(parent) {
            var contactId = parent && parent.contact && parent.contact._id;
            if (contactId) {
              response.rows.forEach(function(row) {
                if (row.doc && (row.doc._id === contactId)) {
                  parent.contact = row.doc;
                  return;
                }
              });
            }
          });
          return docs;
        });
    };

    var mergeParents = function(doc, lineage) {
      var current = doc;
      lineage.forEach(function(hydrated) {
        if (!current) {
          return;
        }
        if (hydrated) {
          current.parent = hydrated;
        }
        current = current.parent;
      });
      return doc;
    };

    return {

      /**
       * Fetch a contact and its lineage by the given uuid. Returns a
       * contact model, or if options.merge is true the doc with the
       * lineage inline.
       */
      contact: function(id, options) {
        options = options || {};
        return get(id).then(function(docs) {
          return hydrate(docs).then(function(docs) {
            // the first row is the contact
            var doc = docs.shift();
            // everything else is the lineage
            var result = {
              _id: id,
              lineage: docs
            };
            if (options.merge) {
              result.doc = mergeParents(doc, docs);
            } else {
              result.doc = doc;
            }
            return result;
          });
        });
      },

      /**
       * Fetch a contact and its lineage by the given uuid. Returns a
       * report model.
       */
      report: function(id, options) {
        options = options || {};
        return get(id).then(function(docs) {
          return hydrate(docs).then(function(docs) {
            // the first row is the report
            var doc = docs.shift();
            // the second row is the report's contact
            var contact = docs.shift();
            // everything else is the lineage
            if (options.merge) {
              mergeParents(doc.contact, docs);
            }
            return {
              _id: id,
              doc: doc,
              contact: contact,
              lineage: docs
            };
          });
        });
      },
      reportSubject: function(id) {
        return get(id).then(function(docs) {
          return {
            _id: id,
            doc: docs.shift(),
            lineage: docs
          };
        });
      }
    };

  }
);
