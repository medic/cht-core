import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { GeolocationService } from '@mm-services/geolocation.service';
//todo import telemetry

describe('Geolocation service', () => {
  let Telemetry;
  let medicmobileAndroid;
  let service;
  let navigator;

  beforeEach(() => {
    navigator = window.navigator;

    window.medicmobile_android = medicmobileAndroid;
    sinon.stub(window.navigator.geolocation, 'watchPosition');
    sinon.stub(window.navigator.geolocation, 'clearWatch');

    Telemetry = {
      record: sinon.stub()
    };

    TestBed.configureTestingModule({
      // todo add telemetry
    });
    service = TestBed.inject(GeolocationService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Geolocation', () => {
    it('correctly returns a successful geo result', () => {
      const position = {
        latitude: 1,
        longitude: 2,
        altitude: 3,
        accuracy: 4,
        altitudeAccuracy: 5,
        heading: 6,
        speed: 7,
      };
      // @ts-ignore
      window.navigator.geolocation.watchPosition.callsArgWith(0, {coords: position});

      return service.init()().then(returned => {
        expect(returned).to.deep.equal(position);
      });
    });

    it('correctly returns an unsuccessful geo result', () => {
      // @ts-ignore
      window.navigator.geolocation.watchPosition.callsArgWith(1, {code: 42, message: 'An error!'});

      return service
        .init()()
        .catch(err => err)
        .then(err => {
          expect(err.code).to.equal(42);
        });
    });

    it('returns the latest geo result', () => {
      const first = {
        latitude: 1,
        longitude: 2,
        altitude: 3,
        accuracy: 4,
        altitudeAccuracy: 5,
        heading: 6,
        speed: 7,
      };
      const second = {
        latitude: 8,
        longitude: 9,
        altitude: 10,
        accuracy: 11,
        altitudeAccuracy: 12,
        heading: 13,
        speed: 14,
      };
      // @ts-ignore
      window.navigator.geolocation.watchPosition.callsFake(success => {
        success({coords: first});
        success({coords: second});
      });

      return service.init()().then(returned => {
        expect(returned).to.deep.equal(second);
      });
    });

    it('rebounds from an earlier error', () => {
      const second = {
        latitude: 8,
        longitude: 9,
        altitude: 10,
        accuracy: 11,
        altitudeAccuracy: 12,
        heading: 13,
        speed: 14,
      };
      // @ts-ignore
      window.navigator.geolocation.watchPosition.callsFake((success, failure) => {
        failure({code: 1, message: 'some error'});
        success({coords: second});
      });

      return service.init()().then(returned => {
        expect(returned).to.deep.equal(second);
      });
    });

    it('ignores later errors as long as there was one success', () => {
      const first = {
        latitude: 1,
        longitude: 2,
        altitude: 3,
        accuracy: 4,
        altitudeAccuracy: 5,
        heading: 6,
        speed: 7,
      };
      // @ts-ignore
      window.navigator.geolocation.watchPosition.callsFake((success, failure) => {
        success({coords: first});
        failure({code: 2, message: 'some later error'});
      });

      return service.init()().then(returned => {
        expect(returned).to.deep.equal(first);
      });
    });

    it('blocks promise completion until at least one success', () => {
      const position = {
        latitude: 1,
        longitude: 2,
        altitude: 3,
        accuracy: 4,
        altitudeAccuracy: 5,
        heading: 6,
        speed: 7,
      };
      let successFn;
      // @ts-ignore
      window.navigator.geolocation.watchPosition.callsFake(success => {
        successFn = success;
      });

      const promise = service.init()().then(returned => {
        expect(returned).to.deep.equal(position);
      });
      successFn({coords: position});

      return promise;
    });

    it('blocks promise completion until at least one error', () => {
      let failureFn;
      // @ts-ignore
      window.navigator.geolocation.watchPosition.callsFake((_, failure) => {
        failureFn = failure;
      });

      const promise = service
        .init()()
        .catch(err => err)
        .then(returned => {
          expect(returned.code).to.equal(43);
        });

      failureFn({code: 43, message: 'oh no!'});

      return promise;
    });

    describe('android api', () => {
      const position = {
        latitude: 1,
        longitude: 2,
        altitude: 3,
        accuracy: 4,
        altitudeAccuracy: 5,
        heading: 6,
        speed: 7,
      };

      it('should not crash if api not available', () => {
        medicmobileAndroid = { other: () => {} };
        // @ts-ignore
        window.navigator.geolocation.watchPosition.callsFake(success => success({ coords: position }));
        const deferred = service.init();
        // @ts-ignore
        expect(window.navigator.geolocation.watchPosition.callCount).to.equal(1);
        return deferred().then(returned => {
          expect(returned).to.deep.equal(position);
        });
      });

      it('should not crash if api is not a function', () => {
        medicmobileAndroid = { getLocationPermissions: 'string' };
        // @ts-ignore
        window.navigator.geolocation.watchPosition.callsFake(success => success({ coords: position }));
        return service.init()().then(returned => {
          expect(returned).to.deep.equal(position);
        });
      });

      it('should not crash if api throws an error', () => {
        window.medicmobile_android = { getLocationPermissions: sinon.stub().throws(new Error('error')) };
        // @ts-ignore
        window.navigator.geolocation.watchPosition.callsFake(success => success({ coords: position }));
        return service.init()().then(returned => {
          expect(returned).to.deep.equal(position);
          expect(window.medicmobile_android.getLocationPermissions.callCount).to.equal(1);
        });
      });

      it('should start watcher immediately if the app has required permissions', () => {
        window.medicmobile_android = { getLocationPermissions: sinon.stub().returns(true) };
        // @ts-ignore
        window.navigator.geolocation.watchPosition.callsFake(success => success({ coords: position }));
        const deferred = service.init();
        expect(window.medicmobile_android.getLocationPermissions.callCount).to.equal(1);
        // @ts-ignore
        expect(window.navigator.geolocation.watchPosition.callCount).to.equal(1);
        return deferred().then(returned => {
          expect(returned).to.deep.equal(position);
        });
      });

      it('should defer starting watcher until response from Android is received', () => {
        window.medicmobile_android = { getLocationPermissions: sinon.stub().returns(false) };
        // @ts-ignore
        window.navigator.geolocation.watchPosition.callsFake(success => success({ coords: position }));
        const deferred = service.init();
        expect(window.medicmobile_android.getLocationPermissions.callCount).to.equal(1);
        // @ts-ignore
        expect(window.navigator.geolocation.watchPosition.callCount).to.equal(0);
        const nextTick = () => new Promise(resolve => setTimeout(resolve));
        return nextTick()
          .then(() => {
            // @ts-ignore
            expect(window.navigator.geolocation.watchPosition.callCount).to.equal(0);
            return nextTick();
          })
          .then(() => {
            // @ts-ignore
            expect(window.navigator.geolocation.watchPosition.callCount).to.equal(0);
            service.permissionRequestResolved();
            // @ts-ignore
            expect(window.navigator.geolocation.watchPosition.callCount).to.equal(1);
            return deferred();
          })
          .then(returned => {
            expect(returned).to.deep.equal(position);
          });
      });

    });
  });
});
