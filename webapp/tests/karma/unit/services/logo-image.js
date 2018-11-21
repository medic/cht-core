describe('BrandingImages service', function() {

  'use strict';

  var get,
      Changes,
      injector,
      attr;

  beforeEach(function() {
    get = sinon.stub();
    Changes = sinon.stub();
    attr = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ get: get }));
      $provide.factory('Changes', function() {
        return Changes;
      });
    });
    inject(function($injector) {
      injector = $injector;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(get, Changes, attr);
  });

  describe('getLogo function', function() {

    it('returns empty string when given no name', function(done) {
      get.returns(Promise.resolve());
      var service = injector.get('BrandingImages');
      var actual = service.getLogo();
      chai.expect(actual).to.equal('');
      done();
    });

    it('returns empty string when no doc yet', function(done) {
      get.returns(Promise.resolve());
      var service = injector.get('BrandingImages');
      var actual = service.getLogo('logo');
      chai.expect(actual).to.equal('<span class="header-logo" title="logo"></span>');
      done();
    });

    it('returns img when logo doc already cached', function(done) {
      var resources = {
        resources: {
          logo: 'medic-logo-light-full.svg'
        },
        _attachments: {
          'medic-logo-light-full.svg': {
            content_type: 'image/svg+xml',
            data: 'TguMzJsMi4xNT'
          }
        }
      };
      get.returns(Promise.resolve(resources));
      var service = injector.get('BrandingImages');
      setTimeout(function() {
        var actual = service.getLogo('logo');
        var expected =
          '<span class="header-logo" title="logo">' +
            '<img src="data:image/svg+xml;base64,TguMzJsMi4xNT" />' +
          '</span>';
        chai.expect(actual).to.equal(expected);
        done();
      });
    });
  });

});
