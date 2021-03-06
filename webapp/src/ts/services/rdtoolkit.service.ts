import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class RDToolkitService {

  tempSessionID; // ToDo remove this.

  constructor() {
    this.tempSessionID = {};
  }

  enabled() { // ToDo to finalise correct implementation, this is testing.
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

  provisionRDTest() { // ToDo to finalise correctly, this is testing.
    const patientId = uuidv4();
    this.tempSessionID[patientId] = uuidv4();

    console.log('Calling provisionRDTest patientid', patientId);
    window.medicmobile_android.rdToolkit_provisionRDTest(this.tempSessionID[patientId], 'Pablo', patientId);
  }

  captureRDTest(patientId) { // ToDo to finalise correctly, this is testing.
    console.log('Calling captureRDTest for ', patientId);
    window.medicmobile_android.rdToolkit_captureRDTest(this.tempSessionID[patientId]);
  }
}
