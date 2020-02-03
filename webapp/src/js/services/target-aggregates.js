const moment = require('moment');
const _ = require('lodash');

angular.module('inboxServices').factory('TargetAggregates',
  function(
    $q,
    $translate,
    Auth,
    CalendarInterval,
    ContactTypes,
    DB,
    GetDataRecords,
    Search,
    Settings,
    TranslateFrom,
    UHCSettings,
    UserSettings
  ) {

    'use strict';
    'ngInject';

    // Targets reporting intervals cover a calendaristic month, starting on a configurable day (uhcMonthStartDate)
    // Each target doc will use the end date of its reporting interval, in YYYY-MM format, as part of its _id
    // ex: uhcMonthStartDate is 12, current date is 2020-02-03, the <interval_tag> will be 2020-02
    // ex: uhcMonthStartDate is 15, current date is 2020-02-21, the <interval_tag> will be 2020-03
    const getCurrentIntervalTag = (settings) => {
      const uhcMonthStartDate = UHCSettings.getMonthStartDate(settings);
      const targetInterval = CalendarInterval.getCurrent(uhcMonthStartDate);

      return moment(targetInterval.end).format('Y-MM');
    };

    // Every target doc follows the _id scheme `target~<interval_tag>~<contact_uuid>~<user_id>`
    // In order to retrieve the latest target document(s), we compute the current interval <interval_tag>
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
    const getTranslatedTitle = (target) => {
      return target.translation_key ? $translate.instant(target.translation_key) : TranslateFrom(target.title);
    };

    const getAggregate = targetConfig => {
      const aggregate = targetConfig;

      aggregate.values = [];
      aggregate.hasGoal = targetConfig.goal > 0;
      aggregate.isPercent = targetConfig.type === 'percent';
      aggregate.progressBar = targetConfig.hasGoal || targetConfig.isPercent;
      aggregate.heading = getTranslatedTitle(targetConfig);
      aggregate.aggregateValue = { pass: 0, total: 0 };

      return aggregate;
    };

    const getRelevantTargetDocs = (targetDocs, contacts) => {
      return contacts.map(contact => {
        let targetDoc = targetDocs.find(doc => doc.owner === contact._id);
        if (!targetDoc) {
          targetDoc = {
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
        aggregate.aggregateValue.goalMet = aggregate.aggregateValue.pass >= aggregate.aggregateValue.total;
      }

      aggregate.aggregateValue.hasGoal = aggregate.hasGoal;

      if (aggregate.hasGoal) {
        aggregate.aggregateValue.summary =
          $translate.instant('analytics.target.aggregates.ratio', aggregate.aggregateValue);
      } else {
        aggregate.aggregateValue.summary = aggregate.isPercent ?
          `${aggregate.aggregateValue.percent}%` : aggregate.aggregateValue.pass;
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

    const searchForContacts = (homePlaceSummary, filters, skip = 0, contacts = []) => {
      const limit = 100;

      return Search('contacts', filters, { limit, skip })
        .then(results => {
          const contactIds = results
            .filter(place => place.lineage && place.lineage[0] === homePlaceSummary._id && place.contact)
            .map(place => place.contact);

          return GetDataRecords(contactIds).then(newContacts => {
            contacts.push(...newContacts);

            if (results.length < limit) {
              return contacts;
            }

            return searchForContacts(homePlaceSummary, filters, skip + limit, contacts);
          });
        });
    };

    const getHomePlace = () => {
      return UserSettings().then(userSettings => {
        if (!userSettings.facility_id) {
          return;
        }

        return GetDataRecords(userSettings.facility_id);
      });
    };

    const getSupervisedContacts = () => {
      const alphabeticalSort = (a, b) => String(a.name).localeCompare(String(b.name));

      return getHomePlace()
        .then(homePlaceSummary => {
          if (!homePlaceSummary) {
            const err =  new Error('Your user does not have an associated contact, or does not have access to the ' +
                                   'associated contact.');
            err.translationKey = 'analytics.target.aggregates.error.no.contact';
            throw err;
          }
          const homePlaceType = ContactTypes.getTypeId(homePlaceSummary);
          return ContactTypes
            .getChildren(homePlaceType)
            .then(childTypes => {
              childTypes = childTypes.filter(type => !ContactTypes.isPersonType(type));

              if (!childTypes.length) {
                return [];
              }

              const filters = {  types: { selected: childTypes.map(type => type.id) } };
              return searchForContacts(homePlaceSummary, filters);
            })
            .then(contacts => contacts.sort(alphabeticalSort));
        });
    };

    const service = {};

    service.isEnabled = () => {
      return Auth('can_aggregate_targets').then(() => true).catch(() => false);
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
