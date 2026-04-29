import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { ResourcesService } from '@admin-tool-services/resources.service';
import { DbService } from '@admin-tool-services/db.service';
import { ResourcesDoc } from '@admin-tool-modules/resources-interfaces';

describe('ResourcesService', () => {
  let service: ResourcesService;
  let dbService;

  const mockResourcesDoc: ResourcesDoc = {
    _id: 'resources',
    resources: {
      'icon-death-general': 'icon-death-general.png',
      'icon-pregnancy': 'icon-pregnancy.svg',
    },
    _attachments: {
      'icon-death-general.png': {
        content_type: 'image/png',
        data: btoa('png-content'),
      },
      'icon-pregnancy.svg': {
        content_type: 'image/svg+xml',
        data: btoa('<svg>test</svg>'),
      },
    },
  };

  beforeEach(() => {
    dbService = {
      get: sinon.stub().returns({
        get: sinon.stub().resolves(mockResourcesDoc),
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
      ],
    });

    service = TestBed.inject(ResourcesService);
  });

  afterEach(() => sinon.restore());

  describe('getResources', () => {
    it('should call db.get with correct document id', async () => {
      await service.getResources();
      expect(dbService.get().get.calledWith('resources', { attachments: true })).to.be.true;
    });

    it('should return the resources doc', async () => {
      const result = await service.getResources();
      expect(result._id).to.equal('resources');
    });

    it('should return resources map', async () => {
      const result = await service.getResources();
      expect(result.resources).to.deep.equal(mockResourcesDoc.resources);
    });

    it('should propagate error if db.get fails', async () => {
      dbService.get().get.rejects(new Error('error'));
      try {
        await service.getResources();
        expect.fail('should have thrown');
      } catch (error: any) {
        expect(error.message).to.equal('error');
      }
    });
  });
  describe('getIconContent', () => {
    it('should return data URI for PNG icon', () => {
      const result = service.getIconContent('icon-death-general', mockResourcesDoc);
      expect(result.isSvg).to.be.false;
      expect(result.content).to.equal(`data:image/png;base64,${btoa('png-content')}`);
    });

    it('should return inline svg for SVG icon', () => {
      const result = service.getIconContent('icon-pregnancy', mockResourcesDoc);
      expect(result.isSvg).to.be.true;
      expect(result.content).to.equal('<svg>test</svg>');
    });

    it('should return empty content if icon name is empty', () => {
      const result = service.getIconContent('', mockResourcesDoc);
      expect(result.content).to.equal('');
      expect(result.isSvg).to.be.false;
    });

    it('should return empty content if icon does not exist in resources map', () => {
      const result = service.getIconContent('icon-unknown', mockResourcesDoc);
      expect(result.content).to.equal('');
      expect(result.isSvg).to.be.false;
    });

    it('should return empty content if attachment has no data', () => {
      const docWithoutData: ResourcesDoc = {
        ...mockResourcesDoc,
        _attachments: {
          'icon-death-general.png': { content_type: 'image/png' }
        }
      };
      const result = service.getIconContent('icon-death-general', docWithoutData);
      expect(result.content).to.equal('');
      expect(result.isSvg).to.be.false;
    });

    it('should return empty content if resources map is empty', () => {
      const emptyDoc: ResourcesDoc = {
        _id: 'resources',
        resources: {},
        _attachments: {}
      };
      const result = service.getIconContent('icon-death-general', emptyDoc);
      expect(result.content).to.equal('');
      expect(result.isSvg).to.be.false;
    });
  });
});
