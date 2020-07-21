const _ = require('lodash/core');

angular.module('inboxDirectives').directive('mmStartupModals', function() {
  'use strict';

  return {
    restrict: 'E',
    template: '',
    controller: function(
      $log,
      $ngRedux,
      $q,
      $scope,
      GlobalActions,
      Modal,
      Selectors,
      Session,
      Settings,
      UpdateSettings,
      UpdateUser,
      UserSettings
    ) {
      'ngInject';

      const ctrl = this;
      const mapDispatchToTarget = function(dispatch) {
        const globalActions = GlobalActions(dispatch);
        return {
          openGuidedSetup: globalActions.openGuidedSetup,
          openTourSelect: globalActions.openTourSelect,

        };
      };
      const unsubscribe = $ngRedux.connect(null, mapDispatchToTarget)(ctrl);

      const startupModals = [
        // welcome screen
        {
          required: settings => !settings.setup_complete,
          render: () => {
            return Modal({
              templateUrl: 'templates/modals/welcome.html',
              controller: 'WelcomeModalCtrl',
              controllerAs: 'welcomeModalCtrl',
              size: 'lg',
            }).catch(() => {});
          },
        },
        // guided setup
        {
          required: settings => !settings.setup_complete,
          render: () => {
            return ctrl.openGuidedSetup()
              .then(() => UpdateSettings({ setup_complete: true }))
              .catch(err => $log.error('Error marking setup_complete', err));
          },
        },
        // tour
        {
          required: (settings, user) => !user.known,
          render: () => {
            return ctrl.openTourSelect()
              .then(() => UpdateUser(Session.userCtx().name, { known: true }))
              .catch(err => $log.error('Error updating user', err));
          },
        },
      ];

      const showStartupModals = () => {
        return $q.all([Settings(), UserSettings()])
          .then(function(results) {
            const filteredModals = _.filter(startupModals, function(modal) {
              return modal.required(results[0], results[1]);
            });
            const showModals = function() {
              if (filteredModals && filteredModals.length) {
                // render the first modal and recursively show the rest
                filteredModals
                  .shift()
                  .render()
                  .then(showModals);
              }
            };
            showModals();
          })
          .catch(function(err) {
            $log.error('Error fetching settings', err);
          });
      };

      showStartupModals();
      $scope.$on('$destroy', unsubscribe);
    },
    controllerAs: 'startupModalsCtrl'
  };
});
