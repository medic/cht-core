import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root',
})

export class CloudWorksRDTService {

  enabled() { // ToDo to finalise correct implementation, this is testing
    try {
      return !!(
        window.medicmobile_android &&
        typeof window.medicmobile_android.cw_createProvisioningRDTest === 'function'
      );
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  createProvisioningRDTest() { // ToDo to finalise correctly, this is testing
    window.medicmobile_android.cw_createProvisioningRDTest(uuidv4(), 'Pablo', uuidv4());
  }
}
