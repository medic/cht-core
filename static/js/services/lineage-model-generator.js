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
    DB
  ) {
    'ngInject';
    'use strict';

    var get = function(id) {
      return DB().query('medic-client/docs_by_id_lineage', {
        startkey: [ id ],
        endkey: [ id, {} ],
        include_docs: true
      });
    };

    var next = function(result) {
      var row = result.rows.shift();
      return row && row.doc;
    };

    var rest = function(result) {
      return result.rows.map(function(row) {
        return row.doc;
      });
    };

    var getBaseModel = function(id) {
      return get(id).then(function(result) {
        return {
          _id: id,
          doc: next(result),
          lineage: rest(result)
        };
      });
    };

    return {
      contact: getBaseModel,
      report: function(id) {
        return getBaseModel(id).then(function(model) {
          // strip the first lineage element off for the contact
          model.contact = model.lineage.shift();
          return model;
        });
      }
    };

  }
);
