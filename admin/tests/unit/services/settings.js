describe('Settings service', function() {

  'use strict';

  describe('as a Promise provider', function() {
    let service;
    let $rootScope;
    let get;

    beforeEach(function() {
      get = sinon.stub();
      module('adminApp');
      module(function($provide) {
        $provide.value('Cache', function(options) {
          return options.get;
        });
        $provide.factory('DB', KarmaUtils.mockDB({ get: get }));
        $provide.value('Session', function() {
          return sinon.stub();
        });
      });
      inject(function(_Settings_, _$rootScope_) {
        service = _Settings_;
        $rootScope = _$rootScope_;
      });
    });

    afterEach(function() {
      KarmaUtils.restore(get);
    });

    it('triggers change events when cache updates', function(done) {
      const expected = {
        isTrue: true,
        isString: 'hello'
      };
      get.returns(Promise.resolve({ settings: expected }));
      service()
        .then(function(actual) {
          chai.expect(actual.isTrue).to.equal(expected.isTrue);
          chai.expect(actual.isString).to.equal(expected.isString);
          done();
        })
        .catch(done);
      setTimeout(function() {
        $rootScope.$digest(); // needed to resolve the promise
      });
    });

    it('returns errors', function(done) {
      get.returns(Promise.reject('Not found'));
      service()
        .then(function() {
          done('Unexpected resolution of promise.');
        })
        .catch(function(err) {
          chai.expect(err).to.equal('Not found');
          done();
        });
      setTimeout(function() {
        $rootScope.$digest(); // needed to resolve the promise
      });
    });

  });

  describe('as an event emitter', function() {

    const expect = chai.expect;
    let service;
    let cacheCallback;

    const triggerCacheChange = (err, settings) => {
      cacheCallback(err, settings);
    };

    beforeEach(function() {
      module('adminApp');
      module(function($provide) {
        $provide.value('Cache', function() {
          return function(callback) {
            cacheCallback = callback;
          };
        });
        $provide.factory('DB', KarmaUtils.mockDB({ get: function() {} }));
        $provide.value('Session', function() {
          return sinon.stub();
        });
      });
      inject(function($injector) {
        service = $injector.get('Settings');
      });
    });

    afterEach(function() {
      cacheCallback = null;
    });

    it('triggers a change event each time cache updates', function(done) {
      let changeCount = 0;
      const invocationIndexes = [];

      service()
        .on('change', function(settings) {
          ++changeCount;
          invocationIndexes.push(settings.invocation);
        });

      triggerCacheChange(null, { invocation: 1 });
      triggerCacheChange(null, { invocation: 2 });
      triggerCacheChange(null, { invocation: 3 });

      setTimeout(function() {
        expect(changeCount).to.equal(3);
        expect(invocationIndexes).to.deep.equal([1, 2, 3]);
        done();
      });
    });

    it('triggers error handler when an error occurs', function(done) {
      let changeCount = 0;
      let errorCount = 0;

      service()
        .on('change', function() {
          ++changeCount;
        })
        .on('error', function() {
          ++errorCount;
        });

      triggerCacheChange('Error!');

      setTimeout(function() {
        expect(changeCount).to.equal(0);
        expect(errorCount).to.equal(1);
        done();
      });
    });

  });

});
