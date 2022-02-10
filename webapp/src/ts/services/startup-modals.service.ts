import { Injectable } from '@angular/core';

import { TourService } from '@mm-services/tour.service';
import { SessionService } from '@mm-services/session.service';
import { GuidedSetupComponent } from '@mm-modals/guided-setup/guided-setup.component';
import { TourSelectComponent } from '@mm-modals/tour/tour-select.component';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { SettingsService } from '@mm-services/settings.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { UpdateSettingsService } from '@mm-services/update-settings.service';
import { WelcomeComponent } from '@mm-modals/welcome/welcome.component';

interface StartupModal {
  required: (settings, user?) => boolean;
  render: () => Promise<any>;
}

@Injectable({
  providedIn: 'root'
})
export class StartupModalsService {

  initialized;
  tours: object[];
  modalsToShow: StartupModal[];
  startupModals: StartupModal[] = [
    // welcome screen
    {
      required: settings => !settings.setup_complete,
      render: () => {
        return this.modalService.show(WelcomeComponent, { class: 'welcome' })
          .catch(() => {});
      },
    },
    // guided setup
    {
      required: settings => !settings.setup_complete,
      render: () => {
        return this.modalService.show(GuidedSetupComponent)
          .catch(() => {})
          .then(() => this.updateSettingsService.update({ setup_complete: true }))
          .catch(err => console.error('Error updating settings', err));
      },
    },
    // tour
    {
      required: (settings, user) => !user.known && this.tours.length > 0,
      render: () => {
        return this.modalService.show(TourSelectComponent)
          .catch(() => {})
          .then(() => this.userSettingsService.setAsKnown())
          .catch(err => console.error('Error updating user', err));
      },
    },
  ];

  constructor(
    private modalService: ModalService,
    private tourService: TourService,
    private sessionService: SessionService,
    private settingsService: SettingsService,
    private updateSettingsService: UpdateSettingsService,
    private userSettingsService: UserSettingsService,
  ) {
    this.initialized = this.tourService.getTours().then(tours => {
      this.tours = tours;
    });
  }

  showStartupModals() {
    return Promise
      .all([
        this.settingsService.get(),
        this.userSettingsService.get(),
        this.initialized,
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
      .then(() => this.showModals());
  }
}
