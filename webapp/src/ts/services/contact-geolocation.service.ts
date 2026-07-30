import { Injectable } from '@angular/core';

import { GeolocationEditState } from '@mm-services/geolocation-edit-state';

const HouseholdGeolocationWidget = require('../../js/enketo/widgets/household-geolocation-widget');

@Injectable({
  providedIn: 'root'
})
export class ContactGeolocationService {

  private getCaptureInput(formHtml?: Element): HTMLInputElement | null {
    return (formHtml?.querySelector(HouseholdGeolocationWidget.selector) as HTMLInputElement) || null;
  }

  readCaptureState(formHtml?: Element): GeolocationEditState {
    return new GeolocationEditState(this.getCaptureInput(formHtml));
  }

  injectEditContext(formHtml: Element | undefined, contact: any) {
    const captureInput = this.getCaptureInput(formHtml);
    if (!captureInput || !contact?._id) {
      return;
    }

    captureInput.dataset.geoIsEdit = 'true';

    if (typeof contact.geolocation?.latitude !== 'number') {
      return;
    }

    captureInput.dataset.geoHasLocation = 'true';
  }

  recordCapture(geoHandle, docs: any[], state: GeolocationEditState) {
    if (!geoHandle) {
      return docs;
    }

    return geoHandle()
      .catch(err => err)
      .then(geoData => {
        docs.forEach(doc => {
          doc.geolocation_log = doc.geolocation_log || [];
          const entry: any = { timestamp: Date.now(), recording: geoData };
          if (state.context !== undefined) {
            entry.is_home = state.isHome;
          }
          doc.geolocation_log.push(entry);
          if (!geoData.code && state.isHome) {
            doc.geolocation = geoData;
          }
        });
        return docs;
      });
  }
}
