import { Injectable } from '@angular/core';
import { v4 as uuid } from 'uuid';


@Injectable({
  providedIn: 'root',
})
export class RDToolkitService {
  provisionTestResolve;
  captureTestResolve;

  constructor() { }

  enabled() {
    try {
      return !!(
        window.medicmobile_android
        && typeof window.medicmobile_android.rdToolkit_provisionRDTest === 'function'
        && typeof window.medicmobile_android.rdToolkit_captureRDTest === 'function'
      );
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  provisionRDTest(patientId, patientName='') {
    try {
      // window.medicmobile_android.rdToolkit_provisionRDTest(uuid(), patientName, patientId);
      return new Promise(resolve => this.provisionTestResolve = resolve);
    } catch (error) {
      console.error('Error when provisioning RD Test: ', error);
    }
  }

  captureRDTest(sessionId) {
    try {
      // window.medicmobile_android.rdToolkit_captureRDTest(sessionId);
      return new Promise(resolve => this.captureTestResolve = resolve);
    } catch (error) {
      console.error('Error when capturing RD Test: ', error);
    }
  }

  resolveProvisionedTest(response) {
    if (response && this.provisionTestResolve) {
      this.provisionTestResolve(response);
    }
  }

  resolveCapturedTest(response) {
    if (response && this.captureTestResolve) {
      this.captureTestResolve(response);
    }
  }
}
