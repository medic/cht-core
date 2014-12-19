describe('UpdateUser service', function() {

  'use strict';

  var service,
      user,
      caches,
      db;

  beforeEach(function() {
    db = {};
    user = {};
    caches = [];
    module('inboxApp');
    module(function ($provide) {
      $provide.value('db', db);
      $provide.value('UserCtxService', function() {
        return { name: 'jerome' };
      });
      $provide.value('User', function(callback) {
        callback(null, user);
      });
      $provide.value('$cacheFactory', {
        get: function(name) {
          return {
            remove: function(url) {
              caches.push(name + '~' + url);
            }
          };
        }
      });
    });
    inject(function(_UpdateUser_) {
      service = _UpdateUser_;
    });
  });

  it('updates the user', function(done) {

    db.use = function(dbname) {
      chai.expect(dbname).to.equal('_users');
      return {
        saveDoc: function(updated, callback) {
          callback();
        }
      };
    };

    user = {
      name: 'jerome',
      favcolour: 'turquoise'
    };

    var updates = {
      favcolour: 'aqua',
      starsign: 'libra'
    };

    var expected = { 
      name: 'jerome',
      favcolour: 'aqua',
      starsign: 'libra'
    };

    service(updates, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(caches).to.deep.equal([ '$http~/_users/org.couchdb.user%3Ajerome' ]);
      done();
    });
  });

  it('returns db errors', function(done) {

    db.use = function(dbname) {
      chai.expect(dbname).to.equal('_users');
      return {
        saveDoc: function(updated, callback) {
          callback('errcode1');
        }
      };
    };

    user = {
      name: 'jerome',
      favcolour: 'turquoise'
    };

    var updates = {
      favcolour: 'aqua',
      starsign: 'libra'
    };

    service(updates, function(err) {
      chai.expect(err).to.equal('errcode1');
      chai.expect(caches).to.deep.equal([ '$http~/_users/org.couchdb.user%3Ajerome' ]);
      done();
    });
  });

});