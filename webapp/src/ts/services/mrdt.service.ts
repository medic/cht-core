import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MRDTService {
  private current;
  private timeTaken;

  enabled() {
    try {
      return true;
      return !!(
        window.medicmobile_android &&
        typeof window.medicmobile_android.mrdt_available === 'function' &&
        window.medicmobile_android.mrdt_available()
      );
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  verify() {
    this.current = {};
    this.current.promise = new Promise((resolve) => this.current.resolve = resolve);
    window.medicmobile_android.mrdt_verify();
    return this.current.promise;
  }

  respond(image) {
    if (this.current) {
      this.current.resolve({image: image, timeTaken: this.timeTaken});
    }
  }

  respondTimeTaken(data) {
    this.timeTaken = data;
  }
}
