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
    var actual = decodeURIComponent(service('messages'));
    chai.expect(actual).to.equal(
      '/medic/export/messages?startkey=[9999999999999,{}]&endkey=[0]&tz=' +
      moment().zone() + '&format=xml&reduce=false'
    );
  });

  it('builds url for forms', function() {
    var actual = decodeURIComponent(service('reports'));
    chai.expect(actual).to.equal(
      '/medic/export/forms?startkey=[9999999999999,{}]&endkey=[0]&tz=' +
      moment().zone() + '&format=xml&reduce=false'
    );
  });

});
