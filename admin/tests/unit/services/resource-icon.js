describe('ResourceIcons service', () => {

  'use strict';

  let get;
  let Changes;
  let injector;

  beforeEach(() => {
    get = sinon.stub().resolves();
    Changes = sinon.stub();
    module('adminApp');
    module(($provide) => {
      $provide.factory('DB', KarmaUtils.mockDB({ get: get }));
      $provide.factory('Changes', () => Changes);
    });
    inject(($injector) => {
      injector = $injector;
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getImg function', () => {

    it('returns empty string when given no name', () => {
      const service = injector.get('ResourceIcons');
      const actual = service.getImg();
      chai.expect(actual).to.equal('');
    });

    it('returns empty string when no doc yet', () => {
      const service = injector.get('ResourceIcons');
      const actual = service.getImg('delivery', 'resources');
      chai.expect(actual).to.equal('<span class="resource-icon" title="delivery" >&nbsp</span>');
    });

    it('should return empty string when no doc yet with placeholder', () => {
      const service = injector.get('ResourceIcons');
      const actual = service.getImg('delivery', 'resources', 'fa-test');
      const expected = '<span class="resource-icon" title="delivery" data-fa-placeholder="fa-test">&nbsp</span>';
      chai.expect(actual).to.equal(expected);
    });

    it('returns img when resources doc already cached', (done) => {
      const resources = {
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
      get.resolves(resources);
      const service = injector.get('ResourceIcons');
      setTimeout(() => {
        const actual = service.getImg('child', 'resources');
        const expected =
          '<span class="resource-icon" title="child" >' +
            '<img src="data:image/png;base64,kiddlywinks" />' +
          '</span>';
        chai.expect(actual).to.equal(expected);
        done();
      });
    });

    it('should return nothing when resources doc already cached and image doesnt exist', (done) => {
      const resources = {
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
      get.resolves(resources);
      const service = injector.get('ResourceIcons');
      setTimeout(() => {
        const actual = service.getImg('other', 'resources');
        const expected = '<span class="resource-icon" title="other" ></span>';
        chai.expect(actual).to.equal(expected);
        done();
      });
    });

    it('should return placeholder when already cached and image doesnt exist, with placeholder', (done) => {
      const resources = {
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
      get.resolves(resources);
      const service = injector.get('ResourceIcons');
      setTimeout(() => {
        const actual = service.getImg('other', 'resources', 'fa-test');
        const expected = '<span class="resource-icon" title="other" data-fa-placeholder="fa-test">' +
                         '<span class="fa fa-test"/>' +
                         '</span>';
        chai.expect(actual).to.equal(expected);
        done();
      });
    });

    it('returns inline svg for svg images', (done) => {
      const data = `<svg  xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                    <rect x="10" y="10" height="100" width="100" style="stroke:#ff0000; fill: #0000ff"/>
                  </svg>`;
      const resources = {
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
      get.resolves(resources);
      const service = injector.get('ResourceIcons');
      setTimeout(() => {
        const actual = service.getImg('mother', 'resources');
        const expected = '<span class="resource-icon" title="mother" >' + data + '</span>';
        chai.expect(actual).to.equal(expected);
        done();
      });
    });
  });

  describe('replacePlaceholders function', () => {

    it('sets src for given element', (done) => {
      const resources = {
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
      get.resolves(resources);
      const service = injector.get('ResourceIcons');
      const dom = $('<ul>' +
                    '<li><img class="resource-icon" title="child"/></li>' +
                    '<li><img class="resource-icon" title="adult"/></li>' +
                  '</ul>');
      service.replacePlaceholders(dom);
      setTimeout(() => {
        chai.expect(dom.find('.resource-icon[title="child"] img').attr('src'))
          .to.equal('data:image/png;base64,kiddlywinks');
        chai.expect(dom.find('.resource-icon[title="adult"] img').attr('src'))
          .to.equal(undefined);
        done();
      });
    });

    it('should keep the placeholder', (done) => {
      const resources = {
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
      get.resolves(resources);
      const service = injector.get('ResourceIcons');
      const dom = $('<ul>' +
                    '<li><img class="resource-icon" title="child" data-fa-placeholder="fa-child"/></li>' +
                    '<li><img class="resource-icon" title="adult" data-fa-placeholder="fa-adult"/></li>' +
                    '</ul>');
      service.replacePlaceholders(dom);
      setTimeout(() => {
        const child = dom.find('.resource-icon[title="child"]');
        chai.expect(child.find('img').attr('src')).to.equal('data:image/png;base64,kiddlywinks');
        chai.expect(child.data('faPlaceholder')).to.equal('fa-child');

        const adult = dom.find('.resource-icon[title="adult"]');
        chai.expect(adult.find('img').attr('src')).to.equal(undefined);
        chai.expect(adult.find('span').attr('class')).to.equal('fa fa-adult');
        chai.expect(adult.data('faPlaceholder')).to.equal('fa-adult');
        done();
      });
    });

    it('updates src after db change', (done) => {
      const resources1 = {
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
      const resources2 = {
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
        .onCall(0).resolves()
        .onCall(1).resolves()
        .onCall(2).resolves(resources1)
        .onCall(3).resolves(resources2);
      const service = injector.get('ResourceIcons');
      const dom = $('<ul>' +
                  '<li><img class="resource-icon" title="child"/></li>' +
                  '<li><img class="resource-icon" title="adult"/></li>' +
                '</ul>');
      service.replacePlaceholders(dom);
      setTimeout(() => {
        chai.expect(dom.find('.resource-icon[title="child"] img').attr('src'))
          .to.equal('data:image/png;base64,kiddlywinks');
        chai.expect(dom.find('.resource-icon[title="adult"] img').attr('src'))
          .to.equal(undefined);

        Changes.args[0][0].callback({ id: 'resources' }); // invoke the changes listener
        service.replacePlaceholders(dom);
        setTimeout(() => {
          chai.expect(dom.find('.resource-icon[title="child"] img').attr('src'))
            .to.equal('data:image/png;base64,kiddlywinks');
          chai.expect(dom.find('.resource-icon[title="adult"] img').attr('src'))
            .to.equal('data:image/png;base64,coffinstuffer');
          chai.expect(get.callCount).to.equal(4);
          done();
        });
      });
    });

    it('updates src after db change with placeholders', (done) => {
      const resources1 = {
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
      const resources2 = {
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
      const resources3 = {
        resources: {
          child: 'child.png',
        },
        _attachments: {
          'child.png': {
            content_type: 'image/png',
            data: 'magicitem'
          },
        }
      };
      get
        .onCall(0).resolves()
        .onCall(1).resolves()
        .onCall(2).resolves(resources1)
        .onCall(3).resolves(resources2)
        .onCall(4).resolves(resources3);
      const service = injector.get('ResourceIcons');
      const dom = $('<ul>' +
                    '<li><img class="resource-icon" title="child" data-fa-placeholder="fa-child"/></li>' +
                    '<li><img class="resource-icon" title="adult" data-fa-placeholder="fa-adult"/></li>' +
                    '</ul>');
      service.replacePlaceholders(dom);
      setTimeout(() => {
        const child = dom.find('.resource-icon[title="child"]');
        chai.expect(child.find('img').attr('src')).to.equal('data:image/png;base64,kiddlywinks');
        chai.expect(child.data('faPlaceholder')).to.equal('fa-child');

        const adult = dom.find('.resource-icon[title="adult"]');
        chai.expect(adult.find('img').attr('src')).to.equal(undefined);
        chai.expect(adult.find('span').attr('class')).to.equal('fa fa-adult');
        chai.expect(adult.data('faPlaceholder')).to.equal('fa-adult');

        Changes.args[0][0].callback({ id: 'resources' }); // invoke the changes listener
        service.replacePlaceholders(dom);
        setTimeout(() => {
          const child = dom.find('.resource-icon[title="child"]');
          chai.expect(child.find('img').attr('src')).to.equal('data:image/png;base64,kiddlywinks');
          chai.expect(child.data('faPlaceholder')).to.equal('fa-child');

          const adult = dom.find('.resource-icon[title="adult"]');
          chai.expect(adult.find('img').attr('src')).to.equal('data:image/png;base64,coffinstuffer');
          chai.expect(adult.data('faPlaceholder')).to.equal('fa-adult');

          chai.expect(get.callCount).to.equal(4);

          Changes.args[0][0].callback({ id: 'resources' }); // invoke the changes listener again
          service.replacePlaceholders(dom);
          setTimeout(() => {
            const child = dom.find('.resource-icon[title="child"]');
            chai.expect(child.find('img').attr('src')).to.equal('data:image/png;base64,magicitem');
            chai.expect(child.data('faPlaceholder')).to.equal('fa-child');

            const adult = dom.find('.resource-icon[title="adult"]');
            chai.expect(adult.find('img').attr('src')).to.equal(undefined);
            chai.expect(adult.find('span').attr('class')).to.equal('fa fa-adult');
            chai.expect(adult.data('faPlaceholder')).to.equal('fa-adult');

            done();
          });
        });
      });
    });

  });

  describe('getDocResources', () => {
    it('should return resources by name', () => {
      get.resolves({
        _id: 'thedoc',
        _rev: 'therev',
        resources: {
          one: 'one.png',
          two: 'two.png',
          three: 'three.png',
        },
        _attachments: {
          'one.png': {},
          'tho.png': {},
          'three.png': {},
        },
      });

      const service = injector.get('ResourceIcons');
      return service.getDocResources('thedoc').then(result => {
        chai.expect(result).to.have.members(['one', 'two', 'three']);
        chai.expect(get.callCount).to.equal(4); // initializing the service does 3 calls
        chai.expect(get.args[3]).to.deep.equal(['thedoc']);
      });
    });

    it('should throw on error', () => {
      get.rejects({ err: 'omg' });
      const service = injector.get('ResourceIcons');
      return service
        .getDocResources('id')
        .then(() => chai.assert.fail('Should have thrown'))
        .catch(err => chai.expect(err).to.deep.equal({ err: 'omg' }));
    });
  });

  describe('getDocResourcesByMimeType', () => {
    it('should only return resources with requested mimetype', () => {
      get.resolves({
        _id: 'doc',
        _rev: 'doc',
        resources: {
          one: 'one.png',
          two: 'two.svg',
          three: 'three.fakepng', // actually just a png
          four: 'four.whatever', // secretly a jpg
          five: 'five.jpg', // secretly a svg
        },
        _attachments: {
          'one.png': { content_type: 'image/png' },
          'two.svg': { content_type: 'image/svg+xml' },
          'three.fakepng': { content_type: 'image/png' },
          'four.whatever': { content_type: 'image/jpeg' },
          'five.jpg': { content_type: 'image/svg+xml' },
        },
      });
      const service = injector.get('ResourceIcons');

      return Promise
        .all([
          service.getDocResourcesByMimeType('doc', 'image/png'),
          service.getDocResourcesByMimeType('doc', 'image/svg+xml'),
          service.getDocResourcesByMimeType('doc', 'image/jpeg'),
          service.getDocResourcesByMimeType('doc', 'something/else'),
          service.getDocResourcesByMimeType('doc'),
        ])
        .then(([ pngs, svgs, jpegs, somethingElses, noMime ]) => {
          chai.expect(get.callCount).to.equal(8); // initializing the service does 3 calls
          chai.expect(get.args.slice(3, 8)).to.deep.equal([['doc'], ['doc'], ['doc'], ['doc'], ['doc']]);
          chai.expect(pngs).to.have.members(['one', 'three']);
          chai.expect(svgs).to.have.members(['two', 'five']);
          chai.expect(jpegs).to.have.members(['four']);
          chai.expect(somethingElses).to.deep.equal([]);
          chai.expect(noMime).to.deep.equal([]);
        });
    });

    it('should return nothing when no resources', () => {
      const noResources = {
        _id: 'doc',
        _rev: 'doc',
        somefield: 'aaa',
        _attachments: { a: { content_type: 'xml' }, b: { content_type: 'png' }, c: { content_type: 'jpg' } },
      };
      const noAttachments = {
        _id: 'doc',
        _rev: 'doc',
        resources: { a: 'a.jpg', b: 'b.png', c: 'c.xml' }
      };

      get.onCall(3).resolves(noResources);
      get.onCall(4).resolves(noAttachments);
      const service = injector.get('ResourceIcons');

      return Promise
        .all([
          service.getDocResourcesByMimeType('doc', 'xml'),
          service.getDocResourcesByMimeType('doc', 'jpg'),
        ])
        .then(([ noResourcesResult, noAttachmentsResult ]) => {
          chai.expect(noResourcesResult).to.deep.equal([]);
          chai.expect(noAttachmentsResult).to.deep.equal([]);
        });
    });

    it('should throw on error', () => {
      get.rejects({ err: 'omg' });
      const service = injector.get('ResourceIcons');
      return service
        .getDocResourcesByMimeType('id', 'something')
        .then(() => chai.assert.fail('Should have thrown'))
        .catch(err => chai.expect(err).to.deep.equal({ err: 'omg' }));
    });
  });
});
