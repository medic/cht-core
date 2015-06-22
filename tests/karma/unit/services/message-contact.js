describe('MessageContact service', function() {

  'use strict';

  var service,
      district,
      districtErr,
      unallocated,
      settingsErr,
      successCb,
      failCb;

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('DB', {
        get: function() {
          return {
            query: function() {
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
      $provide.value('UserDistrict', function(callback) {
        callback(districtErr, district);
      });
      $provide.value('Settings', function(callback) {
        callback(settingsErr, { district_admins_access_unallocated_messages: unallocated });
      });
    });
    inject(function($injector) {
      service = $injector.get('MessageContact');
    });
    district = null;
    districtErr = null;
    unallocated = false;
    settingsErr = null;
  });

  it('builds admin list', function(done) {
    var expected = {
      rows: [ 'a', 'b' ]
    };
    service({}, function(err, actual) {
      chai.expect(actual).to.deep.equal(expected.rows);
      done();
    });
    successCb(expected);
  });

  it('returns errors from user district', function(done) {
    districtErr = 'no connection';
    service({}, function(err) {
      chai.expect(err).to.equal('no connection');
      done();
    });
  });

  it('returns errors from db query', function(done) {
    service({}, function(err) {
      chai.expect(err).to.equal('server error');
      done();
    });
    failCb('server error');
  });

  it('returns errors from settings query', function(done) {
    settingsErr = 'gremlins! send for help!';
    service({ districtAdmin: true }, function(err) {
      chai.expect(err).to.equal('gremlins! send for help!');
      done();
    });
    successCb({ rows: [ 'a', 'b' ] });
  });

});