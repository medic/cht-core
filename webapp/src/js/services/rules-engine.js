'use strict';

const registrationUtils = require('@medic/registration-utils');
const rulesEngineCore = require('@medic/rules-engine');

const MAX_LINEAGE_DEPTH = 50;

angular.module('inboxServices').factory('RulesEngine', function(
  $translate,
  Auth,
  Changes,
  ContactTypes,
  DB,
  RulesEngineCore,
  Session,
  Settings,
  TranslateFrom,
  UserContact
) {
  'ngInject';

  const initialize = () => (
    Auth.any([['can_view_tasks'], ['can_view_analytics']]).then(() => true).catch(() => false)
      .then(hasPermission => {
        if (!hasPermission || Session.isOnlineOnly()) {
          return false;
        }

        return Promise.all([ Settings(), UserContact() ])
          .then(([settingsDoc, userContactDoc]) => {
            return RulesEngineCore.initialize(DB(), settingsDoc, userContactDoc)
              .then(() => {
                const isEnabled = RulesEngineCore.isEnabled();
                if (isEnabled) {
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
        RulesEngineCore.updateTasksFor(DB(), subjectId);
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

    // testing only - allows karma to test initialization logic
    _initialize: () => { initialized = initialize(); },
  };
});

// RulesEngineCore allows for karma to test using a mock shared-lib
angular.module('inboxServices').factory('RulesEngineCore', function() { return rulesEngineCore; });
