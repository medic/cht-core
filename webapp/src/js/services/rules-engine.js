'use strict';

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
  TranslateFrom,
  UHCSettings,
  UserContact,
  UserSettings
) {
  'ngInject';

  let uhcMonthStartDate;
  let ensureTaskFreshness;
  let ensureTargetFreshness;

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
            return RulesEngineCore.initialize(rulesSettings)
              .then(() => {
                const isEnabled = RulesEngineCore.isEnabled();
                if (isEnabled) {
                  assignMonthStartDate(settingsDoc);
                  monitorChanges(settingsDoc, userContactDoc, userSettingsDoc, canViewTasks, canViewTargets);

                  ensureTaskFreshness = Debounce(self.fetchTaskDocsForAllContacts, ENSURE_FRESHNESS_SECS * 1000);
                  ensureTaskFreshness();

                  ensureTargetFreshness = Debounce(self.fetchTargets, ENSURE_FRESHNESS_SECS * 1000);
                  ensureTargetFreshness();
                }
              });
          });
      })
  );
  const initialized = initialize();

  const cancelDebounce = debounce => {
    if (debounce) {
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
        const subjectId = isReport(change.doc) ? registrationUtils.getSubjectId(change.doc) : change.id;
        RulesEngineCore.updateEmissionsFor(subjectId);
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

    fetchTaskDocsForAllContacts: () => (
      initialized
        .then(() => {
          cancelDebounce(ensureTaskFreshness);
          return RulesEngineCore.fetchTasksFor();
        })
        .then(translateTaskDocs)
    ),

    fetchTaskDocsFor: contactIds => (
      initialized
        .then(() => RulesEngineCore.fetchTasksFor(contactIds))
        .then(translateTaskDocs)
    ),

    fetchTargets: () => (
      initialized
        .then(() => {
          cancelDebounce(ensureTargetFreshness);
          const relevantInterval = CalendarInterval.getCurrent(uhcMonthStartDate);
          return RulesEngineCore.fetchTargets(relevantInterval);
        })
    ),
  };

  return self;
});

// RulesEngineCore allows for karma to test using a mock shared-lib
angular.module('inboxServices').factory('RulesEngineCore', function(DB) { return rulesEngineCore(DB()); });
