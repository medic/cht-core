const moment = require('moment');
const _ = require('lodash');

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

    const fetchLatestTargetDocs = (settings) => {
      const tag = getCurrentIntervalTag(settings);
      const opts = {
        start_key: `target~${tag}~`,
        end_key: `target~${tag}~\ufff0`,
        include_docs: true,
      };

      return DB()
        .allDocs(opts)
        .then(result => result &&
                        result.rows &&
                        result.rows.map(row => row.doc).filter(doc => doc));
    };

    const fetchLatestTargetDoc = (settings, contactUuid) => {
      const tag = getCurrentIntervalTag(settings);
      const opts = {
        start_key: `target~${tag}~${contactUuid}~`,
        end_key: `target~${tag}~${contactUuid}~\ufff0`,
        include_docs: true
      };

      return DB().allDocs(opts).then(result => {
        return result && result.rows && result.rows[0] && result.rows[0].doc;
      });
    };

    const getTargetsConfig = (settings, aggregatesOnly = false) => {
      return settings &&
             settings.tasks &&
             settings.tasks.targets &&
             settings.tasks.targets.items.filter(target => aggregatesOnly ? target.aggregate : true) ||
             [];
    };

    const calculatePercent = (value) => (value && value.total) ? Math.round(value.pass * 100 / value.total) : 0;

    const getAggregate = targetConfig => {
      const aggregate = targetConfig;

      aggregate.aggregateValue = { pass: 0, total: 0 };
      aggregate.values = [];
      aggregate.hasGoal = targetConfig.goal > 0;
      aggregate.isPercent = targetConfig.type === 'percent';
      aggregate.progressBar = targetConfig.hasGoal || targetConfig.isPercent;

      return aggregate;
    };

    const getRelevantTargetDocs = (targetDocs, contacts) => {
      return contacts.map(contact => {
        let targetDoc = targetDocs.find(doc => doc.owner === contact._id);
        if (!targetDoc) {
          targetDoc = {
            placeholder: true,
            owner: contact._id,
            targets: []
          };
        }
        targetDoc.contact = contact;
        return targetDoc;
      });
    };

    const addAggregatesValues = (aggregate, targetDoc) => {
      const targetValue = targetDoc.targets.find(target => target.id === aggregate.id);
      const value = targetValue && targetValue.value || { total: 0, pass: 0, placeholder: true };

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
        contact: targetDoc.contact,
        value: value
      });
    };

    const calculatePercentages = (aggregate, total) => {
      if (!aggregate.hasGoal && aggregate.isPercent) {
        aggregate.aggregateValue.percent = calculatePercent(aggregate.aggregateValue);
      }

      if (aggregate.hasGoal) {
        aggregate.aggregateValue.total = total;
        aggregate.aggregateValue.goalMet = aggregate.aggregateValue.pass === aggregate.aggregateValue.total;
      }
    };

    const aggregateTargets = (latestTargetDocs, contacts, targetsConfig) => {
      const relevantTargetDocs = getRelevantTargetDocs(latestTargetDocs, contacts);
      const aggregates = targetsConfig.map(getAggregate);

      relevantTargetDocs.forEach(targetDoc => {
        aggregates.forEach(aggregate => {
          addAggregatesValues(aggregate, targetDoc);
        });
      });

      aggregates.forEach(aggregate => calculatePercentages(aggregate, relevantTargetDocs.length));

      return aggregates;
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

    const searchForContacts = (userSettings, filters, skip = 0, contacts = []) => {
      const limit = 100;

      return Search('contacts', filters, { limit, skip })
        .then(results => {
          const contactIds = results
            .filter(place => place.lineage && place.lineage[0] === userSettings.facility_id && place.contact)
            .map(place => place.contact);

          return GetDataRecords(contactIds).then(newContacts => {
            contacts.push(...newContacts);

            if (results.length < limit) {
              return contacts;
            }

            return searchForContacts(userSettings, filters, skip + limit, contacts);
          });
        });
    };

    const getSupervisedContacts = () => {
      const alphabeticalSort = (a, b) => String(a.name).localeCompare(String(b.name));
      const facilityError = () => {
        const err =  new Error('Your user does not have an associated contact, or does not have access to the ' +
                               'associated contact.');
        err.translationKey = 'analytics.target.aggreagates.error.no.contact';
        return err;
      };

      return UserSettings()
        .then(userSettings => {
          if (!userSettings.facility_id) {
            throw facilityError();
          }

          return GetDataRecords(userSettings.facility_id)
            .then(homePlaceSummary => {
              if (!homePlaceSummary) {
                throw facilityError();
              }
              const homePlaceType = ContactTypes.getTypeId(homePlaceSummary);
              return ContactTypes.getChildren(homePlaceType);
            })
            .then(childTypes => {
              childTypes = childTypes.filter(type => !ContactTypes.isPersonType(type));

              if (!childTypes.length) {
                return [];
              }

              const filters = {  types: { selected: childTypes.map(type => type.id) } };
              return searchForContacts(userSettings, filters);
            })
            .then(contacts => contacts.sort(alphabeticalSort));
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
      return Settings().then(settings => {
        const targetsConfig = getTargetsConfig(settings, true);
        if (!targetsConfig.length) {
          return [];
        }

        return $q
          .all([ getSupervisedContacts(), fetchLatestTargetDocs(settings) ])
          .then(([ contacts, latestTargetDocs ]) => aggregateTargets(latestTargetDocs, contacts, targetsConfig));
      });
    };

    service.getAggregateDetails = (targetId, aggregates) => {
      if (!targetId || !aggregates) {
        return;
      }
      return aggregates.find(aggregate => aggregate.id === targetId);
    };

    service.getTargets = (contact) => {
      if (!contact) {
        return;
      }

      const contactUuid = _.isString(contact) ? contact : contact._id;
      if (!contactUuid) {
        return;
      }

      return Settings().then(settings => {
        return fetchLatestTargetDoc(settings, contactUuid).then(targetDoc => getTargetDetails(targetDoc, settings));
      });
    };

    return service;
  }
);
