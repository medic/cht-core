var _ = require('underscore');

angular.module('inboxServices').factory('ReportViewModelGenerator',
  function(
    DB,
    FormatDataRecord,
    LineageModelGenerator
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
      return LineageModelGenerator.report(id).then(function(model) {
        if (!model.doc) {
          return model;
        }
        model.displayFields = getDisplayFields(model.doc);
        return FormatDataRecord(model.doc).then(function(formatted) {
          model.formatted = formatted;
          return model;
        });
      });
    };
  }
);
