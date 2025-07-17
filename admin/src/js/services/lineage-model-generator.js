const lineageFactory = require('@medic/lineage');
const cht = require('@medic/cht-datasource');
const chtDatasource = cht.getDatasource(cht.getRemoteDataContext());
chtDatasource.v1.report.getByUuidWithLineage;
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
    const lineageLib = lineageFactory($q, DB());

    const get = function(id) {
      return lineageLib.fetchLineageById(id)
        .then(function(docs) {
          if (!docs.length) {
            const err = new Error(`Document not found: ${id}`);
            err.code = 404;
            throw err;
          }
          return docs;
        });
    };

    const hydrate = function(lineageArray) {
      return lineageLib.fetchContacts(lineageArray)
        .then(function(contacts) {
          lineageLib.fillContactsInDocs(lineageArray, contacts);
          return lineageArray;
        });
    };

    return {
      /**
       * Fetch a contact and its lineage by the given uuid. Returns a
       * contact model, or if merge is true the doc with the
       * lineage inline.
       */
      contact: (id, { merge=false }={}) => {
        return get(id)
          .then(function(docs) {
            return hydrate(docs);
          })
          .then(function(docs) {
            // the first row is the contact
            const doc = docs.shift();
            // everything else is the lineage
            const result = {
              _id: id,
              lineage: docs
            };
            if (merge) {
              result.doc = lineageLib.fillParentsInDocs(doc, docs);

              // The lineage should also be hydrated when merge is true
              const deepCopy = obj => JSON.parse(JSON.stringify(obj));
              for (let i = result.lineage.length - 2; i >= 0; i--) {
                if (!result.lineage[i] || !result.lineage[i+1]) {
                  continue;
                }
                result.lineage[i].parent = deepCopy(result.lineage[i+1]);
              }
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
      report: function(id) {
        return chtDatasource.v1.report.getByUuidWithLineage(id)
          .then(function(hydrated) {
            if (!hydrated) {
              const err = new Error(`Report not found: ${id}`);
              err.code = 404;
              throw err;
            }
            return {
              _id: id,
              doc: hydrated,
              contact: hydrated.contact,
            };
          });
      },

      reportSubjects: function(ids) {
        return lineageLib.fetchLineageByIds(ids)
          .then(function(docsList) {
            return docsList.map(function(docs) {
              return {
                _id: docs[0]._id,
                doc: docs.shift(),
                lineage: docs
              };
            });
          });
      }
    };

  });
