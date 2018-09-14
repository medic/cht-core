var _ = require('underscore');

/**
 * Hydrates the given contact by uuid and creates a model which
 * holds the doc and associated information for rendering. eg:
 * {
 *   _id: <doc uuid>,
 *   doc: <doc>,
 *   contact: <doc reporter>,
 *   lineage: <array of contact's parents>,
 *   displayFields: <array of fields to show>,
 *   formatted: <the doc formatted using the FormatDataRecord service>
 * }
 */
angular.module('inboxServices').factory('ReportViewModelGenerator',
  function(
    FormatDataRecord,
    LineageModelGenerator,
    DB,
    GetSubjectSummaries,
    GetSummaries
  ) {
    'ngInject';
    'use strict';

    var getFields = function(doc, results, values, labelPrefix, depth) {
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
          getFields(doc, results, value, label, depth + 1);
        } else {
          var result = {
            label: label,
            value: value,
            depth: depth
          };

          var filePath = 'user-file/' + label.split('.').slice(1).join('/');
          if (doc &&
              doc._attachments &&
              doc._attachments[filePath] &&
              doc._attachments[filePath].content_type &&
              doc._attachments[filePath].content_type.startsWith('image/')) {
            result.imagePath = filePath;
          }

          results.push(result);
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
      var fields = getFields(doc, [], doc.fields, label, 0);
      var hide = doc.hidden_fields || [];
      hide.push('inputs');
      return _.reject(fields, function(field) {
        return _.some(hide, function(h) {
          var hiddenLabel = label + '.' + h;
          return hiddenLabel === field.label || field.label.indexOf(hiddenLabel + '.') === 0;
        });
      });
    };

    return function(id) {
      return LineageModelGenerator.report(id, { merge: true })
        .then(function(model) {
          if (!model.doc) {
            return model;
          }
          model.displayFields = getDisplayFields(model.doc);
          return FormatDataRecord(model.doc).then(function(formatted) {
            model.formatted = formatted;
            return model;
          });
        })
        .then(function(model) {
          return GetSummaries([model.doc._id])
            .then(function(results) {
              return GetSubjectSummaries(results, true);
            })
            .then(function(summaries) {
              if (summaries && summaries.length) {
                model.formatted.subject = summaries.pop().subject;
              }

              return model;
            });
        });
    };
  }
);
