describe('SaveDoc service', function() {

  'use strict';

  var service,
      getDoc,
      saveDoc;

  beforeEach(function() {
    getDoc = sinon.stub();
    saveDoc = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('db', function() {
        return {
          getDoc: getDoc,
          saveDoc: saveDoc
        };
      });
    });
    inject(function($injector) {
      service = $injector.get('SaveDoc');
    });
  });

  afterEach(function() {
    if (getDoc.restore) {
      getDoc.restore();
    }
    if (saveDoc.restore) {
      saveDoc.restore();
    }
  });

  it('returns errors from getDoc', function(done) {
    getDoc.callsArgWith(1, 'boom');
    service('abc', {}, function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(getDoc.calledOnce).to.equal(true);
      chai.expect(getDoc.firstCall.args[0]).to.equal('abc');
      done();
    });
  });

  it('returns errors from saveDoc', function(done) {
    saveDoc.callsArgWith(1, 'boom');
    service({ name: 'frank' }, function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(getDoc.calledOnce).to.equal(false);
      chai.expect(saveDoc.calledOnce).to.equal(true);
      chai.expect(saveDoc.firstCall.args[0]).to.deep.equal({ name: 'frank' });
      done();
    });
  });

  it('saves new docs', function(done) {
    saveDoc.callsArgWith(1, null, { id: 2, rev: 1 });
    var saveFrank = saveDoc.withArgs(sinon.match({ name: 'frank' }));
    service({ name: 'frank' }, function(err, doc) {
      chai.expect(err).to.equal(null);
      chai.expect(getDoc.calledOnce).to.equal(false);
      chai.expect(saveFrank.calledOnce).to.equal(true);
      chai.expect(doc).to.deep.equal({ name: 'frank', _id: 2, _rev: 1 });
      done();
    });
  });

  it('updates existing docs', function(done) {
    getDoc.callsArgWith(1, null, { name: 'frank', surname: 'underwood', _id: 'abc', _rev: 2 });
    saveDoc.callsArgWith(1, null, { id: 'abc', rev: 3 });
    var saveFrank = saveDoc.withArgs(sinon.match({ name: 'clair', surname: 'underwood', job: 'politician', _id: 'abc', _rev: 2 }));
    service('abc', { name: 'clair', job: 'politician' }, function(err, doc) {
      chai.expect(err).to.equal(null);
      chai.expect(getDoc.calledOnce).to.equal(true);
      chai.expect(getDoc.firstCall.args[0]).to.equal('abc');
      chai.expect(saveFrank.calledOnce).to.equal(true);
      chai.expect(doc).to.deep.equal({ name: 'clair', surname: 'underwood', job: 'politician', _id: 'abc', _rev: 3 });
      done();
    });
  });

});
