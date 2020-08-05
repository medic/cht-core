'use strict';

const _ = require('lodash/core');

const registrationUtils = require('@medic/registration-utils');
const rulesEngineCore = require('@medic/rules-engine');

const MAX_LINEAGE_DEPTH = 50;
const ENSURE_FRESHNESS_SECS = 120;

angular.module('inboxServices').factory('RulesEngine', function(
  $parse,
  $translate,
  Auth,
  CalendarInterval,
  Changes,
  ContactTypes,
  Debounce,
  RulesEngineCore,
  Session,
  Settings,
  Telemetry,
  TranslateFrom,
  UHCSettings,
  UserContact,
  UserSettings
) {
  'ngInject';

  let uhcMonthStartDate;
  let ensureTaskFreshness;
  let ensureTargetFreshness;
  let ensureTaskFreshnessTelemetryData;
  let ensureTargetFreshnessTelemetryData;

  const initialize = () => (
    Promise.all([Auth.has('can_view_tasks'), Auth.has('can_view_analytics')])
      .then(([canViewTasks, canViewTargets]) => {
        const hasPermission = canViewTargets || canViewTasks;
        if (!hasPermission || Session.isOnlineOnly()) {
          return false;
        }

        return Promise.all([ Settings(), UserContact(), UserSettings() ])
          .then(([settingsDoc, userContactDoc, userSettingsDoc]) => {
            const rulesSettings = getRulesSettings(
              settingsDoc,
              userContactDoc,
              userSettingsDoc,
              canViewTasks,
              canViewTargets
            );
            const initializeTelemetryData = telemetryEntry('rules-engine:initialize', true);
            return RulesEngineCore.initialize(rulesSettings)
              .then(() => {
                const isEnabled = RulesEngineCore.isEnabled();
                if (isEnabled) {
                  assignMonthStartDate(settingsDoc);
                  monitorChanges(settingsDoc, userContactDoc, userSettingsDoc, canViewTasks, canViewTargets);

                  ensureTaskFreshness = Debounce(self.fetchTaskDocsForAllContacts, ENSURE_FRESHNESS_SECS * 1000);
                  ensureTaskFreshness();
                  ensureTaskFreshnessTelemetryData =
                    telemetryEntry('rules-engine:ensureTaskFreshness:cancel', true);

                  ensureTargetFreshness = Debounce(self.fetchTargets, ENSURE_FRESHNESS_SECS * 1000);
                  ensureTargetFreshness();
                  ensureTargetFreshnessTelemetryData =
                    telemetryEntry('rules-engine:ensureTargetFreshness:cancel', true);
                }

                initializeTelemetryData.record();
              });
          });
      })
  );
  const initialized = initialize();

  const telemetryEntry = (entry, startNow = false) => {
    const data = { entry };
    const queued = () => {
      data.queued = Date.now();
    };

    const start = () => {
      data.start = Date.now();
      data.queued && Telemetry.record(`${data.entry}:queued`, data.start - data.queued);
    };

    const record = () => {
      data.start = data.start || Date.now();
      data.end = Date.now();
      Telemetry.record(data.entry, data.end - data.start);
    };

    if (startNow) {
      start();
    }

    return {
      start,
      queued,
      record,
      passThrough: (result) => {
        record();
        return result;
      },
    };
  };

  const cancelDebounce = (debounce, telemetryDataEntry) => {
    if (debounce) {
      if (!debounce.executed() && !debounce.cancelled()) {
        telemetryDataEntry.record();
      }
      debounce.cancel();
    }
  };

  const getRulesSettings = (settingsDoc, userContactDoc, userSettingsDoc, enableTasks, enableTargets) => {
    const settingsTasks = settingsDoc && settingsDoc.tasks || {};
    const filterTargetByContext = target => target.context ? !!$parse(target.context)({ user: userContactDoc }) : true;
    const targets = settingsTasks.targets && settingsTasks.targets.items || [];

    return {
      rules: settingsTasks.rules,
      taskSchedules: settingsTasks.schedules,
      targets: targets.filter(filterTargetByContext),
      enableTasks,
      enableTargets,
      contact: userContactDoc,
      user: userSettingsDoc,
      monthStartDate: UHCSettings.getMonthStartDate(settingsDoc),
    };
  };

  const monitorChanges = (settingsDoc, userContactDoc, userSettingsDoc, canViewTasks, canViewTargets) => {
    const isReport = doc => doc.type === 'data_record' && !!doc.form;
    Changes({
      key: 'mark-contacts-dirty',
      filter: change => !!change.doc && (ContactTypes.includes(change.doc) || isReport(change.doc)),
      callback: change => {
        const subjectIds = isReport(change.doc) ? registrationUtils.getSubjectId(change.doc) : change.id;
        const telemetryData = telemetryEntry('rules-engine:update-emissions', true);
        return RulesEngineCore
          .updateEmissionsFor(subjectIds)
          .then(telemetryData.passThrough);
      },
    });

    const userLineage = [];
    for (let current = userContactDoc; !!current && userLineage.length < MAX_LINEAGE_DEPTH; current = current.parent) {
      userLineage.push(current._id);
    }

    const rulesConfigChange = () => {
      const rulesSettings = getRulesSettings(
        settingsDoc,
        userContactDoc,
        userSettingsDoc,
        canViewTasks,
        canViewTargets
      );
      RulesEngineCore.rulesConfigChange(rulesSettings);
      assignMonthStartDate(settingsDoc);
    };

    Changes({
      key: 'rules-config-update',
      filter: change => change.id === 'settings' || userLineage.includes(change.id),
      callback: change => {
        if (change.id !== 'settings') {
          return UserContact()
            .then(updatedUser => {
              userContactDoc = updatedUser;
              rulesConfigChange();
            });
        }

        settingsDoc = change.doc.settings;
        rulesConfigChange();
      },
    });
  };

  const monitorExternalChanges = (changedDocs) => {
    const contactsWithUpdatedTasks = changedDocs
      .filter(doc => doc.type === 'task')
      .map(doc => doc.requester);
    if (!contactsWithUpdatedTasks.length) {
      return;
    }

    return RulesEngineCore.updateEmissionsFor(_.uniq(contactsWithUpdatedTasks));
  };

  const translateTaskDocs = taskDocs => {
    const translateProperty = (property, task) => {
      if (typeof property === 'string') {
        // new translation key style
        return $translate.instant(property, task);
      }
      // old message array style
      return TranslateFrom(property, task);
    };

    for (const taskDoc of taskDocs) {
      const { emission } = taskDoc;
      if (emission) {
        emission.title = translateProperty(emission.title, emission);
        emission.priorityLabel = translateProperty(emission.priorityLabel, emission);
      }
    }

    return taskDocs;
  };

  const assignMonthStartDate = settingsDoc => {
    uhcMonthStartDate = UHCSettings.getMonthStartDate(settingsDoc);
  };

  const self = {
    isEnabled: () => initialized.then(RulesEngineCore.isEnabled),

    fetchTaskDocsForAllContacts: () => {
      const telemetryData = telemetryEntry('rules-engine:tasks:all-contacts');

      return initialized
        .then(() => {
          Telemetry.record('rules-engine:tasks:dirty-contacts', RulesEngineCore.getDirtyContacts().length);
          cancelDebounce(ensureTaskFreshness, ensureTaskFreshnessTelemetryData);
          return RulesEngineCore.fetchTasksFor()
            .on('queued', telemetryData.queued)
            .on('running', telemetryData.start);
        })
        .then(telemetryData.passThrough)
        .then(translateTaskDocs);
    },

    fetchTaskDocsFor: contactIds => {
      const telemetryData = telemetryEntry('rules-engine:tasks:some-contacts');
      return initialized
        .then(() => {
          Telemetry.record('rules-engine:tasks:dirty-contacts', RulesEngineCore.getDirtyContacts().length);
          return RulesEngineCore
            .fetchTasksFor(contactIds)
            .on('queued', telemetryData.queued)
            .on('running', telemetryData.start);
        })
        .then(telemetryData.passThrough)
        .then(translateTaskDocs);
    },

    fetchTargets: () => {
      const telemetryData = telemetryEntry('rules-engine:targets');
      return initialized
        .then(() => {
          Telemetry.record('rules-engine:targets:dirty-contacts', RulesEngineCore.getDirtyContacts().length);
          cancelDebounce(ensureTargetFreshness, ensureTargetFreshnessTelemetryData);
          const relevantInterval = CalendarInterval.getCurrent(uhcMonthStartDate);
          return RulesEngineCore
            .fetchTargets(relevantInterval)
            .on('queued', telemetryData.queued)
            .on('running', telemetryData.start);
        })
        .then(telemetryData.passThrough);
    },

    monitorExternalChanges: (replicationResult) => (
      initialized.then(() => {
        return replicationResult &&
               replicationResult.docs &&
               monitorExternalChanges(replicationResult.docs);
      })
    ),
  };

  return self;
});

// RulesEngineCore allows for karma to test using a mock shared-lib
angular.module('inboxServices').factory('RulesEngineCore', function(DB) { return rulesEngineCore(DB()); });
