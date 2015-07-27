describe('Verified service', function() {

  'use strict';

  var service,
      get,
      post;

  beforeEach(function() {
    get = sinon.stub();
    post = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ post: post, get: get }));
    });
    inject(function(_Verified_) {
      service = _Verified_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(get, post);
  });

  it('marks the message verified', function(done) {
    get.returns(KarmaUtils.fakeResolved(null, { _id: 'abc' }));
    post.returns(KarmaUtils.fakeResolved());
    var expected = { 
      _id: 'abc',
      verified: true
    };
    service('abc', true, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(get.calledOnce).to.equal(true);
      chai.expect(post.calledOnce).to.equal(true);
      chai.expect(get.firstCall.args[0]).to.equal('abc');
      chai.expect(post.firstCall.args[0]).to.deep.equal(expected);
      done();
    });
  });

  it('marks the message verified if currently unverified', function(done) {
    get.returns(KarmaUtils.fakeResolved(null, { _id: 'abc', verified: false }));
    post.returns(KarmaUtils.fakeResolved());
    var expected = { 
      _id: 'abc',
      verified: true
    };
    service('abc', true, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(get.calledOnce).to.equal(true);
      chai.expect(post.calledOnce).to.equal(true);
      chai.expect(get.firstCall.args[0]).to.equal('abc');
      chai.expect(post.firstCall.args[0]).to.deep.equal(expected);
      done();
    });
  });

  it('marks the message unverified', function(done) {
    get.returns(KarmaUtils.fakeResolved(null, { _id: 'abc', verified: true }));
    post.returns(KarmaUtils.fakeResolved());
    var expected = { 
      _id: 'abc',
      verified: false
    };
    service('abc', false, function(err, actual) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal(expected);
      chai.expect(get.calledOnce).to.equal(true);
      chai.expect(post.calledOnce).to.equal(true);
      chai.expect(get.firstCall.args[0]).to.equal('abc');
      chai.expect(post.firstCall.args[0]).to.deep.equal(expected);
      done();
    });
  });

  it('returns db get errors', function(done) {
    get.returns(KarmaUtils.fakeResolved('errcode1'));
    service('abc', false, function(err) {
      chai.expect(err).to.equal('errcode1');
      done();
    });
  });

  it('returns db save errors', function(done) {
    get.returns(KarmaUtils.fakeResolved(null, { _id: 'abc', verified: true }));
    post.returns(KarmaUtils.fakeResolved('errcode2'));
    service('abc', false, function(err) {
      chai.expect(err).to.equal('errcode2');
      done();
    });
  });

});