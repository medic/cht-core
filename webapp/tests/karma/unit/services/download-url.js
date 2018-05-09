describe('DownloadUrl service', function() {

  'use strict';

  var service,
      Language = sinon.stub();

  beforeEach(function() {
    module('inboxApp');
    module(function($provide) {
      $provide.value('Language', Language);
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject(function(_DownloadUrl_) {
      service = _DownloadUrl_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(Language);
  });

  it('builds url for messages', function() {
    return service(null, 'messages').then(function(actual) {
      chai.expect(actual).to.equal('/api/v2/export/messages');
    });
  });

  it('builds url for audit', function() {
    Language.returns(Promise.resolve('en'));
    return service(null, 'audit').then(function(actual) {
      chai.expect(actual).to.equal('/api/v1/export/audit?format=xml&locale=en');
    });
  });

  it('builds url for feedback', function() {
    Language.returns(Promise.resolve('en'));
    return service(null, 'feedback').then(function(actual) {
      chai.expect(actual).to.equal('/api/v1/export/feedback?format=xml&locale=en');
    });
  });

  describe('urls for reports', function() {
    it('builds base url', function() {
      return service(null, 'reports').then(function(actual) {
        chai.expect(actual).to.equal('/api/v2/export/reports');
      });
    });
    it('attaches filter object as params', function() {
      return service({forms: {selected: [{code: 'foo-form'}]}}, 'reports').then(function(actual) {
        chai.expect(decodeURIComponent(actual)).to.equal(
          '/api/v2/export/reports?filters[forms][selected][0][code]=foo-form'
        );
      });
    });
  });

  it('builds url for contacts', function() {
    return service({ query: 'district:2' }, 'contacts').then(function(actual) {
      chai.expect(decodeURIComponent(actual))
          .to.equal('/api/v2/export/contacts?filters[query]=district:2');
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
