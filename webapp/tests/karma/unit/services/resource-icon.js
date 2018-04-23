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

    it('returns empty string when given no name', function(done) {
      get.returns(Promise.resolve());
      var service = injector.get('ResourceIcons');
      var actual = service.getImg();
      chai.expect(actual).to.equal('');
      done();
    });

    it('returns empty string when no doc yet', function(done) {
      get.returns(Promise.resolve());
      var service = injector.get('ResourceIcons');
      var actual = service.getImg('delivery');
      chai.expect(actual).to.equal('<span class="resource-icon" title="delivery"></span>');
      done();
    });

    it('returns img when resources doc already cached', function(done) {
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
      get.returns(Promise.resolve(resources));
      var service = injector.get('ResourceIcons');
      setTimeout(function() {
        var actual = service.getImg('child');
        var expected =
          '<span class="resource-icon" title="child">' +
            '<img src="data:image/png;base64,kiddlywinks" />' +
          '</span>';
        chai.expect(actual).to.equal(expected);
        done();
      });
    });

    it('returns inline svg for svg images', function(done) {
      var data = `<svg  xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                    <rect x="10" y="10" height="100" width="100" style="stroke:#ff0000; fill: #0000ff"/>
                  </svg>`;
      var resources = {
        resources: {
          mother: 'mother.png'
        },
        _attachments: {
          'mother.png': {
            content_type: 'image/svg+xml',
            data: btoa(data)
          }
        }
      };
      get.returns(Promise.resolve(resources));
      var service = injector.get('ResourceIcons');
      setTimeout(function() {
        var actual = service.getImg('mother');
        var expected = '<span class="resource-icon" title="mother">' + data + '</span>';
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
      get.returns(Promise.resolve(resources));
      var dom = $('<ul>' +
                    '<li><img class="resource-icon" title="child"/></li>' +
                    '<li><img class="resource-icon" title="adult"/></li>' +
                  '</ul>');
      var service = injector.get('ResourceIcons');
      service.replacePlaceholders(dom);
      setTimeout(function() {
        chai.expect(dom.find('.resource-icon[title="child"] img').attr('src'))
          .to.equal('data:image/png;base64,kiddlywinks');
        chai.expect(dom.find('.resource-icon[title="adult"] img').attr('src'))
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
        .onFirstCall().returns(Promise.resolve(resources1))
        .onSecondCall().returns(Promise.resolve(resources2));
      var dom = $('<ul>' +
                  '<li><img class="resource-icon" title="child"/></li>' +
                  '<li><img class="resource-icon" title="adult"/></li>' +
                '</ul>');
      var service = injector.get('ResourceIcons');
      service.replacePlaceholders(dom);
      setTimeout(function() {
        chai.expect(dom.find('.resource-icon[title="child"] img').attr('src'))
          .to.equal('data:image/png;base64,kiddlywinks');
        chai.expect(dom.find('.resource-icon[title="adult"] img').attr('src'))
          .to.equal(undefined);

        Changes.args[0][0].callback(); // invoke the changes listener
        service.replacePlaceholders(dom);
        setTimeout(function() {
          chai.expect(dom.find('.resource-icon[title="child"] img').attr('src'))
            .to.equal('data:image/png;base64,kiddlywinks');
          chai.expect(dom.find('.resource-icon[title="adult"] img').attr('src'))
            .to.equal('data:image/png;base64,coffinstuffer');
          chai.expect(get.callCount).to.equal(2);
          done();
        });
      });
    });

  });

});
