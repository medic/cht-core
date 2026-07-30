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
}
