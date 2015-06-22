describe('User service', function() {

  'use strict';

  var service,
      successCb,
      failCb,
      username = 'john';

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('UserCtxService', function() {
        return { name: username };
      });
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
      service = $injector.get('User');
    });
    successCb = failCb = null;
  });

  it('retrieves user', function(done) {
    var expected = { fullname: 'John Smith' };
    service(function(err, user) {
      chai.expect(err).to.equal(null);
      chai.expect(user).to.deep.equal(expected);
      done();
    });
    successCb(expected);
  });

  it('returns errors', function(done) {
    service(function(err) {
      chai.expect(err.message).to.equal('Not found');
      done();
    });
    failCb('Not found');
  });

});

