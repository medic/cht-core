'use strict';

const moment = require('moment');
const registrationUtils = require('@medic/registration-utils');
const rulesEngineCore = require('@medic/rules-engine');

const MAX_LINEAGE_DEPTH = 50;

angular.module('inboxServices').factory('RulesEngine', function(
  $translate,
  Auth,
  CalendarInterval,
  Changes,
  ContactTypes,
  DB,
  RulesEngineCore,
  Session,
  Settings,
  TranslateFrom,
  UHCSettings,
  UserContact
) {
  'ngInject';

  let uhcMonthStartDate;

  const hasRole = role => Auth(role).then(() => true).catch(() => false);
  const initialize = () => (
    Promise.all([hasRole('can_view_tasks'), hasRole('can_view_analytics')])
      .then(([canViewTasks, canViewTargets]) => {
        const hasPermission = canViewTargets || canViewTasks;
        if (!hasPermission || Session.isOnlineOnly()) {
          return false;
        }

        return Promise.all([ Settings(), UserContact() ])
          .then(([settingsDoc, userContactDoc]) => {
            const options = {
              enableTasks: canViewTasks,
              enableTargets: canViewTargets,
            };

            return RulesEngineCore.initialize(DB(), settingsDoc, userContactDoc, options)
              .then(() => {
                const isEnabled = RulesEngineCore.isEnabled();
                if (isEnabled) {
                  assignMonthStartDate(settingsDoc);
                  monitorChanges(settingsDoc, userContactDoc);
                }

                return isEnabled;
              });
          });
      })
  );
  let initialized = initialize();

  const monitorChanges = function (settingsDoc, userContactDoc) {
    const isReport = doc => doc.type === 'data_record' && !!doc.form;
    Changes({
      key: 'mark-contacts-dirty',
      filter: change => !!change.doc && (ContactTypes.includes(change.doc) || isReport(change.doc)),
      callback: change => {
        const subjectId = isReport(change.doc) ? registrationUtils.getPatientId(change.doc) : change.id;
        RulesEngineCore.updateEmissionsFor(DB(), subjectId);
      },
    });

    const userLineage = [];
    for (let current = userContactDoc; !!current && userLineage.length < MAX_LINEAGE_DEPTH; current = current.parent) {
      userLineage.push(current._id);
    }

    Changes({
      key: 'rules-config-update',
      filter: change => change.id === 'settings' || userLineage.includes(change.id),
      callback: change => {
        if (change.id === 'settings') {
          settingsDoc = change.doc;
          RulesEngineCore.rulesConfigChange(settingsDoc, userContactDoc);
          assignMonthStartDate(settingsDoc);
        } else {
          return UserContact()
            .then(updatedUser => {
              userContactDoc = updatedUser;
              RulesEngineCore.rulesConfigChange(settingsDoc, userContactDoc);
            });
        }
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

    for (let taskDoc of taskDocs) {
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

  return {
    isEnabled: () => initialized,

    fetchTaskDocsForAllContacts: () => (
      initialized
        .then(() => RulesEngineCore.fetchTasksFor(DB()))
        .then(translateTaskDocs)
    ),

    fetchTaskDocsFor: contactIds => (
      initialized
        .then(() => RulesEngineCore.fetchTasksFor(DB(), contactIds))
        .then(translateTaskDocs)
    ),

    fetchTargets: () => (
      initialized
        .then(() => {
          const relevantInterval = CalendarInterval.getCurrent(uhcMonthStartDate);
          const filterForTargetEmissions = emission => {
            const emissionDate = moment(emission.date);	
            return emissionDate.isAfter(relevantInterval.start) && emissionDate.isBefore(relevantInterval.end);
          };

          return RulesEngineCore.fetchTargets(DB(), filterForTargetEmissions);
        })
    ),
  };
});

// RulesEngineCore allows for karma to test using a mock shared-lib
angular.module('inboxServices').factory('RulesEngineCore', function() { return rulesEngineCore; });
