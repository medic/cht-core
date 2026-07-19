import { Injectable } from '@angular/core';

import { TelemetryService } from '@mm-services/telemetry.service';

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
  private timeout;
  private cachedPermissionDenied: boolean | null = null;
  private permissionResponsePending = false;

  currentHandle;
  currentPromise;

  constructor(
    private readonly telemetryService:TelemetryService,
  ) {}

  private getAndroidPermission () {
    try {
      if (!window.medicmobile_android || typeof window.medicmobile_android.getLocationPermissions !== 'function') {
        return true;
      }
      return !!window.medicmobile_android.getLocationPermissions();
    } catch (err) {
      console.error('Error when getting location permissions', err);
      return true;
    }
  }

  private finalise () {
    console.debug('Finalising geolocation');
    window.navigator.geolocation?.clearWatch(this.watcher);
    clearTimeout(this.timeout);

    if (this.geo) {
      // Throughout the life of this handle we managed to get a GPS coordinate at least once
      this.telemetryService.record('geolocation:success', this.geo.coords.accuracy);
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
      this.telemetryService.record(`geolocation:failure:${this.geoError.code}`);
      this.deferred.resolve({
        code: this.geoError.code,
        message: this.geoError.message,
      });
    }
  }

  private success(position) {
    console.debug('Geolocation success', position);
    this.permissionResponsePending = false;
    this.cachedPermissionDenied = false;
    this.geo = position;
    if (this.deferred) {
      this.finalise();
    }
  }

  private failure(err) {
    console.debug('Geolocation error', err);
    this.geoError = err;
    if (this.deferred) {
      this.finalise();
    }
  }

  private startWatching() {
    console.debug('Initiating new geolocation watcher');
    if (!window.navigator.geolocation) {
      return this.failure({
        code: -3,
        message: 'Geolocation API unavailable',
      });
    }

    this.watcher = window.navigator.geolocation.watchPosition(
      this.success.bind(this),
      this.failure.bind(this),
      this.GEO_OPTIONS
    );
    this.timeout = setTimeout(() => {
      this.failure({ code: -2, message: 'Geolocation timeout exceeded' });
    }, this.GEO_OPTIONS.timeout + 1);
  }

  private stopWatching() {
    console.debug('Cancelling geolocation');
    window.navigator.geolocation?.clearWatch(this.watcher);
    clearTimeout(this.timeout);
  }

  private defer() {
    this.deferred = {};
    this.deferred.promise = new Promise((resolve) => {
      this.deferred.resolve = resolve;
    });
  }

  init() {
    this.stopWatching();
    this.geo = null;
    this.geoError = null;
    this.watcher = null;
    this.cachedPermissionDenied = null;
    this.permissionResponsePending = false;
    this.defer();
    this.currentPromise = this.deferred.promise;

    const hasPermission = this.getAndroidPermission();
    this.cachedPermissionDenied = !hasPermission;
    if (hasPermission) {
      this.startWatching();
    }

    const complete = () => {
      console.debug('Geolocation requested');
      const resolveOriginalPromise = this.deferred?.resolve;
      if (!this.geo && !this.geoError) {
        this.geoError = { code: -1, message: 'Geolocation not yet acquired' };
      }
      this.defer();
      this.finalise();
      if (resolveOriginalPromise) {
        this.deferred.promise.then(resolveOriginalPromise);
      }
      const promise = this.deferred.promise;
      this.deferred = null;
      return promise;
    };

    complete.cancel = this.stopWatching.bind(this);
    this.currentHandle = complete;

    return complete;
  }

  retry() {
    this.init();
  }

  permissionRequestResolved () {
    this.permissionResponsePending = true;
    this.startWatching();
    document.dispatchEvent(new CustomEvent('geolocationPermissionGranted'));
  }

  isAvailable(): boolean {
    return !!window.navigator.geolocation;
  }

  isCodePermissionRelated(gpsErrorCode: number): boolean {
    return gpsErrorCode === 2 && this.cachedPermissionDenied === true;
  }

  isPermissionDenied(): boolean {
    if (this.permissionResponsePending) {
      return false;
    }
    if (this.cachedPermissionDenied !== null) {
      return this.cachedPermissionDenied;
    }
    const denied = !this.getAndroidPermission();
    this.cachedPermissionDenied = denied;
    return denied;
  }
}
