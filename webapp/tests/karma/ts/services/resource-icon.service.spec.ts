import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { ResourceIconsService } from '@mm-services/resource-icons.service';
import { DbService } from '@mm-services/db.service';
import { ChangesService } from '@mm-services/changes.service';

describe('ResourceIcons service', () => {
  let get;
  let Changes;

  const getService = () => {
    return TestBed.inject(ResourceIconsService);
  };

  beforeEach(() => {
    get = sinon.stub().resolves();
    Changes = sinon.stub();

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: { get: () => ({ get }) } },
        { provide: ChangesService, useValue: { subscribe: Changes } },
      ],
    });
  });

  afterEach(() => {
    sinon.restore();
  });


  describe('getImg function', () => {

    it('returns empty string when given no name', () => {
      const service = getService();
      const actual = service.getImg();
      expect(actual).to.equal('');
    });

    it('returns empty string when no doc yet', () => {
      const service = getService();
      const actual = service.getImg('delivery', 'resources');
      expect(actual).to.equal('<span class="resource-icon" title="delivery" >&nbsp</span>');
    });

    it('should return empty string when no doc yet with placeholder', () => {
      const service = getService();
      const actual = service.getImg('delivery', 'resources', 'fa-test');
      const expected = '<span class="resource-icon" title="delivery" data-fa-placeholder="fa-test">&nbsp</span>';
      expect(actual).to.equal(expected);
    });

    it('returns img when resources doc already cached', fakeAsync(() => {
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
      const service = getService();
      tick();
      const actual = service.getImg('child', 'resources');
      const expected =
        '<span class="resource-icon" title="child" >' +
        '<img src="data:image/png;base64,kiddlywinks" />' +
        '</span>';
      expect(actual).to.equal(expected);
    }));

    it('should return nothing when resources doc already cached and image doesnt exist', fakeAsync(() => {
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
      const service = getService();
      tick();
      const actual = service.getImg('other', 'resources');
      const expected = '<span class="resource-icon" title="other" ></span>';
      expect(actual).to.equal(expected);
    }));

    it('should return placeholder when already cached and image doesnt exist, with placeholder', fakeAsync(() => {
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
      const service = getService();
      tick();
      const actual = service.getImg('other', 'resources', 'fa-test');
      const expected = '<span class="resource-icon" title="other" data-fa-placeholder="fa-test">' +
        '<span class="fa fa-test"/>' +
        '</span>';
      expect(actual).to.equal(expected);
    }));

    it('returns inline svg for svg images', fakeAsync(() => {
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
      const service = getService();
      tick();
      const actual = service.getImg('mother', 'resources');
      const expected = '<span class="resource-icon" title="mother" >' + data + '</span>';
      expect(actual).to.equal(expected);
    }));
  });

  describe('replacePlaceholders function', () => {

    it('sets src for given element', fakeAsync(() => {
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
      const service = getService();
      const dom = $('<ul>' +
        '<li><img class="resource-icon" title="child"/></li>' +
        '<li><img class="resource-icon" title="adult"/></li>' +
        '</ul>');
      service.replacePlaceholders(dom);
      tick();
      expect(dom.find('.resource-icon[title="child"] img').attr('src'))
        .to.equal('data:image/png;base64,kiddlywinks');
      expect(dom.find('.resource-icon[title="adult"] img').attr('src'))
        .to.equal(undefined);
    }));

    it('should keep the placeholder', fakeAsync(() => {
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
      const service = getService();
      tick();
      const dom = $('<ul>' +
        '<li><img class="resource-icon" title="child" data-fa-placeholder="fa-child"/></li>' +
        '<li><img class="resource-icon" title="adult" data-fa-placeholder="fa-adult"/></li>' +
        '</ul>');
      service.replacePlaceholders(dom);
      tick();
      const child = dom.find('.resource-icon[title="child"]');
      expect(child.find('img').attr('src')).to.equal('data:image/png;base64,kiddlywinks');
      expect(child.data('faPlaceholder')).to.equal('fa-child');

      const adult = dom.find('.resource-icon[title="adult"]');
      expect(adult.find('img').attr('src')).to.equal(undefined);
      expect(adult.find('span').attr('class')).to.equal('fa fa-adult');
      expect(adult.data('faPlaceholder')).to.equal('fa-adult');
    }));

    it('updates src after db change', fakeAsync(() => {
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
      const service = getService();
      tick();
      const dom = $('<ul>' +
        '<li><img class="resource-icon" title="child"/></li>' +
        '<li><img class="resource-icon" title="adult"/></li>' +
        '</ul>');
      service.replacePlaceholders(dom);
      tick();
      expect(dom.find('.resource-icon[title="child"] img').attr('src'))
        .to.equal('data:image/png;base64,kiddlywinks');
      expect(dom.find('.resource-icon[title="adult"] img').attr('src'))
        .to.equal(undefined);

      Changes.args[0][0].callback({ id: 'resources' }); // invoke the changes listener
      service.replacePlaceholders(dom);
      tick();
      expect(dom.find('.resource-icon[title="child"] img').attr('src'))
        .to.equal('data:image/png;base64,kiddlywinks');
      expect(dom.find('.resource-icon[title="adult"] img').attr('src'))
        .to.equal('data:image/png;base64,coffinstuffer');
      expect(get.callCount).to.equal(4);
    }));

    it('updates src after db change with placeholders', fakeAsync(() => {
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
      const service = getService();
      const dom = $('<ul>' +
        '<li><img class="resource-icon" title="child" data-fa-placeholder="fa-child"/></li>' +
        '<li><img class="resource-icon" title="adult" data-fa-placeholder="fa-adult"/></li>' +
        '</ul>');
      service.replacePlaceholders(dom);
      tick();
      let child = dom.find('.resource-icon[title="child"]');
      expect(child.find('img').attr('src')).to.equal('data:image/png;base64,kiddlywinks');
      expect(child.data('faPlaceholder')).to.equal('fa-child');

      let adult = dom.find('.resource-icon[title="adult"]');
      expect(adult.find('img').attr('src')).to.equal(undefined);
      expect(adult.find('span').attr('class')).to.equal('fa fa-adult');
      expect(adult.data('faPlaceholder')).to.equal('fa-adult');

      Changes.args[0][0].callback({ id: 'resources' }); // invoke the changes listener
      service.replacePlaceholders(dom);
      tick();
      child = dom.find('.resource-icon[title="child"]');
      expect(child.find('img').attr('src')).to.equal('data:image/png;base64,kiddlywinks');
      expect(child.data('faPlaceholder')).to.equal('fa-child');

      adult = dom.find('.resource-icon[title="adult"]');
      expect(adult.find('img').attr('src')).to.equal('data:image/png;base64,coffinstuffer');
      expect(adult.data('faPlaceholder')).to.equal('fa-adult');

      expect(get.callCount).to.equal(4);

      Changes.args[0][0].callback({ id: 'resources' }); // invoke the changes listener again
      service.replacePlaceholders(dom);
      tick();
      child = dom.find('.resource-icon[title="child"]');
      expect(child.find('img').attr('src')).to.equal('data:image/png;base64,magicitem');
      expect(child.data('faPlaceholder')).to.equal('fa-child');

      adult = dom.find('.resource-icon[title="adult"]');
      expect(adult.find('img').attr('src')).to.equal(undefined);
      expect(adult.find('span').attr('class')).to.equal('fa fa-adult');
      expect(adult.data('faPlaceholder')).to.equal('fa-adult');
    }));
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

      const service = getService();
      return service.getDocResources('thedoc').then(result => {
        expect(result).to.have.members(['one', 'two', 'three']);
        expect(get.callCount).to.equal(4); // initializing the service does 3 calls
        expect(get.args[3]).to.deep.equal(['thedoc']);
      });
    });

    it('should throw on error', () => {
      get.rejects({ err: 'omg' });
      const service = getService();
      return service
        .getDocResources('id')
        .then(() => assert.fail('Should have thrown'))
        .catch(err => expect(err).to.deep.equal({ err: 'omg' }));
    });
  });
});
