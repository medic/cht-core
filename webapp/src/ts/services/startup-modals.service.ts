import { Injectable } from '@angular/core';

import { GuidedSetupComponent } from '@mm-modals/guided-setup/guided-setup.component';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { SettingsService } from '@mm-services/settings.service';
import { UpdateSettingsService } from '@mm-services/update-settings.service';

interface StartupModal {
  required: (settings) => boolean;
  render: () => Promise<any>;
}

@Injectable({
  providedIn: 'root'
})
export class StartupModalsService {

  modalsToShow: StartupModal[];
  startupModals: StartupModal[] = [
    // Guided Setup
    {
      required: settings => !settings.setup_complete,
      render: () => {
        return this.modalService.show(GuidedSetupComponent)
          .catch(() => {})
          .then(() => this.updateSettingsService.update({ setup_complete: true }))
          .catch(err => console.error('Error updating settings', err));
      },
    },
  ];

  constructor(
    private modalService: ModalService,
    private settingsService: SettingsService,
    private updateSettingsService: UpdateSettingsService,
  ) { }

  showStartupModals() {
    return this.settingsService
      .get()
      .then(settings => {
        this.modalsToShow = this.startupModals.filter(modal => modal.required(settings));
        return this.showModals();
      })
      .catch(err => {
        console.error('Error fetching settings', err);
      });
  }

  private showModals() {
    if (!this.modalsToShow?.length) {
      return;
    }
    // Render the first modal and recursively show the rest
    return this.modalsToShow
      .shift()
      .render()
      .then(() => this.showModals());
  }
}
