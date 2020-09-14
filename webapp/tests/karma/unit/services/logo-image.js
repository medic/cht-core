describe('BrandingImages service', function() {

  'use strict';

  let get;
  let Changes;
  let injector;
  let attr;

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
      const service = injector.get('ResourceIcons');
      const actual = service.getImg();
      chai.expect(actual).to.equal('');
      done();
    });

    it('returns empty string when no doc yet', function(done) {
      get.returns(Promise.resolve());
      const service = injector.get('ResourceIcons');
      const actual = service.getImg('logo', 'branding');
      chai.expect(actual).to.equal('<span class="header-logo" data-title="logo" >&nbsp</span>');
      done();
    });

    it('returns img when logo doc already cached', function(done) {
      const resources = {
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
      const service = injector.get('ResourceIcons');
      setTimeout(function() {
        const actual = service.getImg('logo', 'branding');
        const expected =
          '<span class="header-logo" data-title="logo" >' +
            '<img src="data:image/svg+xml;base64,TguMzJsMi4xNT" />' +
          '</span>';
        chai.expect(actual).to.equal(expected);
        done();
      });
    });
  });

});
