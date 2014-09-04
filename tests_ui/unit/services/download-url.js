describe('DownloadUrl service', function() {

  'use strict';

  var service;

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('BaseUrlService', function() {
        return '/medic';
      });
    });
    inject(function(_DownloadUrl_) {
      service = _DownloadUrl_;
    });
  });

  it('builds url for messages', function() {
    var actual = decodeURIComponent(service({messages: true}));
    chai.expect(actual).to.equal(
      '/medic/export/messages?startkey=[9999999999999,{}]&endkey=[0]&tz=' +
      moment().zone() + '&format=xml&reduce=false'
    );
  });

  it('builds url for forms', function() {
    var actual = decodeURIComponent(service(false));
    chai.expect(actual).to.equal(
      '/medic/export/forms?startkey=[9999999999999,{}]&endkey=[0]&tz=' +
      moment().zone() + '&format=xml&reduce=false'
    );
  });

  it('respects district when provided', function() {
    var actualForms = decodeURIComponent(service({
        district: 'abc123'
    }));
    chai.expect(actualForms).to.equal(
      '/medic/export/forms?startkey=["abc123",9999999999999,{}]'
      + '&endkey=["abc123",0]&tz=' + moment().zone() + '&format=xml&reduce=false'
    );
    var actualMessages = decodeURIComponent(service({
        messages: true,
        district: 'abc123'
    }));
    chai.expect(actualMessages).to.equal(
      '/medic/export/messages?startkey=["abc123",9999999999999,{}]'
      + '&endkey=["abc123",0]&tz=' + moment().zone() + '&format=xml&reduce=false'
    );
  });

});
