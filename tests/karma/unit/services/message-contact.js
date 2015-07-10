describe('MessageContact service', function() {

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
    });
    inject(function($injector) {
      service = $injector.get('MessageContact');
    });
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

  it('returns errors from db query', function(done) {
    service({}, function(err) {
      chai.expect(err).to.equal('server error');
      done();
    });
    failCb('server error');
  });

});