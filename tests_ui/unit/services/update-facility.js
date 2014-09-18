describe('UpdateFacility service', function() {

  'use strict';

  var service,
      db;

  beforeEach(function() {
    db = {};
    module('inboxApp');
    module(function ($provide) {
      $provide.value('db', db);
    });
    inject(function(_UpdateFacility_) {
      service = _UpdateFacility_;
    });
  });

  it('updates the facility', function(done) {

    db.getDoc = function(id, callback) {
      if (id === 'abc') {
        return callback(null, {
          _id: 'abc',
          errors: [
            { code: 'sys.facility_not_found' },
            { code: 'other error' }
          ]
        });
      }
      if (id === 'xyz') {
        return callback(null, {
          _id: 'xyz'
        });
      }
      chai.fail(id, 'abc or xyz');
    };

    db.saveDoc = function(message, callback) {
      callback(null);
    };

    var expected = { 
      _id: 'abc',
      errors: [
        { code: 'other error' }
      ],
      related_entities: {
        clinic: {
          _id: 'xyz'
        }
      }
    };

    service('abc', 'xyz', function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      done();
    });
  });

  it('updates the facility for health_center', function(done) {

    db.getDoc = function(id, callback) {
      if (id === 'abc') {
        return callback(null, {
          _id: 'abc',
          errors: [
            { code: 'other error' }
          ]
        });
      }
      if (id === 'xyz') {
        return callback(null, {
          _id: 'xyz',
          type: 'health_center'
        });
      }
      chai.fail(id, 'abc or xyz');
    };

    db.saveDoc = function(message, callback) {
      callback(null);
    };

    var expected = { 
      _id: 'abc',
      errors: [
        { code: 'other error' }
      ],
      related_entities: {
        clinic: {
          parent: {
            _id: 'xyz',
            type: 'health_center'
          }
        }
      }
    };

    service('abc', 'xyz', function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      done();
    });
  });

  it('returns db errors', function(done) {

    db.getDoc = function(id, callback) {
      callback('errcode1');
    };

    service('abc', 'xyz', function(err) {
      chai.expect(err).to.equal('errcode1');
      done();
    });
  });

  it('returns db errors from second invokation', function(done) {

    db.getDoc = function(id, callback) {
      if (id === 'abc') {
        return callback(null, {
          _id: 'abc'
        });
      }
      callback('errcode2');
    };

    service('abc', 'xyz', function(err) {
      chai.expect(err).to.equal('errcode2');
      done();
    });
  });

  it('returns audit errors', function(done) {

    db.getDoc = function(id, callback) {
      return callback(null, {});
    };

    db.saveDoc = function(message, callback) {
      callback('errcode3');
    };

    service('abc', 'xyz', function(err) {
      chai.expect(err).to.equal('errcode3');
      done();
    });
  });

});