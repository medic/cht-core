describe('Geolocation service', () => {

  'use strict';

  let $log;
  let $window;
  let Telemetry;
  let service;

  beforeEach(() => {
    module('inboxApp');
    $log = {
      debug: sinon.stub(),
      info: sinon.stub(),
      error: sinon.stub()
    };
    $window = {
      navigator: {
        geolocation: {
          watchPosition: sinon.stub(),
          clearWatch: sinon.stub()
        }
      }
    };
    Telemetry = {
      record: sinon.stub()
    };
    module($provide => {
      $provide.value('$window', $window);
      $provide.value('$log', $log);
      $provide.value('Telemetry', Telemetry);
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject(_Geolocation_ => service = _Geolocation_);
  });

  afterEach(() => { sinon.restore(); });

  describe('Geolocation', () => {
    it('Errors if geolocation navigator fn not available', () => {
      delete $window.navigator.geolocation;

      return service()()
        .catch(err => err)
        .then(err => {
          chai.expect(err.code).to.equal(-1);
        });
    });

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
      $window.navigator.geolocation.watchPosition.callsArgWith(0, {coords: position});

      return service()()
        .then(returned => {
          chai.expect(returned).to.deep.equal(position);
        });
    });

    it('correctly returns an unsuccessful geo result', () => {
      $window.navigator.geolocation.watchPosition.callsArgWith(1, {code: 42, message: 'An error!'});

      return service()()
        .catch(err => err)
        .then(err => {
          chai.expect(err.code).to.equal(42);
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
      $window.navigator.geolocation.watchPosition.callsFake(success => {
        success({coords: first});
        success({coords: second});
      });

      return service()()
        .then(returned => {
          chai.expect(returned).to.deep.equal(second);
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
      $window.navigator.geolocation.watchPosition.callsFake((success, failure) => {
        failure({code: 1, message: 'some error'});
        success({coords: second});
      });

      return service()()
        .then(returned => {
          chai.expect(returned).to.deep.equal(second);
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
      $window.navigator.geolocation.watchPosition.callsFake((success, failure) => {
        success({coords: first});
        failure({code: 2, message: 'some later error'});
      });

      return service()()
        .then(returned => {
          chai.expect(returned).to.deep.equal(first);
        });
    });

    it('blocks promise completion until at least one success', (done) => {
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
      $window.navigator.geolocation.watchPosition.callsFake(success => {
        successFn = success;
      });

      service()()
        .then(returned => {
          chai.expect(returned).to.deep.equal(position);
          done();
        });

      successFn({coords: position});
    });

    it('blocks promise completion until at least one error', (done) => {
      let failureFn;
      $window.navigator.geolocation.watchPosition.callsFake((_, failure) => {
        failureFn = failure;
      });

      service()()
        .catch(err => err)
        .then(returned => {
          chai.expect(returned.code).to.equal(43);
          done();
        });

      failureFn({code: 43, message: 'oh no!'});
    });
  });
});
