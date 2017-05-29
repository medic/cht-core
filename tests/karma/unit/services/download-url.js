describe('DownloadUrl service', function() {

  'use strict';

  var service,
      Language = sinon.stub(),
      GenerateLuceneQuery = sinon.stub();

  beforeEach(function() {
    module('inboxApp');
    module(function($provide) {
      $provide.value('Language', Language);
      $provide.value('GenerateLuceneQuery', GenerateLuceneQuery);
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject(function(_DownloadUrl_) {
      service = _DownloadUrl_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(Language, GenerateLuceneQuery);
  });

  it('builds url for messages', function() {
    Language.returns(KarmaUtils.mockPromise(null, 'en'));
    return service(null, 'messages').then(function(actual) {
      chai.expect(actual).to.equal('/api/v1/export/messages?format=xml&locale=en');
    });
  });

  it('builds url for audit', function() {
    Language.returns(KarmaUtils.mockPromise(null, 'en'));
    return service(null, 'audit').then(function(actual) {
      chai.expect(actual).to.equal('/api/v1/export/audit?format=xml&locale=en');
    });
  });

  it('builds url for feedback', function() {
    Language.returns(KarmaUtils.mockPromise(null, 'en'));
    return service(null, 'feedback').then(function(actual) {
      chai.expect(actual).to.equal('/api/v1/export/feedback?format=xml&locale=en');
    });
  });

  it('builds url for logs', function() {
    Language.returns(KarmaUtils.mockPromise(null, 'en'));
    return service(null, 'logs').then(function(actual) {
      chai.expect(actual).to.equal('/api/v1/export/logs?format=zip&locale=en');
    });
  });

  it('builds url for forms', function() {
    Language.returns(KarmaUtils.mockPromise(null, 'en'));
    GenerateLuceneQuery.returns({ query: 'form:P' });
    return service(null, 'reports').then(function(actual) {
      chai.expect(decodeURIComponent(actual))
          .to.equal('/api/v1/export/forms?format=xml&locale=en&query="form:P"&schema=');
    });
  });

  it('builds url for contacts backup', function() {
    Language.returns(KarmaUtils.mockPromise(null, 'en'));
    GenerateLuceneQuery.returns({ query: 'district:2' });
    return service(null, 'contacts').then(function(actual) {
      chai.expect(decodeURIComponent(actual))
          .to.equal('/api/v1/export/contacts?format=json&locale=en&query="district:2"&schema=');
    });
  });

  it('errors for unknown type', function(done) {
    service(null, 'unknown')
      .then(function() {
        done(new Error('expected error to be thrown'));
      })
      .catch(function(err) {
        chai.expect(err.message).to.equal('Unknown download type');
        done();
      });
  });

});
