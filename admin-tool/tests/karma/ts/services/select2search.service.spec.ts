import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon, { SinonStub } from 'sinon';
import { Select2SearchService } from '@admin-tool-services/select2search.service';
import { DbService } from '@admin-tool-services/db.service';
import { ContactTypesService } from '@admin-tool-services/contact-types.service';

interface DbInstanceMock {
  query: SinonStub;
  get: SinonStub;
}

interface DbServiceMock {
  get: SinonStub;
}

const mockPlaceDoc = (overrides: any = {}) => ({
  _id: 'place-1',
  name: 'District Hospital',
  type: 'contact',
  contact_type: 'district_hospital',
  parent: null,
  ...overrides,
});

const mockPersonDoc = (overrides: any = {}) => ({
  _id: 'person-1',
  name: 'Bruce Wayne',
  type: 'contact',
  contact_type: 'person',
  parent: { _id: 'place-1', parent: null },
  ...overrides,
});


describe('Select2SearchService', () => {
  let service: Select2SearchService;
  let dbService: DbServiceMock;
  let dbInstance: DbInstanceMock;
  let contactTypesService: any;
  let mockSelectEl: HTMLSelectElement;
  let jqueryInstance: any;

  beforeEach(() => {
    dbInstance = {
      query: sinon.stub(),
      get: sinon.stub(),
    };
    dbService = { get: sinon.stub().returns(dbInstance) };

    contactTypesService = {
      getPlaceTypes: sinon.stub().resolves([{ id: 'district_hospital' }]),
      getPersonTypes: sinon.stub().resolves([{ id: 'person' }]),
    };

    jqueryInstance = {
      select2: sinon.stub().returnsThis(),
      find: sinon.stub().returns({ length: 0 }),
      append: sinon.stub().returnsThis(),
      trigger: sinon.stub().returnsThis(),
      val: sinon.stub().returns(''),
    };
    (window as any).$ = sinon.stub().returns(jqueryInstance);

    mockSelectEl = document.createElement('select');

    TestBed.configureTestingModule({
      providers: [
        Select2SearchService,
        { provide: DbService, useValue: dbService },
        { provide: ContactTypesService, useValue: contactTypesService },
      ],
    });

    service = TestBed.inject(Select2SearchService);
  });

  afterEach(() => {
    sinon.restore();
    delete (window as any).$;
  });

  describe('Zero', () => {
    it('should return true from isContactInPlace when contactId is empty', async () => {
      const result = await service.isContactInPlace('', ['place-1']);
      expect(result).to.equal(true);
    });

    it('should return true from isContactInPlace when placeIds is empty', async () => {
      const result = await service.isContactInPlace('contact-1', []);
      expect(result).to.equal(true);
    });

    it('should return true from isContactInPlace when both are empty', async () => {
      const result = await service.isContactInPlace('', []);
      expect(result).to.equal(true);
    });

    it('should not call dbService when placeIds is empty', async () => {
      await service.isContactInPlace('contact-1', []);
      expect(dbInstance.get.callCount).to.equal(0);
    });
  });

  describe('One', () => {
    it('should initialise Select2 when initPlaceSelect is called', async () => {
      dbInstance.query.resolves({ rows: [] });
      await service.initPlaceSelect(mockSelectEl);
      expect(jqueryInstance.select2.callCount).to.equal(1);
    });

    it('should initialise Select2 when initPersonSelect is called', async () => {
      dbInstance.query.resolves({ rows: [] });
      await service.initPersonSelect(mockSelectEl);
      expect(jqueryInstance.select2.callCount).to.equal(1);
    });

    it('should call getPlaceTypes when initPlaceSelect is called', async () => {
      dbInstance.query.resolves({ rows: [] });
      await service.initPlaceSelect(mockSelectEl);
      expect(contactTypesService.getPlaceTypes.callCount).to.equal(1);
    });

    it('should call getPersonTypes when initPersonSelect is called', async () => {
      dbInstance.query.resolves({ rows: [] });
      await service.initPersonSelect(mockSelectEl);
      expect(contactTypesService.getPersonTypes.callCount).to.equal(1);
    });

    it('should return true when contact parent matches the place', async () => {
      dbInstance.get.resolves(mockPersonDoc({ parent: { _id: 'place-1', parent: null } }));
      const result = await service.isContactInPlace('person-1', ['place-1']);
      expect(result).to.equal(true);
    });

    it('should return false when contact parent does not match the place', async () => {
      dbInstance.get.resolves(mockPersonDoc({ parent: { _id: 'other-place', parent: null } }));
      const result = await service.isContactInPlace('person-1', ['place-1']);
      expect(result).to.equal(false);
    });
  });

  describe('Many', () => {
    it('should return true when contact is a grandchild of the place', async () => {
      dbInstance.get.resolves(mockPersonDoc({
        parent: {
          _id: 'child-place',
          parent: { _id: 'place-1', parent: null },
        },
      }));
      const result = await service.isContactInPlace('person-1', ['place-1']);
      expect(result).to.equal(true);
    });

    it('should return true when contact matches one of multiple place ids', async () => {
      dbInstance.get.resolves(mockPersonDoc({ parent: { _id: 'place-2', parent: null } }));
      const result = await service.isContactInPlace('person-1', ['place-1', 'place-2', 'place-3']);
      expect(result).to.equal(true);
    });

    it('should query all place type ids when initPlaceSelect is called', async () => {
      contactTypesService.getPlaceTypes.resolves([
        { id: 'district_hospital' },
        { id: 'health_center' },
        { id: 'clinic' },
      ]);
      dbInstance.query.resolves({ rows: [] });
      await service.initPlaceSelect(mockSelectEl);
      expect(contactTypesService.getPlaceTypes.callCount).to.equal(1);
    });
  });

  describe('Boundaries', () => {
    it('should return false when contact has no parent', async () => {
      dbInstance.get.resolves(mockPersonDoc({ parent: null }));
      const result = await service.isContactInPlace('person-1', ['place-1']);
      expect(result).to.equal(false);
    });

    it('should return false when parent chain ends without matching place', async () => {
      dbInstance.get.resolves(mockPersonDoc({
        parent: { _id: 'level-1', parent: { _id: 'level-2', parent: null } },
      }));
      const result = await service.isContactInPlace('person-1', ['place-1']);
      expect(result).to.equal(false);
    });

    it('should preselect when initialValue is provided', async () => {
      dbInstance.query.resolves({ rows: [] });
      dbInstance.get.resolves(mockPlaceDoc());
      await service.initPlaceSelect(mockSelectEl, { initialValue: 'place-1' });
      expect(dbInstance.get.calledWith('place-1')).to.equal(true);
    });

    it('should not call dbInstance.get for preselect when no initialValue provided', async () => {
      dbInstance.query.resolves({ rows: [] });
      await service.initPlaceSelect(mockSelectEl);
      expect(dbInstance.get.callCount).to.equal(0);
    });
  });

  describe('Interface', () => {
    it('should initialise Select2 with multiple: true for place select', async () => {
      dbInstance.query.resolves({ rows: [] });
      await service.initPlaceSelect(mockSelectEl);
      const config = jqueryInstance.select2.getCall(0).args[0];
      expect(config.multiple).to.equal(true);
    });

    it('should initialise Select2 with multiple: false for person select', async () => {
      dbInstance.query.resolves({ rows: [] });
      await service.initPersonSelect(mockSelectEl);
      const config = jqueryInstance.select2.getCall(0).args[0];
      expect(config.multiple).to.equal(false);
    });

    it('should initialise Select2 with minimumInputLength: 3', async () => {
      dbInstance.query.resolves({ rows: [] });
      await service.initPlaceSelect(mockSelectEl);
      const config = jqueryInstance.select2.getCall(0).args[0];
      expect(config.minimumInputLength).to.equal(3);
    });

    it('should call dbService.get to access the database', async () => {
      dbInstance.get.resolves(mockPersonDoc({ parent: { _id: 'place-1', parent: null } }));
      await service.isContactInPlace('person-1', ['place-1']);
      expect(dbService.get.called).to.equal(true);
    });
  });

  describe('Exceptions', () => {
    it('should return true when isContactInPlace throws an error', async () => {
      dbInstance.get.rejects(new Error('Network error'));
      const result = await service.isContactInPlace('person-1', ['place-1']);
      expect(result).to.equal(true);
    });

    it('should not throw when preselect fetch fails', async () => {
      dbInstance.query.resolves({ rows: [] });
      dbInstance.get.rejects(new Error('Not found'));
      await expect(service.initPlaceSelect(mockSelectEl, { initialValue: 'place-1' }))
        .to.not.be.rejected;
    });

    it('should not throw when preselect returns null', async () => {
      dbInstance.query.resolves({ rows: [] });
      dbInstance.get.resolves(null);
      await expect(service.initPlaceSelect(mockSelectEl, { initialValue: 'place-1' }))
        .to.not.be.rejected;
    });
  });

  describe('Scenarios', () => {
    it('should complete full place init: get place types → init Select2', async () => {
      dbInstance.query.resolves({ rows: [] });
      await service.initPlaceSelect(mockSelectEl);
      expect(contactTypesService.getPlaceTypes.callCount).to.equal(1);
      expect(jqueryInstance.select2.callCount).to.equal(1);
    });

    it('should complete full person init: get person types → init Select2', async () => {
      dbInstance.query.resolves({ rows: [] });
      await service.initPersonSelect(mockSelectEl);
      expect(contactTypesService.getPersonTypes.callCount).to.equal(1);
      expect(jqueryInstance.select2.callCount).to.equal(1);
    });

    it('should correctly validate contact three levels deep in hierarchy', async () => {
      dbInstance.get.resolves(mockPersonDoc({
        parent: {
          _id: 'clinic-1',
          parent: { _id: 'health-center-1', parent: { _id: 'district-1', parent: null } },
        },
      }));
      const valid = await service.isContactInPlace('person-1', ['district-1']);
      expect(valid).to.equal(true);
      const invalid = await service.isContactInPlace('person-1', ['other-district']);
      expect(invalid).to.equal(false);
    });
  });
});
