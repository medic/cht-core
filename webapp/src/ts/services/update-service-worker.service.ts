/*
Handles service worker updates
*/
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import { GlobalActions } from '@mm-actions/global';
import { environment } from '@mm-environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UpdateServiceWorkerService {
  private readonly retryFailedUpdateAfterSec = 5 * 60;
  private existingUpdateLoop;
  private globalActions;

  constructor(
    private store:Store,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  update(onSuccess) {
    // This avoids multiple updates retrying in parallel
    if (this.existingUpdateLoop) {
      clearTimeout(this.existingUpdateLoop);
      this.existingUpdateLoop = undefined;
    }

    window.navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        const registration = registrations && registrations.length && registrations[0];
        if (!registration) {
          console.warn('Cannot update service worker - no active workers found');
          return;
        }

        registration.onupdatefound = () => {
          const installingWorker = registration.installing!;
          installingWorker.onstatechange = () => {
            switch (installingWorker.state) {
            case 'activated':
              !environment.production && this.globalActions.setSnackbarContent('New service worker activated');
              registration.onupdatefound = null;
              onSuccess();
              break;
            case 'redundant':
              console.warn(
                'Service worker failed to install or marked as redundant. ' +
                `Retrying install in ${this.retryFailedUpdateAfterSec}secs.`
              );
              this.existingUpdateLoop = setTimeout(() => this.update(onSuccess), this.retryFailedUpdateAfterSec * 1000);
              registration.onupdatefound = null;
              break;
            default:
              console.debug(`Service worker state changed to ${installingWorker.state}!`);
            }
          };
        };

        registration.update();
      });
  }
}
