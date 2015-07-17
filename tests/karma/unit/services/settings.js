describe('Settings service', function() {

  'use strict';

  var service,
      successCb,
      failCb;

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('DB', {
        get: function() {
          return {
            get: function() {
              return {
                then: function(cb) {
                  successCb = cb;
                  return {
                    catch: function(cb) {
                      failCb = cb;
                    }
                  };
                }
              };
            }
          };
        }
      });
    });
    inject(function($injector) {
      service = $injector.get('Settings');
    });
  });

  it('retrieves settings', function(done) {
    var expected = {
      isTrue: true,
      isString: 'hello'
    };
    service(function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.isTrue).to.equal(expected.isTrue);
      chai.expect(actual.isString).to.equal(expected.isString);
      done();
    });
    successCb({ app_settings: expected });
  });

  it('merges settings with defaults', function(done) {
    var expected = {
      date_format: 'YYYY'
    };
    service(function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.date_format).to.equal(expected.date_format);
      // date format from defaults: kujua_sms/views/lib/app_settings
      chai.expect(actual.reported_date_format).to.equal('DD-MMM-YYYY HH:mm:ss');
      done();
    });
    successCb({ app_settings: expected });
  });

  it('returns errors', function(done) {
    service(function(err) {
      chai.expect(err).to.not.equal(null);
      chai.expect(err.message).to.equal('Not found');
      done();
    });
    failCb('Not found');
  });

});