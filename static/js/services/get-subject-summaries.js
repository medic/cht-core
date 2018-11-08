var _ = require('underscore');

angular.module('inboxServices').factory('GetSubjectSummaries',
  function(
    $q,
    DB,
    GetSummaries,
    HydrateContactNames,
    LineageModelGenerator
  ) {

    'use strict';
    'ngInject';

    var isPatientId = function(string) {
      return string && string.length < 20;
    };

    var findSubjectId = function(response, id) {
      var parent = _.find(response.rows, function(row) {
        return id && row.key[1] === id.toString() || false;
      });
      return (parent && parent.id) || null;
    };

    var replaceReferencesWithIds = function(summaries, response) {
      summaries.forEach(function(summary) {
        if (summary.subject.type === 'reference' && summary.subject.value) {
          var id = findSubjectId(response, summary.subject.value);
          if (id) {
            summary.subject = {
              value: id,
              type: 'id'
            };
          } else {
            //update the type only, in case patient_id contains a doc UUID
            summary.subject.type = 'id';
          }
        }
      });

      return summaries;
    };

    var findSubjectSummary = function(response, id) {
      return _.findWhere(response, { _id: id });
    };

    var replaceIdsWithNames = function(summaries, subjectsSummaries) {
      summaries.forEach(function(summary) {
        if (summary.subject && summary.subject.type === 'id' && summary.subject.value) {
          var subjectSummary = findSubjectSummary(subjectsSummaries, summary.subject.value);
          if (subjectSummary) {
            summary.subject = {
              _id: summary.subject.value,
              value: subjectSummary.name,
              lineage: subjectSummary.lineage,
              type: 'name'
            };
          }
        }
      });

      return summaries;
    };

    var processContactIds = function(summaries, hydratedLineage) {
      var ids = _.uniq(_.compact(summaries.map(function(summary) {
        if (summary.subject && summary.subject.type === 'id') {
          return summary.subject.value;
        }
      })));

      if (!ids.length) {
        return $q.resolve(summaries);
      }

      return GetSummaries(ids)
        .then(function(response) {
          return hydratedLineage ? response : HydrateContactNames(response);
        })
        .then(function(response) {
          return replaceIdsWithNames(summaries, response);
        });
    };


    var validateSubjects = function(summaries) {
      summaries.forEach(function(summary) {
        if (!summary.subject) {
          return;
        }

        summary.validSubject = true;

        if (!summary.subject.type) {
          summary.subject.value = summary.contact || summary.from;
        } else if (summary.subject.type !== 'name' || !summary.subject.value) {
          summary.validSubject = false;
        }
      });

      return summaries;
    };

    var processReferences = function(summaries) {
      var references = _.uniq(_.compact(summaries.map(function(summary) {
        if (summary.subject && summary.subject.type === 'reference' && isPatientId(summary.subject.value)) {
          return summary.subject.value;
        }
      })));

      if (!references.length) {
        return $q.resolve(summaries);
      }

      references.forEach(function(reference, key) {
        references[key] = ['shortcode', reference];
      });

      return DB()
        .query('medic-client/contacts_by_reference', { keys: references })
        .then(function(response) {
          return replaceReferencesWithIds(summaries, response);
        });
    };

    var hydrateSubjectLineages = function(summaries, response) {
      return _.each(summaries, function(summary) {
        if (summary.subject && summary.subject._id) {
          _.extend(summary.subject, _.findWhere(response, {_id: summary.subject._id}));
        }
      });
    };

    var processSubjectLineage = function(summaries) {
      var subjectIds = _.uniq(_.compact(summaries.map(function(summary) {
        return summary.subject && summary.subject._id;
      })));

      if (!subjectIds.length) {
        return $q.resolve(summaries);
      }

      var promises = subjectIds.map(function(id) {
        return LineageModelGenerator.reportSubject(id);
      });

      return $q
        .all(promises)
        .then(function(response) {
          return hydrateSubjectLineages(summaries, response);
        });
    };

    return function(summaries, hydratedLineage) {
      var containsReports = false;
      summaries.forEach(function (summary) {
        if (summary.form) {
          containsReports = true;
        }
      });

      if (!containsReports) {
        return $q.resolve(summaries);
      }

      return processReferences(summaries)
        .then(function (summaries) {
          return processContactIds(summaries, hydratedLineage);
        })
        .then(function(summaries) {
          return hydratedLineage ? processSubjectLineage(summaries) : summaries;
        })
        .then(validateSubjects);
    };
  }
);
