const TABS = [
  { state: 'messages.detail', perm: 'can_view_messages_tab'  },
  { state: 'tasks.detail',    perm: 'can_view_tasks_tab'     },
  { state: 'trainings.detail',  perm: 'can_view_trainings_tab'   },
  { state: 'reports.detail',  perm: 'can_view_reports_tab'   },
  { state: 'analytics',       perm: 'can_view_analytics_tab' },
  { state: 'contacts.detail', perm: 'can_view_contacts_tab'  }
];

angular.module('inboxControllers').controller('HomeCtrl',
  function (
    $q,
    $state,
    Auth
  ) {

    'use strict';
    'ngInject';

    const findFirstAuthorizedTab = () => {
      return $q.all(TABS.map(tab => Auth.has(tab.perm))).then(results => {
        const idx = results.findIndex(result => result);
        if (idx === -1) {
          return;
        }
        return TABS[idx].state;
      });
    };

    findFirstAuthorizedTab().then(state => {
      if (!state) {
        state = 'error';
      }
      $state.go(state, { code: 403 }, { location: 'replace' });
    });

  }
);
