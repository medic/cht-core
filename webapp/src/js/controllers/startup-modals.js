angular.module('inboxControllers').controller('StartupModalsCtrl',
  function(
    $log,
    $ngRedux,
    $q,
    $scope,
    GlobalActions,
    Modal,
    Session,
    Settings,
    Tour,
    UpdateSettings,
    UpdateUser,
    UserSettings
  ) {
    'use strict';
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

    ctrl.tours = [];

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
        required: (settings, user) => !user.known && ctrl.tours.length > 0,
        render: () => {
          return ctrl.openTourSelect()
            .then(() => UpdateUser(Session.userCtx().name, { known: true }))
            .catch(err => $log.error('Error updating user', err));
        },
      },
    ];

    const initTours = () => {
      return Tour.getTours().then(tours => {
        ctrl.tours = tours;
      });
    };


    const showStartupModals = () => {
      return $q
        .all([Settings(), UserSettings(), initTours()])
        .then(([ settings, userSettings ]) => {
          ctrl.modalsToShow = startupModals.filter(modal => modal.required(settings, userSettings));
          const showModals = () => {
            if (!ctrl.modalsToShow || !ctrl.modalsToShow.length) {
              return;
            }
            // render the first modal and recursively show the rest
            return ctrl.modalsToShow
              .shift()
              .render()
              .then(showModals);
          };
          return showModals();
        })
        .catch(err => {
          $log.error('Error fetching settings', err);
        });
    };

    ctrl.setupPromise = showStartupModals();
    $scope.$on('$destroy', unsubscribe);
  });
