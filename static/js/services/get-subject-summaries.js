var _ = require('underscore');

angular.module('inboxServices').factory('GetSubjectSummaries',
  function(
    $q,
    DB
  ) {

    'use strict';
    'ngInject';

    var findSubjectName = function(response, id) {
      var parent = _.findWhere(response.rows, { id: id });
      return (parent && parent.value && parent.value.name) || null;
    };

    var findSubjectUuid = function(response, id) {
      var parent = _.find(response.rows, function(row) {
        return id && row.key[1] === id.toString() || false;
      });
      return (parent && parent.id) || null;
    };

    var replacePatientIdsWithUuids = function(summaries, response) {
      summaries.forEach(function(summary) {
        if (summary.subject.type === 'patient_id' && summary.subject.value) {
          var result = findSubjectUuid(response, summary.subject.value);
          if (result) {
            summary.subject = {
              value: result,
              type: 'uuid'
            };
          }
        }
      });

      return summaries;
    };

    var replaceUuidsWithNames = function(summaries, response) {
      summaries.forEach(function(summary) {
        if (summary.subject.type === 'uuid' && summary.subject.value) {
          var result = findSubjectName(response, summary.subject.value);
          if (result) {
            summary.subject = {
              value: result,
              type: 'patient_name'
            };
          }
        }
      });

      return summaries;
    };

    var processUuids = function(summaries) {
      var ids = _.uniq(_.compact(_.flatten(summaries.map(function(summary) {
        if (summary.subject && summary.subject.type === 'uuid') {
          return summary.subject.value;
        }
      }))));

      if (!ids.length) {
        return $q.resolve(summaries);
      }

      return DB()
        .query('medic-client/doc_summaries_by_id', { keys: ids })
        .then(function(response) {
          return replaceUuidsWithNames(summaries, response);
        });
    };

    var processPatientIds = function(summaries) {
      var patient_ids = _.uniq(_.compact(_.flatten(summaries.map(function(summary) {
        if (summary.subject && summary.subject.type === 'patient_id') {
          return summary.subject.value;
        }
      }))));

      if (!patient_ids.length) {
        return $q.resolve(summaries);
      }

      patient_ids.forEach(function(patient_id, key) {
        patient_ids[key] = ['shortcode', patient_id];
      });

      return DB()
        .query('medic-client/contacts_by_reference', { keys: patient_ids })
        .then(function(response) {
          return replacePatientIdsWithUuids(summaries, response);
        });
    };

    var validateSubjects = function(summaries) {
      summaries.forEach(function(summary) {
        if (summary.subject) {
          summary.valid_subject = true;
          var subject = summary.subject;

          if (!subject.type) {
            summary.subject.value = summary.contact || summary.from;
          } else if (subject.type !== 'patient_name' || !subject.value) {
            summary.valid_subject = false;
          }
        }
      });

      return summaries;
    };

    return function(summaries) {
      return processPatientIds(summaries)
        .then(processUuids)
        .then(validateSubjects);
    };
  }
);
