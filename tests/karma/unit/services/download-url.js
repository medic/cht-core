describe('DownloadUrl service', function() {

  'use strict';

  var service,
      query,
      locale;

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('Language', function(callback) {
        callback(null, locale);
      });
      $provide.value('GenerateSearchQuery', function($scope, callback) {
        callback(null, query);
      });
    });
    inject(function(_DownloadUrl_) {
      service = _DownloadUrl_;
    });
    query = null;
    locale = null;
  });

  it('builds url for messages', function() {
    locale = 'en';
    service(null, 'messages', function(err, actual) {
      chai.expect(actual).to.equal('/api/v1/export/messages?format=xml&locale=en');
    });
  });

  it('builds url for audit', function() {
    locale = 'en';
    service(null, 'audit', function(err, actual) {
      chai.expect(actual).to.equal('/api/v1/export/audit?format=xml&locale=en');
    });
  });

  it('builds url for feedback', function() {
    locale = 'en';
    service(null, 'feedback', function(err, actual) {
      chai.expect(actual).to.equal('/api/v1/export/feedback?format=xml&locale=en');
    });
  });

  it('builds url for forms', function() {
    locale = 'en';
    query = 'form:P';
    service(null, 'reports', function(err, actual) {
      chai.expect(decodeURIComponent(actual))
          .to.equal('/api/v1/export/forms?format=xml&locale=en&query=form:P');
    });
  });

  it('errors for unknown type', function() {
    service(null, 'unknown', function(err) {
      chai.expect(err).to.equal('Unknown download type');
    });
  });

});
