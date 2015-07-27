describe('UpdateContact service', function() {

  'use strict';

  var service,
      query,
      put;

  beforeEach(function() {
    query = sinon.stub();
    put = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', function() {
        return {
          get: function() {
            return {
              put: put,
              query: query
            };
          }
        };
      });
      $provide.factory('ClearFacilityCache', function() {
        return function() {};
      });
    });
    inject(function(_UpdateContact_) {
      service = _UpdateContact_;
    });
  });

  afterEach(function() {
    if (query.restore) {
      query.restore();
    }
    if (put.restore) {
      put.restore();
    }
  });

  it('returns save errors', function() {
    var doc = { name: 'juan' };
    put.returns(KarmaUtils.fakeResolved('boom'));
    service(null, doc, function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(put.calledOnce).to.equal(true);
    });
  });

  it('adds a new doc', function() {
    var doc = { name: 'juan' };
    var expected = { _id: 1, _rev: 1, name: 'juan' };
    put.returns(KarmaUtils.fakeResolved(null, { _id: 1, _rev: 1 }));
    service(null, doc, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(put.calledOnce).to.equal(true);
    });
  });

  it('edit an existing doc', function() {
    var doc = { _id: 1, _rev: 1, name: 'jack' };
    var updates = { name: 'juan' };
    var expected = { _id: 1, _rev: 2, name: 'juan' };
    put.returns(KarmaUtils.fakeResolved(null, { _id: 1, _rev: 2 }));
    query.returns(KarmaUtils.fakeResolved(null, { rows: [] }));
    service(doc, updates, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(put.calledOnce).to.equal(true);
      chai.expect(query.calledOnce).to.equal(true);
    });
  });

  it('returns view errors', function() {
    var doc = { _id: 1, _rev: 1, name: 'jack' };
    var updates = { name: 'juan' };
    put.returns(KarmaUtils.fakeResolved(null, { _id: 1, _rev: 2 }));
    query.returns(KarmaUtils.fakeResolved('boom'));
    service(doc, updates, function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(put.calledOnce).to.equal(true);
      chai.expect(query.calledOnce).to.equal(true);
    });
  });

  it('update children', function() {
    var doc = { _id: 1, _rev: 1, name: 'jack', type: 'district_hospital' };
    var updates = { name: 'juan' };
    var expected = { _id: 1, _rev: 2, name: 'juan', type: 'district_hospital' };
    var child1 = { _id: 2, parent: { _id: 1, _rev: 1, name: 'old' }, type: 'person' };
    var child2 = { _id: 3, parent: { _id: 1, _rev: 1, name: 'old' }, type: 'person' };
    put
      .onFirstCall().returns(KarmaUtils.fakeResolved(null, { _id: 1, _rev: 2 }))
      .onSecondCall().returns(KarmaUtils.fakeResolved(null, { _id: 2, _rev: 2 }))
      .onThirdCall().returns(KarmaUtils.fakeResolved(null, { _id: 3, _rev: 2 }));
    query.returns(KarmaUtils.fakeResolved(null, { rows: [ { doc: child1 }, { doc: child2 } ] }));
    service(doc, updates, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(put.calledThrice).to.equal(true);
      chai.expect(query.calledOnce).to.equal(true);
    });
  });

  it('only updates children who are not already updated', function() {
    var doc = { _id: 1, _rev: 1, name: 'jack', type: 'district_hospital' };
    var updates = { name: 'juan' };
    var expected = { _id: 1, _rev: 2, name: 'juan', type: 'district_hospital' };
    var child1 = { _id: 2, parent: { _id: 1, _rev: 2, name: 'old' }, type: 'person' };
    var child2 = { _id: 3, parent: { _id: 1, _rev: 1, name: 'old' }, type: 'person' };
    put
      .onFirstCall().returns(KarmaUtils.fakeResolved(null, { _id: 1, _rev: 2 }))
      .onSecondCall().returns(KarmaUtils.fakeResolved(null, { _id: 2, _rev: 2 }))
      .onThirdCall().returns(KarmaUtils.fakeResolved(null, { _id: 3, _rev: 2 }));
    query.returns(KarmaUtils.fakeResolved(null, { rows: [ { doc: child1 }, { doc: child2 } ] }));
    service(doc, updates, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(put.calledTwice).to.equal(true);
      chai.expect(query.calledOnce).to.equal(true);
    });
  });

  it('contacts must not have parents', function() {
    var doc = { _id: 1, _rev: 1, name: 'jack', type: 'district_hospital' };
    var updates = { name: 'juan', type: 'district_hospital', contact: { name: 'dave', parent: { _id: 5 } } };
    var expected = { _id: 1, _rev: 2, name: 'juan', type: 'district_hospital', contact: { name: 'dave' } };
    put.returns(KarmaUtils.fakeResolved(null, { _id: 1, _rev: 2 }));
    query.returns(KarmaUtils.fakeResolved(null, { rows: [ ] }));
    service(doc, updates, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(put.calledOnce).to.equal(true);
      chai.expect(put.args[0][0]).to.deep.equal(expected);
      chai.expect(query.calledOnce).to.equal(true);
    });
  });

  it('when updating persons the facilitys contact field is also updated', function() {
    var doc = { _id: 1, _rev: 2, name: 'jack', phone: '5551234', type: 'person', parent: { _id: 2, _rev: 1, name: 'juanville', type: 'clinic' } };
    var updates = { name: 'juan' };
    var expected = { _id: 1, _rev: 2, name: 'juan', phone: '5551234', type: 'person', parent: { _id: 2, _rev: 1, name: 'juanville', type: 'clinic' } };
    var clinic = { _id: 2, _rev: 1, name: 'juanville', type: 'clinic', contact: { _id: 1, _rev: 1, name: 'jack', phone: '5554321', type: 'person' } };
    put
      .onFirstCall().returns(KarmaUtils.fakeResolved(null, { _id: 1, _rev: 2 }))
      .onSecondCall().returns(KarmaUtils.fakeResolved(null, { _id: 2, _rev: 2 }))
      .onThirdCall().returns(KarmaUtils.fakeResolved(null, { _id: 3, _rev: 2 }));
    query.returns(KarmaUtils.fakeResolved(null, { rows: [ { doc: clinic } ] }));
    service(doc, updates, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(put.calledTwice).to.equal(true);
      chai.expect(put.args[0][0]).to.deep.equal({ _id: 1, _rev: 2, name: 'juan', phone: '5551234', type: 'person', parent: { _id: 2, _rev: 1, name: 'juanville', type: 'clinic' } });
      chai.expect(put.args[1][0]).to.deep.equal({ _id: 2, _rev: 2, name: 'juanville', type: 'clinic', contact: { _id: 1, _rev: 2, name: 'juan', phone: '5551234', type: 'person' } });
      chai.expect(query.calledOnce).to.equal(true);
    });
  });
});
