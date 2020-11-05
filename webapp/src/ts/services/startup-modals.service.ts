import { Injectable } from "@angular/core";
import {TourService} from "./tour.service";
import {GlobalActions} from "../actions/global";
import {Store} from "@ngrx/store";
import {UpdateUserService} from "./update-user.service";
import {SessionService} from "./session.service";
import {TourSelectComponent} from "../modals/tour/tour-select.component";
import {ModalService} from "../modals/mm-modal/mm-modal";
import {SettingsService} from "./settings.service";
import {UserSettingsService} from "./user-settings.service";

class StartupModal {
  required: (settings, user?) => boolean
  render: () => Promise<any>
}

@Injectable({
  providedIn: 'root'
})
export class StartupModalsService {

  modalsToShow: StartupModal[];
  startupModals: StartupModal[] = [
    // welcome screen
    {
      required: settings => !settings.setup_complete,
      render: () => {
        //TODO
        // return Modal({
        //   templateUrl: 'templates/modals/welcome.html',
        //   controller: 'WelcomeModalCtrl',
        //   controllerAs: 'welcomeModalCtrl',
        //   size: 'lg',
        // }).catch(() => {});
        return Promise.resolve();
      },
    },
    // guided setup
    {
      required: settings => !settings.setup_complete,
      render: () => {
        //TODO
        // return ctrl.openGuidedSetup()
        //   .then(() => UpdateSettings({ setup_complete: true }))
        //   .catch(err => $log.error('Error marking setup_complete', err));
        return Promise.resolve();
      },
    },
    // tour
    {
      required: (settings, user) => !user.known,
      render: () => {
        this.openTourSelect();
        return this.updateUserService.update(
            this.sessionService.userCtx().name,
            { known: true }
          )
          .catch(err => console.error('Error updating user', err));
      },
    },
  ];

  constructor(
    private store: Store,
    private modalService: ModalService,
    private tourService: TourService,
    private updateUserService: UpdateUserService,
    private sessionService: SessionService,
    private settingsService: SettingsService,
    private userSettingsService: UserSettingsService,
  ) { }

  private openTourSelect() {
    this.modalService.show(TourSelectComponent);
  }

  showStartupModals() {
    return Promise
      .all([
        this.settingsService.get(),
        this.userSettingsService.get()
      ])
      .then(([ settings, userSettings ]) => {
        this.modalsToShow = this.startupModals.filter(modal => modal.required(settings, userSettings));
        return this.showModals();
      })
      .catch(err => {
        console.error('Error fetching settings', err);
      });
  }

  private showModals() {
    if (!this.modalsToShow || !this.modalsToShow.length) {
      return;
    }
    // render the first modal and recursively show the rest
    return this.modalsToShow
      .shift()
      .render()
      .then(this.showModals);
  }
}

/*angular.module('inboxControllers').controller('StartupModalsCtrl',
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
*/
