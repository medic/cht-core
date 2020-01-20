const moment = require('moment');

angular.module('inboxServices').factory('TargetAggregates',
  function(
    $q,
    Auth,
    CalendarInterval,
    ContactTypes,
    DB,
    GetDataRecords,
    Search,
    Settings,
    UHCSettings,
    UserSettings
  ) {

    'use strict';
    'ngInject';

    const getCurrentIntervalTag = (settings) => {
      const uhcMonthStartDate = UHCSettings.getMonthStartDate(settings);
      const targetInterval = CalendarInterval.getCurrent(uhcMonthStartDate);

      return moment(targetInterval.end).format('Y-MM');
    };

    const fetchTargetDocs = (settings) => {
      const tag = getCurrentIntervalTag(settings);
      const opts = {
        start_key: `target~${tag}`,
        end_key: `target~${tag}\ufff0`,
        include_docs: true,
      };

      return DB().allDocs(opts).then(result => result && result.rows && result.rows.map(row => row.doc));
    };

    const fetchTargetDoc = (settings, contactUuid) => {
      const tag = getCurrentIntervalTag(settings);
      const opts = {
        start_key: `target~${tag}~${contactUuid}`,
        end_key: `target~${tag}~${contactUuid}\ufff0`,
        include_docs: true
      };

      return DB().allDocs(opts).then(result => {
        return result && result.rows && result.rows[0] && result.rows[0].doc;
      });
    };

    const getTargetsConfig = (settings, aggregatesOnly = false) => {
      return settings.tasks.targets.items.filter(target => aggregatesOnly ? target.aggregate : true);  // test here
    };

    const calculatePercent = (value) => (value && value.total) ? Math.round(value.pass * 100 / value.total) : 0;

    const aggregateTargets = (targetDocs, supervisees, settings) => {
      const targetsConfig = getTargetsConfig(settings);

      const aggregates = [];
      const validTargetDocs = [];

      targetsConfig.forEach(targetConfig => {
        targetConfig.aggregateValue = { pass: 0, total: 0 };
        targetConfig.values = [];

        targetConfig.hasGoal = targetConfig.goal > 0;
        targetConfig.isPercent = targetConfig.type === 'percent';
        targetConfig.goalText = targetConfig.goal + (targetConfig.isPercent ? '%': '');
        targetConfig.progressBar = targetConfig.hasGoal || targetConfig.isPercent;

        aggregates.push(targetConfig);
      });

      supervisees.forEach(supervisee => {
        let targetDoc = targetDocs.find(doc => doc.owner === supervisee._id);
        if (!targetDoc) {
          targetDoc = {
            placeholder: true,
            owner: supervisee._id,
            targets: []
          };
        }

        validTargetDocs.push(targetDoc);
      });

      validTargetDocs.forEach(targetDoc => {
        aggregates.forEach(aggregate => {
          const placeholderValue = { total: 0, pass: 0, placeholder: true };
          const targetDocValue = targetDoc.targets.find(target => target.id === aggregate.id);
          const value = targetDocValue && targetDocValue.value || placeholderValue;

          value.percent = aggregate.isPercent ?
            calculatePercent(value) : calculatePercent({ total: aggregate.goal, pass: value.pass });

          if (!aggregate.hasGoal) {
            aggregate.aggregateValue.pass += value.pass;
            aggregate.aggregateValue.total += value.total;
          } else {
            value.goalMet = (aggregate.isPercent ? value.percent : value.pass) >= aggregate.goal;
            if (value.goalMet) {
              aggregate.aggregateValue.pass += 1;
            }
          }

          aggregate.values.push({
            contact: supervisees.find(contact => contact._id === targetDoc.owner),
            value: value
          });
        });
      });

      return aggregates.map(aggregate => {
        if (!aggregate.hasGoal && aggregate.isPercent) {
          aggregate.aggregateValue.percent = calculatePercent(aggregate.aggregateValue);
        }

        if (aggregate.hasGoal) {
          aggregate.aggregateValue.total = validTargetDocs.length;
          aggregate.aggregateValue.goalMet = aggregate.aggregateValue.pass === aggregate.aggregateValue.total;
        }

        return aggregate;
      });
    };

    const getTargetDetails = (targetDoc, settings) => {
      if (!targetDoc) {
        return;
      }

      const targetsConfig = getTargetsConfig(settings);
      targetDoc.targets.forEach(targetValue => {
        const targetConfig = targetsConfig.find(item => item.id === targetValue.id);
        Object.assign(targetValue, targetConfig);
      });

      return targetDoc;
    };

    const searchForContacts = (filters, skip = 0, contacts = []) => {
      const limit = 100;
      return Search('contacts', filters, { limit, skip }).then(results => {
        contacts = contacts.concat(...results);
        if (results.length < limit) {
          return contacts;
        }

        return searchForContacts(filters, skip + limit, contacts);
      });
    };

    const getSupervisees = () => {
      const alphabeticalSort = (a, b) => String(a.name).localeCompare(String(b.name));

      return UserSettings()
        .then(userSettings => {
          if (!userSettings.facility_id) {
            return;
          }

          return GetDataRecords(userSettings.facility_id)
            .then(homePlaceSummary => {
              if (!homePlaceSummary) {
                throw new Error('Unable to load target aggregates: facility not found');
              }
              const homePlaceType = ContactTypes.getTypeId(homePlaceSummary);
              return ContactTypes.getChildren(homePlaceType);
            })
            .then(childTypes => {
              childTypes = childTypes.filter(type => !ContactTypes.isPersonType(type));
              const filters = {  types: { selected: childTypes.map(type => type.id) } };
              return searchForContacts(filters);
            })
            .then(childPlacesSummaries => {
              return childPlacesSummaries
                .filter(place => place.lineage && place.lineage[0] === userSettings.facility_id && place.contact)
                .map(place => place.contact);
            })
            .then(contactIds => GetDataRecords(contactIds))
            .then(supervisees => supervisees.sort(alphabeticalSort));
        });
    };

    const service = {};

    service.isEnabled = () => {
      // todo decide whether you want to make this offline only!
      return $q
        .all([
          Auth('can_aggregate_targets').then(() => true).catch(() => false),
        ])
        .then(([ canAggregateTargets ]) => {
          return canAggregateTargets;
        });
    };

    service.getAggregates = () => {
      return $q
        .all([getSupervisees(), Settings()])
        .then(([ supervisees, settings ]) => {
          return fetchTargetDocs(settings).then(targetDocs => aggregateTargets(targetDocs, supervisees, settings));
        });
    };

    service.getAggregateDetails = (targetId, aggregates) => {
      if (!targetId) {
        return;
      }
      const aggregate = aggregates.find(aggregate => aggregate.id === targetId);
      return aggregate;
    };

    service.getTargets = (contact) => {
      const contactUuid = contact._id || contact;
      return Settings().then(settings => {
        return fetchTargetDoc(settings, contactUuid).then(targetDoc => getTargetDetails(targetDoc, settings));
      });
    };

    return service;
  }
);
