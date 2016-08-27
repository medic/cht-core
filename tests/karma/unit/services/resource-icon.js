describe('ResourceIcons service', function() {

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

  describe('getImg function', function() {

    it('returns undefined when given no name', function(done) {
      get.returns(KarmaUtils.mockPromise());
      var service = injector.get('ResourceIcons');
      var actual = service.getImg();
      chai.expect(actual).to.equal(undefined);
      done();
    });

    it('returns undefined when no doc yet', function(done) {
      get.returns(KarmaUtils.mockPromise());
      var service = injector.get('ResourceIcons');
      var actual = service.getImg('delivery');
      chai.expect(actual).to.equal(undefined);
      done();
    });

    it('returns src when resources doc already cached', function(done) {
      var resources = {
        resources: {
          child: 'child.png',
          mother: 'mother.png'
        },
        _attachments: {
          'child.png': {
            content_type: 'image/png',
            data: 'kiddlywinks'
          },
          'mother.png': {
            content_type: 'image/png',
            data: 'mum'
          }
        }
      };
      get.returns(KarmaUtils.mockPromise(null, resources));
      var service = injector.get('ResourceIcons');
      setTimeout(function() {
        var actual = service.getImg('child');
        var expected = 'data:image/png;base64,kiddlywinks';
        chai.expect(actual).to.equal(expected);
        done();
      });
    });

  });

  describe('replacePlaceholders function', function() {

    it('sets src for given element', function(done) {
      var resources = {
        resources: {
          child: 'child.png'
        },
        _attachments: {
          'child.png': {
            content_type: 'image/png',
            data: 'kiddlywinks'
          }
        }
      };
      get.returns(KarmaUtils.mockPromise(null, resources));
      var dom = $('<ul>' +
                  '<li><img class="resource-icon" name="child"/></li>' +
                  '<li><img class="resource-icon" name="adult"/></li>' +
                '</ul>');
      var service = injector.get('ResourceIcons');
      service.replacePlaceholders(dom);
      setTimeout(function() {
        chai.expect(dom.find('.resource-icon[name="child"]').attr('src'))
          .to.equal('data:image/png;base64,kiddlywinks');
        chai.expect(dom.find('.resource-icon[name="adult"]').attr('src'))
          .to.equal(undefined);
        done();
      });
    });

    it('updates src after db change', function(done) {
      var resources1 = {
        resources: {
          child: 'child.png'
        },
        _attachments: {
          'child.png': {
            content_type: 'image/png',
            data: 'kiddlywinks'
          }
        }
      };
      var resources2 = {
        resources: {
          child: 'child.png',
          adult: 'bigchild.png'
        },
        _attachments: {
          'child.png': {
            content_type: 'image/png',
            data: 'kiddlywinks'
          },
          'bigchild.png': {
            content_type: 'image/png',
            data: 'coffinstuffer'
          }
        }
      };
      get
        .onFirstCall().returns(KarmaUtils.mockPromise(null, resources1))
        .onSecondCall().returns(KarmaUtils.mockPromise(null, resources2));
      var dom = $('<ul>' +
                  '<li><img class="resource-icon" name="child"/></li>' +
                  '<li><img class="resource-icon" name="adult"/></li>' +
                '</ul>');
      var service = injector.get('ResourceIcons');
      service.replacePlaceholders(dom);
      setTimeout(function() {
        chai.expect(dom.find('.resource-icon[name="child"]').attr('src'))
          .to.equal('data:image/png;base64,kiddlywinks');
        chai.expect(dom.find('.resource-icon[name="adult"]').attr('src'))
          .to.equal(undefined);

        Changes.args[0][0].callback(); // invoke the changes listener
        service.replacePlaceholders(dom);
        setTimeout(function() {
          chai.expect(dom.find('.resource-icon[name="child"]').attr('src'))
            .to.equal('data:image/png;base64,kiddlywinks');
          chai.expect(dom.find('.resource-icon[name="adult"]').attr('src'))
            .to.equal('data:image/png;base64,coffinstuffer');
          chai.expect(get.callCount).to.equal(2);
          done();
        });
      });
    });

  });

});
