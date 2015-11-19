describe('DeleteDoc service', function() {

  'use strict';

  var service,
      get,
      put,
      message;

  beforeEach(function() {
    get = sinon.stub();
    put = sinon.stub();
    message = {};
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ put: put, get: get }));
    });
    inject(function(_DeleteDoc_) {
      service = _DeleteDoc_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(get, put);
  });

  it('returns db errors', function(done) {
    get.returns(KarmaUtils.mockPromise('errcode1'));
    service('abc', function(err) {
      chai.expect(get.calledOnce).to.equal(true);
      chai.expect(get.firstCall.args[0]).to.equal('abc');
      chai.expect(err).to.equal('errcode1');
      done();
    });
  });

  it('returns audit errors', function(done) {
    get.returns(KarmaUtils.mockPromise(null, { _id: 'xyz' }));
    put.returns(KarmaUtils.mockPromise('errcode2'));
    service('abc', function(err) {
      chai.expect(get.calledOnce).to.equal(true);
      chai.expect(put.calledOnce).to.equal(true);
      chai.expect(err).to.equal('errcode2');
      done();
    });
  });

  it('marks the message deleted', function(done) {
    get.returns(KarmaUtils.mockPromise(null, { _id: 'xyz', type: 'data_record' }));
    put.returns(KarmaUtils.mockPromise());
    var expected = { _id: 'xyz', type: 'data_record', _deleted: true };
    service('abc', function(err, actual) {
      chai.expect(get.calledOnce).to.equal(true);
      chai.expect(put.calledOnce).to.equal(true);
      chai.expect(get.firstCall.args[0]).to.equal('abc');
      chai.expect(actual).to.deep.equal(expected);
      done();
    });
  });

  it('updates clinic deleted person is contact for', function(done) {
    var clinic = {
      _id: 'b',
      type: 'clinic',
      contact: {
        name: 'sally',
        phone: '+555'
      }
    };
    var person = {
      _id: 'a',
      type: 'person',
      phone: '+555',
      name: 'sally',
      parent: {
        _id: 'b'
      }
    };
    get
      .onFirstCall().returns(KarmaUtils.mockPromise(null, person))
      .onSecondCall().returns(KarmaUtils.mockPromise(null, clinic));
    put.returns(KarmaUtils.mockPromise());
    service('a', function(err, actual) {
      chai.expect(get.calledTwice).to.equal(true);
      chai.expect(put.calledTwice).to.equal(true);
      chai.expect(get.firstCall.args[0]).to.equal('a');
      chai.expect(get.secondCall.args[0]).to.equal('b');
      chai.expect(put.firstCall.args[0].contact).to.equal(null);
      chai.expect(actual._deleted).to.equal(true);
      done();
    });
  });

  it('done update clinic when phone does not match', function(done) {
    var clinic = {
      _id: 'b',
      type: 'clinic',
      contact: {
        name: 'sally',
        phone: '+666'
      }
    };
    var person = {
      _id: 'a',
      type: 'person',
      phone: '+555',
      name: 'sally',
      parent: {
        _id: 'b'
      }
    };
    get
      .onFirstCall().returns(KarmaUtils.mockPromise(null, person))
      .onSecondCall().returns(KarmaUtils.mockPromise(null, clinic));
    put.returns(KarmaUtils.mockPromise());
    service('a', function(err, actual) {
      chai.expect(get.calledTwice).to.equal(true);
      chai.expect(put.calledOnce).to.equal(true);
      chai.expect(get.firstCall.args[0]).to.equal('a');
      chai.expect(get.secondCall.args[0]).to.equal('b');
      chai.expect(actual._deleted).to.equal(true);
      done();
    });
  });

});
