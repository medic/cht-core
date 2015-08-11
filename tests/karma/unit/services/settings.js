describe('Settings service', function() {

  'use strict';

  var service,
      get;

  beforeEach(function() {
    get = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ get: get }));
    });
    inject(function($injector) {
      service = $injector.get('Settings');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(get);
  });

  it('retrieves settings', function(done) {
    var expected = {
      isTrue: true,
      isString: 'hello'
    };
    get.returns(KarmaUtils.mockPromise(null, { app_settings: expected }));
    service(function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.isTrue).to.equal(expected.isTrue);
      chai.expect(actual.isString).to.equal(expected.isString);
      done();
    });
  });

  it('merges settings with defaults', function(done) {
    var expected = {
      date_format: 'YYYY'
    };
    get.returns(KarmaUtils.mockPromise(null, { app_settings: expected }));
    service(function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.date_format).to.equal(expected.date_format);
      // date format from defaults: kujua_sms/views/lib/app_settings
      chai.expect(actual.reported_date_format).to.equal('DD-MMM-YYYY HH:mm:ss');
      done();
    });
  });

  it('returns errors', function(done) {
    get.returns(KarmaUtils.mockPromise('Not found'));
    service(function(err) {
      chai.expect(err).to.not.equal(null);
      chai.expect(err.message).to.equal('Not found');
      done();
    });
  });

});