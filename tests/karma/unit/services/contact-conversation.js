describe('ContactConversation service', function() {

  'use strict';

  var service,
      district,
      districtErr,
      unallocated,
      settingsErr,
      callback,
      errCb;

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('BaseUrlService', function() {
        return 'BASEURL';
      });
      $provide.value('UserDistrict', function(callback) {
        callback(districtErr, district);
      });
      $provide.value('Settings', function(callback) {
        callback(settingsErr, { district_admins_access_unallocated_messages: unallocated });
      });
      $provide.value('DB', {
        get: function() {
          return {
            query: function() {
              return {
                then: function(cb) {
                  callback = cb;
                  return {
                    catch: function(cb) {
                      errCb = cb;
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
      service = $injector.get('ContactConversation');
    });
    district = null;
    districtErr = null;
    unallocated = false;
    settingsErr = null;
  });

  it('builds admin conversation', function(done) {
    var expected = {
      rows: [ 'a', 'b' ]
    };
    service({ id: 'abc'}, function(err, actual) {
      chai.expect(actual).to.deep.equal(expected.rows);
      done();
    });
    callback(expected);
  });

  it('builds district admin conversation', function(done) {
    var expected = {
      rows: [ 'a', 'b' ]
    };
    district = 'xyz';
    service({ id: 'abc' }, function(err, actual) {
      chai.expect(actual).to.deep.equal(expected.rows);
      done();
    });
    callback(expected);
  });

  it('builds admin conversation with skip', function(done) {
    var expected = {
      rows: [ 'a', 'b' ]
    };
    service({ id: 'abc', skip: 45 }, function(err, actual) {
      chai.expect(actual).to.deep.equal(expected.rows);
      done();
    });
    callback(expected);
  });

  it('returns errors from db query', function(done) {
    service({ id: 'abc' }, function(err) {
      chai.expect(err).to.equal('server error');
      done();
    });
    errCb('server error');
  });

});