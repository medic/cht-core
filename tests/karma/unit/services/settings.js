describe('SettingsP service', function() {

  'use strict';

  describe('as a Promise provider', function() {
    var service,
        $rootScope,
        get;

    beforeEach(function() {
      get = sinon.stub();
      module('inboxApp');
      module(function($provide) {
        $provide.value('Cache', function(options) {
          return options.get;
        });
        $provide.factory('DB', KarmaUtils.mockDB({ get: get }));
      });
      inject(function(_SettingsP_, _$rootScope_) {
        service = _SettingsP_;
        $rootScope = _$rootScope_;
      });
    });

    afterEach(function() {
      KarmaUtils.restore(get);
    });

    it('triggers change events when cache updates', function(done) {
      var expected = {
        isTrue: true,
        isString: 'hello'
      };
      get.returns(KarmaUtils.mockPromise(null, { app_settings: expected }));
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

    it('merges settings with defaults', function(done) {
      var expected = {
        date_format: 'YYYY'
      };
      get.returns(KarmaUtils.mockPromise(null, { app_settings: expected }));
      service()
        .then(function(actual) {
          chai.expect(actual.date_format).to.equal(expected.date_format);
          // date format from defaults: kujua_sms/views/lib/app_settings
          chai.expect(actual.reported_date_format).to.equal('DD-MMM-YYYY HH:mm:ss');
          chai.expect(get.args[0][0]).to.equal('_design/medic');
          done();
        })
        .catch(done);
      setTimeout(function() {
        $rootScope.$digest(); // needed to resolve the promise
      });
    });

    it('returns errors', function(done) {
      get.returns(KarmaUtils.mockPromise('Not found'));
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

    var expect = chai.expect,
        service,
        cacheCallback;


    function triggerCacheChange(err, settings) {
      cacheCallback(err, settings);
    }

    beforeEach(function() {
      module('inboxApp');
      module(function($provide) {
        $provide.value('Cache', function() {
          return function(callback) {
            cacheCallback = callback;
          };
        });
      });
      inject(function($injector) {
        service = $injector.get('SettingsP');
      });
    });

    afterEach(function() {
      cacheCallback = null;
    });

    it('triggers a change event each time cache updates', function(done) {
      var changeCount = 0,
          invocationIndexes = [];

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
      }, 200);
    });

    it('triggers error handler when an error occurs', function(done) {
      var changeCount = 0, errorCount = 0;

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
      }, 200);
    });

  });

});
