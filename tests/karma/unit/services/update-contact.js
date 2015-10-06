describe('UpdateContact service', function() {

  'use strict';

  var service,
      query,
      post,
      put;

  beforeEach(function() {
    query = sinon.stub();
    put = sinon.stub();
    post = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ put: put, post: post, query: query }));
    });
    inject(function(_UpdateContact_) {
      service = _UpdateContact_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(query, put, post);
  });

  it('returns save errors', function(done) {
    var doc = { _id: 1, name: 'juan' };
    put.returns(KarmaUtils.mockPromise('boom'));
    service(null, doc, function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(put.calledOnce).to.equal(true);
      done();
    });
  });

  it('adds a new doc', function(done) {
    var doc = { name: 'juan' };
    var expected = { _id: 1, _rev: 1, name: 'juan' };
    post.returns(KarmaUtils.mockPromise(null, { _id: 1, _rev: 1 }));
    service(null, doc, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(post.calledOnce).to.equal(true);
      done();
    });
  });

  it('edit an existing doc', function(done) {
    var doc = { _id: 1, _rev: 1, name: 'jack' };
    var updates = { name: 'juan' };
    var expected = { _id: 1, _rev: 2, name: 'juan' };
    put.returns(KarmaUtils.mockPromise(null, { _id: 1, _rev: 2 }));
    query.returns(KarmaUtils.mockPromise(null, { rows: [] }));
    service(doc, updates, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(put.calledOnce).to.equal(true);
      chai.expect(query.calledOnce).to.equal(true);
      done();
    });
  });

  it('returns view errors', function(done) {
    var doc = { _id: 1, _rev: 1, name: 'jack' };
    var updates = { name: 'juan' };
    put.returns(KarmaUtils.mockPromise(null, { _id: 1, _rev: 2 }));
    query.returns(KarmaUtils.mockPromise('boom'));
    service(doc, updates, function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(put.calledOnce).to.equal(true);
      chai.expect(query.calledOnce).to.equal(true);
      done();
    });
  });

  it('update children', function(done) {
    var doc = { _id: 1, _rev: 1, name: 'jack', type: 'district_hospital' };
    var updates = { name: 'juan' };
    var expected = { _id: 1, _rev: 2, name: 'juan', type: 'district_hospital' };
    var child1 = { _id: 2, parent: { _id: 1, _rev: 1, name: 'old' }, type: 'person' };
    var child2 = { _id: 3, parent: { _id: 1, _rev: 1, name: 'old' }, type: 'person' };
    put
      .onFirstCall().returns(KarmaUtils.mockPromise(null, { _id: 1, _rev: 2 }))
      .onSecondCall().returns(KarmaUtils.mockPromise(null, { _id: 2, _rev: 2 }))
      .onThirdCall().returns(KarmaUtils.mockPromise(null, { _id: 3, _rev: 2 }));
    query.returns(KarmaUtils.mockPromise(null, { rows: [ { doc: child1 }, { doc: child2 } ] }));
    service(doc, updates, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(put.calledThrice).to.equal(true);
      chai.expect(query.calledOnce).to.equal(true);
      done();
    });
  });

  it('only updates children who are not already updated', function(done) {
    var doc = { _id: 1, _rev: 1, name: 'jack', type: 'district_hospital' };
    var updates = { name: 'juan' };
    var expected = { _id: 1, _rev: 2, name: 'juan', type: 'district_hospital' };
    var child1 = { _id: 2, parent: { _id: 1, _rev: 2, name: 'old' }, type: 'person' };
    var child2 = { _id: 3, parent: { _id: 1, _rev: 1, name: 'old' }, type: 'person' };
    put
      .onFirstCall().returns(KarmaUtils.mockPromise(null, { _id: 1, _rev: 2 }))
      .onSecondCall().returns(KarmaUtils.mockPromise(null, { _id: 2, _rev: 2 }))
      .onThirdCall().returns(KarmaUtils.mockPromise(null, { _id: 3, _rev: 2 }));
    query.returns(KarmaUtils.mockPromise(null, { rows: [ { doc: child1 }, { doc: child2 } ] }));
    service(doc, updates, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(put.calledTwice).to.equal(true);
      chai.expect(query.calledOnce).to.equal(true);
      done();
    });
  });

  it('contacts must not have parents', function(done) {
    var doc = { _id: 1, _rev: 1, name: 'jack', type: 'district_hospital' };
    var updates = { name: 'juan', type: 'district_hospital', contact: { name: 'dave', parent: { _id: 5 } } };
    var expected = { _id: 1, _rev: 2, name: 'juan', type: 'district_hospital', contact: { name: 'dave' } };
    put.onFirstCall().returns(KarmaUtils.mockPromise(null, { _id: 1, _rev: 2 }));
    query.onFirstCall().returns(KarmaUtils.mockPromise(null, { rows: [ ] }));
    service(doc, updates, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(put.calledOnce).to.equal(true);
      chai.expect(put.args[0][0]).to.deep.equal(expected);
      chai.expect(query.calledOnce).to.equal(true);
      done();
    });
  });

  it('when updating persons the facilitys contact field is also updated', function(done) {
    var doc = { _id: 1, _rev: 2, name: 'jack', phone: '5551234', type: 'person', parent: { _id: 2, _rev: 1, name: 'juanville', type: 'clinic' } };
    var updates = { name: 'juan' };
    var expected = { _id: 1, _rev: 2, name: 'juan', phone: '5551234', type: 'person', parent: { _id: 2, _rev: 1, name: 'juanville', type: 'clinic' } };
    var clinic = { _id: 2, _rev: 1, name: 'juanville', type: 'clinic', contact: { _id: 1, _rev: 1, name: 'jack', phone: '5554321', type: 'person' } };
    put
      .onFirstCall().returns(KarmaUtils.mockPromise(null, { _id: 1, _rev: 2 }))
      .onSecondCall().returns(KarmaUtils.mockPromise(null, { _id: 2, _rev: 2 }))
      .onThirdCall().returns(KarmaUtils.mockPromise(null, { _id: 3, _rev: 2 }));
    query.returns(KarmaUtils.mockPromise(null, { rows: [ { doc: clinic } ] }));
    service(doc, updates, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(put.calledTwice).to.equal(true);
      chai.expect(put.args[0][0]).to.deep.equal({ _id: 1, _rev: 2, name: 'juan', phone: '5551234', type: 'person', parent: { _id: 2, _rev: 1, name: 'juanville', type: 'clinic' } });
      chai.expect(put.args[1][0]).to.deep.equal({ _id: 2, _rev: 2, name: 'juanville', type: 'clinic', contact: { _id: 1, _rev: 2, name: 'juan', phone: '5551234', type: 'person' } });
      chai.expect(query.calledOnce).to.equal(true);
      done();
    });
  });
});
