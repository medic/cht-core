const _ = require('lodash');

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
    GetSubjectSummaries,
    GetSummaries,
    LineageModelGenerator
  ) {
    'ngInject';
    'use strict';

    return function(report) {
      const id = _.isString(report) ? report : report._id;
      return LineageModelGenerator.report(id)
        .then(function(model) {
          if (!model.doc) {
            return model;
          }
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
