import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { GeolocationEditState } from '@mm-services/geolocation-edit-state';

const HouseholdGeolocationWidget = require('../../js/enketo/widgets/household-geolocation-widget');

@Injectable({
  providedIn: 'root'
})
export class ContactGeolocationService {

  constructor(
    private readonly dbService: DbService,
  ) {}

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

  async restoreOriginalIfNeeded(docId: string | undefined, docs: any[], state: GeolocationEditState) {
    const restoreLog = state.isKept;
    const restoreGeoOnly = state.isCaptured && !state.isHome;
    if (!docId || (!restoreLog && !restoreGeoOnly)) {
      return;
    }

    const originalDoc = await this.dbService.get().get(docId);
    const contactDoc = docs.find(doc => doc._id === docId);
    if (!contactDoc || !originalDoc) {
      return;
    }

    contactDoc.geolocation = originalDoc.geolocation;
    if (restoreLog) {
      contactDoc.geolocation_log = originalDoc.geolocation_log;
    }
  }

  stripCaptureField(doc: any, fieldName?: string) {
    if (!fieldName) {
      return;
    }
    delete doc[fieldName];
    if (doc.fields) {
      delete doc.fields[fieldName];
    }
  }
}
