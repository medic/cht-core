import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class RDToolkitService {

  constructor() { }

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
    console.log('Calling provisionRDTest sessionid: cc571ef2-7778-43a0-8bcf-47f7ea42801c');
    window.medicmobile_android.rdToolkit_provisionRDTest(
      'cc571ef2-7778-43a0-8bcf-47f7ea42801c',
      'Pablo',
      'aa571ef2-7778-43a0-8bcf-47f7ea42801c'
    );
  }

  captureRDTest() { // ToDo to finalise correctly, this is testing.
    try {
      console.log('Calling provisionRDTest patientid: cc571ef2-7778-43a0-8bcf-47f7ea42801c');
      window.medicmobile_android.rdToolkit_captureRDTest('cc571ef2-7778-43a0-8bcf-47f7ea42801c');
    } catch (e) {
      alert(e);
    }
  }
}
