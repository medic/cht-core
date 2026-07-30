import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';

const HouseholdGeolocationWidget = require('../../js/enketo/widgets/household-geolocation-widget');
const { RADIO_VALUES, FIELD_VALUES, GEO_CONTEXT, DATASET_TRUE } = HouseholdGeolocationWidget;

export class GeolocationEditState {
  readonly hasLocation: boolean;
  readonly isEdit: boolean;
  readonly context: string | undefined;
  readonly captureValue: string | undefined;
  readonly fieldName: string | undefined;

  constructor(captureInput?: HTMLInputElement | null) {
    this.hasLocation = captureInput?.dataset?.geoHasLocation === DATASET_TRUE;
    this.isEdit = captureInput?.dataset?.geoIsEdit === DATASET_TRUE;
    this.context = captureInput?.dataset?.geoContext || undefined;
    this.captureValue = captureInput?.value || undefined;
    this.fieldName = captureInput?.getAttribute('name')?.split('/').pop() || undefined;
  }

  get isKept(): boolean {
    return this.captureValue === RADIO_VALUES.KEPT;
  }

  get isCaptured(): boolean {
    return this.captureValue === FIELD_VALUES.CAPTURED;
  }

  get isHome(): boolean {
    return this.context === GEO_CONTEXT.HOME;
  }
}

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

    captureInput.dataset.geoIsEdit = DATASET_TRUE;

    if (typeof contact.geolocation?.latitude !== 'number') {
      return;
    }

    captureInput.dataset.geoHasLocation = DATASET_TRUE;
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
