describe('Verified service', function() {

  'use strict';

  var service,
      getDoc,
      saveDoc;

  beforeEach(function() {
    getDoc = sinon.stub();
    saveDoc = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', function() {
        return {
          get: function() {
            return {
              post: saveDoc,
              get: getDoc
            };
          }
        };
      });
    });
    inject(function(_Verified_) {
      service = _Verified_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(getDoc, saveDoc);
  });

  it('marks the message verified', function(done) {
    getDoc.returns(KarmaUtils.fakeResolved(null, { _id: 'abc' }));
    saveDoc.returns(KarmaUtils.fakeResolved());
    var expected = { 
      _id: 'abc',
      verified: true
    };
    service('abc', true, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(getDoc.calledOnce).to.equal(true);
      chai.expect(saveDoc.calledOnce).to.equal(true);
      chai.expect(getDoc.firstCall.args[0]).to.equal('abc');
      chai.expect(saveDoc.firstCall.args[0]).to.deep.equal(expected);
      done();
    });
  });

  it('marks the message verified if currently unverified', function(done) {
    getDoc.returns(KarmaUtils.fakeResolved(null, { _id: 'abc', verified: false }));
    saveDoc.returns(KarmaUtils.fakeResolved());
    var expected = { 
      _id: 'abc',
      verified: true
    };
    service('abc', true, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(getDoc.calledOnce).to.equal(true);
      chai.expect(saveDoc.calledOnce).to.equal(true);
      chai.expect(getDoc.firstCall.args[0]).to.equal('abc');
      chai.expect(saveDoc.firstCall.args[0]).to.deep.equal(expected);
      done();
    });
  });

  it('marks the message unverified', function(done) {
    getDoc.returns(KarmaUtils.fakeResolved(null, { _id: 'abc', verified: true }));
    saveDoc.returns(KarmaUtils.fakeResolved());
    var expected = { 
      _id: 'abc',
      verified: false
    };
    service('abc', false, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(getDoc.calledOnce).to.equal(true);
      chai.expect(saveDoc.calledOnce).to.equal(true);
      chai.expect(getDoc.firstCall.args[0]).to.equal('abc');
      chai.expect(saveDoc.firstCall.args[0]).to.deep.equal(expected);
      done();
    });
  });

  it('returns db get errors', function(done) {
    getDoc.returns(KarmaUtils.fakeResolved('errcode1'));
    service('abc', false, function(err) {
      chai.expect(err).to.equal('errcode1');
      done();
    });
  });

  it('returns db save errors', function(done) {
    getDoc.returns(KarmaUtils.fakeResolved(null, { _id: 'abc', verified: true }));
    saveDoc.returns(KarmaUtils.fakeResolved('errcode2'));
    service('abc', false, function(err) {
      chai.expect(err).to.equal('errcode2');
      done();
    });
  });

});