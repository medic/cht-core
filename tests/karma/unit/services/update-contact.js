describe('UpdateContact service', function() {

  'use strict';

  var service,
      SaveDoc,
      DbView;

  beforeEach(function() {
    SaveDoc = sinon.stub();
    DbView = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('SaveDoc', function() {
        return SaveDoc;
      });
      $provide.factory('DbView', function() {
        return DbView;
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
    if (SaveDoc.restore) {
      SaveDoc.restore();
    }
    if (DbView.restore) {
      DbView.restore();
    }
  });

  it('returns save errors', function() {
    var doc = { name: 'juan' };
    SaveDoc.callsArgWith(2, 'boom');
    service(doc, function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(SaveDoc.calledOnce).to.equal(true);
    });
  });

  it('adds a new doc', function() {
    var doc = { name: 'juan' };
    var expected = { _id: 1, name: 'juan' };
    SaveDoc.callsArgWith(2, null, expected);
    service(doc, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(SaveDoc.calledOnce).to.equal(true);
    });
  });

  it('edit an existing doc', function() {
    var updates = { name: 'juan' };
    var expected = { _id: 1, name: 'juan' };
    SaveDoc.callsArgWith(2, null, expected);
    service(1, updates, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(SaveDoc.calledOnce).to.equal(true);
    });
  });

  it('returns view errors', function() {
    var doc = { name: 'juan' };
    var expected = { _id: 1, name: 'juan', type: 'district_hospital' };
    SaveDoc.callsArgWith(2, null, expected);
    DbView.callsArgWith(2, 'boom');
    service(doc, function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(SaveDoc.calledOnce).to.equal(true);
      chai.expect(DbView.calledOnce).to.equal(true);
    });
  });

  it('update children', function() {
    var updates = { name: 'juan' };
    var expected = { _id: 1, _rev: 2, name: 'juan', type: 'district_hospital' };
    var child1 = { _id: 2, parent: { _id: 1, _rev: 1, name: 'old' }, type: 'clinic' };
    var child2 = { _id: 3, parent: { _id: 1, _rev: 1, name: 'old' }, type: 'clinic' };
    SaveDoc
      .onFirstCall().callsArgWith(2, null, expected)
      .onSecondCall().callsArgWith(2, null, child1)
      .onThirdCall().callsArgWith(2, null, child2);
    DbView.callsArgWith(2, null, [ child1, child2 ]);
    service(1, updates, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(SaveDoc.calledThrice).to.equal(true);
      chai.expect(DbView.calledOnce).to.equal(true);
    });
  });

  it('only updates children who are not already updated', function() {
    var updates = { name: 'juan' };
    var expected = { _id: 1, _rev: 2, name: 'juan', type: 'district_hospital' };
    var child1 = { _id: 2, parent: { _id: 1, _rev: 2, name: 'old' }, type: 'clinic' };
    var child2 = { _id: 3, parent: { _id: 1, _rev: 1, name: 'old' }, type: 'clinic' };
    SaveDoc
      .onFirstCall().callsArgWith(2, null, expected)
      .onSecondCall().callsArgWith(2, null, child1)
      .onThirdCall().callsArgWith(2, null, child2);
    DbView.callsArgWith(2, null, [ child1, child2 ]);
    service(1, updates, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(SaveDoc.calledTwice).to.equal(true);
      chai.expect(DbView.calledOnce).to.equal(true);
    });
  });

  it('contacts must not have parents', function() {
    var updates = { name: 'juan', type: 'district_hospital', contact: { name: 'dave', parent: { _id: 5 } } };
    var expected = { _id: 1, _rev: 2, name: 'juan', type: 'district_hospital', contact: { name: 'dave' } };
    SaveDoc.onFirstCall().callsArgWith(2, null, expected);
    DbView.callsArgWith(2, null, [ ]);
    service(1, updates, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(SaveDoc.calledOnce).to.equal(true);
      chai.expect(SaveDoc.args[0][1]).to.deep.equal({name:'juan', type:'district_hospital', contact:{ name:'dave' }});
      chai.expect(DbView.calledOnce).to.equal(true);
    });
  });

  it('when updating persons the facilitys contact field is also updated', function() {
    var updates = { name: 'juan' };
    var person = { _id: 1, _rev: 2, name: 'juan', phone: '5551234', type: 'person', parent: { _id: 2, _rev: 1, name: 'juanville', type: 'clinic' } };
    var clinic = { _id: 2, _rev: 1, name: 'juanville', type: 'clinic', contact: { _id: 1, _rev: 1, name: 'jack', phone: '5554321', type: 'person' } };
    SaveDoc
      .onFirstCall().callsArgWith(2, null, person)
      .onSecondCall().callsArgWith(2, null, {});
    DbView.callsArgWith(2, null, [ clinic ]);
    service(1, updates, function(err, actual) {
      chai.expect(err).to.equal(undefined);
      chai.expect(actual).to.deep.equal(person);
      chai.expect(SaveDoc.calledTwice).to.equal(true);
      chai.expect(SaveDoc.args[0][0]).to.equal(1);
      chai.expect(SaveDoc.args[0][1]).to.deep.equal(updates);
      chai.expect(SaveDoc.args[1][0]).to.equal(2);
      chai.expect(SaveDoc.args[1][1]).to.deep.equal({ contact: { _id: 1, _rev: 2, name: 'juan', phone: '5551234', type: 'person' } });
      chai.expect(DbView.calledOnce).to.equal(true);
    });
  });
});
