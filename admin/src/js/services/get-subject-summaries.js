const _ = require('lodash/core');

angular.module('inboxServices').factory('GetSubjectSummaries',
  function(
    $q,
    DataContext,
    GetSummaries,
    LineageModelGenerator
  ) {

    'use strict';
    'ngInject';

    const datasourcePromise = DataContext.then(dataContext => dataContext.getDatasource());

    const findSubjectId = function(shortcodeUuidMap, id) {
      return (id && shortcodeUuidMap.get(id.toString())) || null;
    };

    const replaceReferencesWithIds = function(summaries, shortcodeUuidMap) {
      summaries.forEach(function(summary) {
        if (summary.subject.type === 'reference' && summary.subject.value) {
          const id = findSubjectId(shortcodeUuidMap, summary.subject.value);
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

    const findSubjectName = function(response, id) {
      const parent = _.find(response, { _id: id });
      return (parent && parent.name) || null;
    };

    const replaceIdsWithNames = function(summaries, response) {
      summaries.forEach(function(summary) {
        if (summary.subject && summary.subject.type === 'id' && summary.subject.value) {
          const name = findSubjectName(response, summary.subject.value);
          if (name) {
            summary.subject = {
              _id: summary.subject.value,
              value: name,
              type: 'name'
            };
          }
        }
      });
      return summaries;
    };

    const processContactIds = function(summaries) {
      const ids = summaries
        .filter(summary => summary.subject && summary.subject.type === 'id' && summary.subject.value)
        .map(summary => summary.subject.value);

      if (!ids.length) {
        return $q.resolve(summaries);
      }

      return GetSummaries([...new Set(ids)])
        .then(function(response) {
          return replaceIdsWithNames(summaries, response);
        });
    };

    const validateSubjects = function(summaries) {
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

    const processReferences = function(summaries) {
      const references = summaries
        .filter(summary => summary.subject && summary.subject.type === 'reference' && summary.subject.value)
        .map(summary => summary.subject.value);

      if (!references.length) {
        return $q.resolve(summaries);
      }

      const uniqReferences = [...new Set(references)];

      return datasourcePromise
        .then(function(datasource) {
          return $q.all(uniqReferences.map(function(reference) {
            return datasource.v1.contact
              .collectUuidsByShortcode(reference.toString())
              .then(function(uuids) {
                return [reference.toString(), uuids[0]];
              });
          }));
        })
        .then(function(entries) {
          return replaceReferencesWithIds(summaries, new Map(entries));
        });
    };

    const hydrateSubjectLineages = function(summaries, response) {
      return _.forEach(summaries, function(summary) {
        if (summary.subject && summary.subject._id) {
          Object.assign(summary.subject, _.find(response, {_id: summary.subject._id}));
        }
      });
    };

    const compactSubjectLineage = function(summaries) {
      return _.forEach(summaries, function(summary) {
        if (summary.subject && summary.subject.lineage) {
          summary.subject.lineage = _.compact(_.map(summary.subject.lineage, function(parent) {
            return parent && parent.name;
          }));
        }
      });
    };

    const processSubjectLineage = function(summaries) {
      const subjectIds = _.uniq(_.compact(summaries.map(function(summary) {
        return summary.subject && summary.subject._id;
      })));

      if (!subjectIds.length) {
        return $q.resolve(summaries);
      }

      return LineageModelGenerator.reportSubjects(subjectIds)
        .then(function(response) {
          return hydrateSubjectLineages(summaries, response);
        });
    };

    return function(summaries, hydratedLineage) {
      let containsReports = false;

      if (!summaries) {
        return [];
      }

      summaries.forEach(function (summary) {
        if (summary.form) {
          containsReports = true;
        }
      });

      if (!containsReports) {
        return $q.resolve(summaries);
      }

      return processReferences(summaries)
        .then(processContactIds)
        .then(processSubjectLineage)
        .then(function(summaries) {
          if (!hydratedLineage) {
            return compactSubjectLineage(summaries);
          }
          return summaries;
        })
        .then(validateSubjects);
    };
  });
