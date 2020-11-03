import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private readonly GEO_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 30 * 1000, // give up if coords not received within 30 seconds
    maximumAge: 5 * 60 * 1000 // coords from up to 5 minutes ago are acceptable
  };

  private deferred;
  private geo;
  private geoError;
  private watcher;

  constructor() {}

  private getAndroidPermission () {
    try {
      if (!window.medicmobile_android || typeof window.medicmobile_android.getLocationPermissions !== 'function') {
        return true;
      }
      return !!window.medicmobile_android.getLocationPermissions();
    } catch (err) {
      console.error(err);
      return true;
    }
  }

  private finalise () {
    console.debug('Finalising geolocation');
    window.navigator.geolocation && window.navigator.geolocation.clearWatch(this.watcher);

    if (this.geo) {
      // Throughout the life of this handle we managed to get a GPS coordinate at least once
      // Telemetry.record('geolocation:success', geo.coords.accuracy);
      this.deferred.resolve({
        latitude: this.geo.coords.latitude,
        longitude: this.geo.coords.longitude,
        altitude: this.geo.coords.altitude,
        accuracy: this.geo.coords.accuracy,
        altitudeAccuracy: this.geo.coords.altitudeAccuracy,
        heading: this.geo.coords.heading,
        speed: this.geo.coords.speed
      });
    } else {
      // We never managed to get a handle, here is the latest error
      // Telemetry.record(`geolocation:failure:${geoError.code}`);
      this.deferred.reject({
        code: this.geoError.code,
        message: this.geoError.message,
      });
    }
  }

  private success(position) {
    console.debug('Geolocation success', position);
    this.geo = position;
    if (this.deferred) {
      this.finalise();
    }
  };

  private failure(err) {
    console.debug('Geolocation error', err);
    this.geoError = err;
    if (this.deferred) {
      this.finalise();
    }
  };

  private startWatching() {
    console.debug('Initiating new geolocation watcher');
    if (!window.navigator.geolocation) {
      this.geoError = {
        code: -1,
        message: 'Geolocation API unavailable.',
      };
    } else {
      this.watcher = window.navigator.geolocation.watchPosition(this.success.bind(this), this.failure.bind(this), this.GEO_OPTIONS);
    }
  }

  private stopWatching() {
    console.debug('Cancelling geolocation');
    this.watcher && window.navigator.geolocation && window.navigator.geolocation.clearWatch(this.watcher);
  }

  private defer() {
    this.deferred = {};
    this.deferred.promise = new Promise((resolve, reject) => {
      this.deferred.resolve = resolve;
      this.deferred.reject = reject;
    });
  }

  init() {
    this.stopWatching();
    this.geo = null;
    this.geoError = null;
    this.watcher = null;
    this.defer();

    if (this.getAndroidPermission()) {
      this.startWatching();
    }

    const complete = () => {
      console.debug('Geolocation requested');
      this.defer();

      if (this.geo || this.geoError) {
        this.finalise();
      }

      return this.deferred.promise;
    };

    complete.cancel = this.stopWatching.bind(this);

    return complete;
  }

  permissionRequestResolved () {
    this.startWatching();
  }
}
