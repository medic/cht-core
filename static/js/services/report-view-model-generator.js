var _ = require('underscore');

angular.module('inboxServices').factory('ReportViewModelGenerator',
  function(
    DB,
    FormatDataRecord
  ) {
    'ngInject';
    'use strict';

    var getFields = function(results, values, labelPrefix, depth) {
      if (depth > 3) {
        depth = 3;
      }
      Object.keys(values).forEach(function(key) {
        var value = values[key];
        var label = labelPrefix + '.' + key;
        if (_.isObject(value)) {
          results.push({
            label: label,
            depth: depth
          });
          getFields(results, value, label, depth + 1);
        } else {
          results.push({
            label: label,
            value: value,
            depth: depth
          });
        }
      });
      return results;
    };

    var getDisplayFields = function(doc) {
      // calculate fields to display
      if (!doc.fields) {
        return [];
      }
      var label = 'report.' + doc.form;
      var fields = getFields([], doc.fields, label, 0);
      var hide = doc.hidden_fields || [];
      hide.push('inputs');
      return _.reject(fields, function(field) {
        return _.some(hide, function(h) {
          return field.label.indexOf(label + '.' + h) === 0;
        });
      });
    };

    return function(id) {
      var options = {
        startkey: [ id, 0 ],
        endkey: [ id, 100 ], // TODO what's the max depth?
        include_docs: true
      };
      return DB()
        .query('medic-client/docs_by_id_lineage', options)
        .then(function(result) {
          var reportRow = result.rows.shift();
          if (!reportRow) {
            return;
          }
          var report = reportRow && reportRow.doc;
          var contactRow = result.rows.shift();
          var lineage = result.rows.map(function(row) {
            return row.doc;
          });
          return {
            _id: report._id,
            doc: report,
            displayFields: getDisplayFields(report),
            contact: contactRow && contactRow.doc,
            lineage: lineage
          };
        })
        .then(function(model) {
          // TODO inline FormatDataRecord and the sms_utils call
          //      here - it's antiquated
          // TODO clone model.doc so it's not modified!
          return FormatDataRecord(model.doc).then(function(formatted) {
            model.formatted = formatted;
            return model;
          });
        });
    };
  }
);
