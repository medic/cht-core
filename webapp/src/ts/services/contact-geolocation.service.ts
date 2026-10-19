import { Injectable } from '@angular/core';

const HouseholdGeolocationWidget = require('../../js/enketo/widgets/household-geolocation-widget');
const { RADIO_VALUES, FIELD_VALUES, GEO_CONTEXT, DATASET_TRUE } = HouseholdGeolocationWidget;

const MAX_LATITUDE = 90;
const MAX_LONGITUDE = 180;

const isValidCoordinate = (value: unknown, maxAbsValue: number): boolean => {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= maxAbsValue;
};

export const isValidGeolocation = (geolocation: any): boolean => {
  return isValidCoordinate(geolocation?.latitude, MAX_LATITUDE) &&
    isValidCoordinate(geolocation?.longitude, MAX_LONGITUDE);
};

const parseJsonDataset = (value: string | undefined): any => {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

export class GeolocationEditState {
  readonly hasLocation: boolean;
  readonly isEdit: boolean;
  readonly context: string | undefined;
  readonly captureValue: string | undefined;
  readonly fieldName: string | undefined;
  readonly originalGeolocation: any;
  readonly originalGeolocationLog: any;

  constructor(captureInput?: HTMLInputElement | null) {
    this.hasLocation = captureInput?.dataset?.geoHasLocation === DATASET_TRUE;
    this.isEdit = captureInput?.dataset?.geoIsEdit === DATASET_TRUE;
    this.context = captureInput?.dataset?.geoContext || undefined;
    this.captureValue = captureInput?.value || undefined;
    this.fieldName = captureInput?.getAttribute('name')?.split('/').pop() || undefined;
    this.originalGeolocation = parseJsonDataset(captureInput?.dataset?.geoOriginal);
    this.originalGeolocationLog = parseJsonDataset(captureInput?.dataset?.geoOriginalLog);
  }

  get isKept(): boolean {
    return this.captureValue === RADIO_VALUES.KEPT;
  }

  get isCaptured(): boolean {
    return this.captureValue === FIELD_VALUES.CAPTURED;
  }

  get isSkipped(): boolean {
    return this.captureValue === FIELD_VALUES.SKIPPED;
  }

  get isHome(): boolean {
    return this.context === GEO_CONTEXT.HOME;
  }
}

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

    captureInput.dataset.geoIsEdit = DATASET_TRUE;

    if (!isValidGeolocation(contact.geolocation)) {
      return;
    }

    captureInput.dataset.geoHasLocation = DATASET_TRUE;
    captureInput.dataset.geoOriginal = JSON.stringify(contact.geolocation);
    captureInput.dataset.geoOriginalLog = JSON.stringify(contact.geolocation_log ?? null);
  }

  private setGeolocation(doc: any, value: any) {
    if (value === undefined) {
      delete doc.geolocation;
    } else {
      doc.geolocation = value;
    }
  }

  private appendLogEntry(doc: any, geoData: any, state: GeolocationEditState) {
    doc.geolocation_log = doc.geolocation_log || [];
    const entry: any = { timestamp: Date.now(), recording: geoData };
    if (state.context !== undefined) {
      entry.is_home = state.isHome;
    }
    doc.geolocation_log.push(entry);
  }

  private applyKept(docs: any[], state: GeolocationEditState) {
    docs.forEach(doc => {
      this.setGeolocation(doc, state.originalGeolocation);
      doc.geolocation_log = state.originalGeolocationLog;
    });
    return docs;
  }

  private async applySkipped(geoHandle, docs: any[], state: GeolocationEditState) {
    const geoData = (!state.hasLocation && geoHandle) ? await geoHandle().catch(err => err) : undefined;
    docs.forEach(doc => {
      if (geoData !== undefined) {
        this.appendLogEntry(doc, geoData, state);
      }
      delete doc.geolocation;
    });
    return docs;
  }

  private async applyCaptured(geoHandle, docs: any[], state: GeolocationEditState) {
    const geoData = await geoHandle().catch(err => err);
    docs.forEach(doc => {
      this.appendLogEntry(doc, geoData, state);
      this.setGeolocation(doc, (!geoData.code && state.isHome) ? geoData : state.originalGeolocation);
    });
    return docs;
  }

  async applyGeolocation(geoHandle, docs: any[], state: GeolocationEditState) {
    if (state.isKept) {
      return this.applyKept(docs, state);
    }
    if (state.isSkipped) {
      return this.applySkipped(geoHandle, docs, state);
    }
    if (state.isCaptured && geoHandle) {
      return this.applyCaptured(geoHandle, docs, state);
    }
    return docs;
  }

  stripCaptureField(doc: any, state: GeolocationEditState) {
    if (!state.fieldName) {
      return;
    }
    delete doc[state.fieldName];
    if (doc.fields) {
      delete doc.fields[state.fieldName];
    }
  }
}
