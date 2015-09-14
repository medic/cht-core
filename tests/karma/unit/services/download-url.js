describe('DownloadUrl service', function() {

  'use strict';

  var service,
      Language = sinon.stub(),
      GenerateSearchQuery = sinon.stub();

  beforeEach(function() {
    module('inboxApp');
    module(function($provide) {
      $provide.value('Language', Language);
      $provide.value('GenerateSearchQuery', GenerateSearchQuery);
    });
    inject(function(_DownloadUrl_) {
      service = _DownloadUrl_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(Language, GenerateSearchQuery);
  });

  it('builds url for messages', function() {
    Language.returns(KarmaUtils.mockPromise(null, 'en'));
    service(null, 'messages', function(err, actual) {
      chai.expect(actual).to.equal('/api/v1/export/messages?format=xml&locale=en');
    });
  });

  it('builds url for audit', function() {
    Language.returns(KarmaUtils.mockPromise(null, 'en'));
    service(null, 'audit', function(err, actual) {
      chai.expect(actual).to.equal('/api/v1/export/audit?format=xml&locale=en');
    });
  });

  it('builds url for feedback', function() {
    Language.returns(KarmaUtils.mockPromise(null, 'en'));
    service(null, 'feedback', function(err, actual) {
      chai.expect(actual).to.equal('/api/v1/export/feedback?format=xml&locale=en');
    });
  });

  it('builds url for logs', function() {
    Language.returns(KarmaUtils.mockPromise(null, 'en'));
    service(null, 'logs', function(err, actual) {
      chai.expect(actual).to.equal('/api/v1/export/logs?format=zip&locale=en');
    });
  });

  it('builds url for forms', function() {
    Language.returns(KarmaUtils.mockPromise(null, 'en'));
    GenerateSearchQuery.callsArgWith(1, null, { query: 'form:P' });
    service(null, 'reports', function(err, actual) {
      chai.expect(decodeURIComponent(actual))
          .to.equal('/api/v1/export/forms?format=xml&locale=en&query="form:P"&schema=');
    });
  });

  it('builds url for contacts backup', function() {
    Language.returns(KarmaUtils.mockPromise(null, 'en'));
    GenerateSearchQuery.callsArgWith(1, null, { query: 'district:2' });
    service(null, 'contacts', function(err, actual) {
      chai.expect(decodeURIComponent(actual))
          .to.equal('/api/v1/export/contacts?format=json&locale=en&query="district:2"&schema=');
    });
  });

  it('errors for unknown type', function() {
    service(null, 'unknown', function(err) {
      chai.expect(err.message).to.equal('Unknown download type');
    });
  });

});
