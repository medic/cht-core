describe('UpdateContact service', function() {

  'use strict';

  var service,
      saveError,
      saveResult,
      saveCount,
      viewError,
      viewResult,
      viewCount;

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('SaveDoc', function(id, updates, callback) {
        saveCount++;
        callback(saveError, saveResult);
      });
      $provide.value('DbView', function(viewName, options, callback) {
        if (viewCount++ === 0) {
          callback(viewError, viewResult);
        } else {
          callback(null, []);
        }
      });
    });
    inject(function(_UpdateContact_) {
      service = _UpdateContact_;
    });
    saveError = null;
    saveResult = null;
    saveCount = 0;
    viewError = null;
    viewResult = null;
    viewCount = 0;
  });

  it('returns save errors', function() {
    var doc = { name: 'juan' };
    saveError = 'boom';
    service(doc, function(err) {
      chai.expect(err).to.equal('boom');
    });
  });

  it('adds a new doc', function() {
    var doc = { name: 'juan' };
    saveResult = { _id: 1, name: 'juan' };
    service(doc, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(saveResult);
    });
  });

  it('edit an existing doc', function() {
    var updates = { name: 'juan' };
    saveResult = { _id: 1, name: 'juan' };
    service(1, updates, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(saveResult);
    });
  });

  it('returns view errors', function() {
    var doc = { name: 'juan' };
    saveResult = { _id: 1, name: 'juan', type: 'district_hospital' };
    viewError = 'boom';
    service(doc, function(err) {
      chai.expect(err).to.equal('boom');
    });
  });

  it('update children', function() {
    var updates = { name: 'juan' };
    saveResult = { _id: 1, _rev: 2, name: 'juan', type: 'district_hospital' };
    viewResult = [
      { _id: 2, parent: { _id: 1, _rev: 1, name: 'old' }, type: 'clinic' },
      { _id: 3, parent: { _id: 1, _rev: 1, name: 'old' }, type: 'clinic' }
    ];
    service(1, updates, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(saveResult);
      chai.expect(saveCount).to.equal(3);
    });
  });

  it('only updates children who are not already updated', function() {
    var updates = { name: 'juan' };
    saveResult = { _id: 1, _rev: 2, name: 'juan', type: 'district_hospital' };
    viewResult = [
      { _id: 2, parent: { _id: 1, _rev: 2, name: 'old' }, type: 'clinic' },
      { _id: 3, parent: { _id: 1, _rev: 1, name: 'old' }, type: 'clinic' }
    ];
    service(1, updates, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(saveResult);
      chai.expect(saveCount).to.equal(2);
    });
  });

});
