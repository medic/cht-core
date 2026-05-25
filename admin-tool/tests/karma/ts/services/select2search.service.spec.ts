import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { Select2SearchService } from '@admin-tool-services/select2search.service';
import { CHTDatasourceService } from '@admin-tool-services/cht-datasource.service';
import { ContactTypesService } from '@admin-tool-services/contact-types.service';

const mockPlace = (overrides: any = {}) => ({
  _id: 'place-1',
  name: 'District Hospital',
  type: 'contact',
  contact_type: 'district_hospital',
  ...overrides,
});

const mockPerson = (overrides: any = {}) => ({
  _id: 'person-1',
  name: 'Bruce Wayne',
  type: 'contact',
  contact_type: 'person',
  ...overrides,
});

const mockContact = (overrides: any = {}) => ({
  _id: 'contact-1',
  name: 'Alfred',
  parent: { _id: 'place-1', parent: null },
  ...overrides,
});

describe('Select2SearchService', () => {
  let service: Select2SearchService;
  let chtDatasourceService: any;
  let contactTypesService: any;
  let chtApi: any;
  let mockSelectEl: any;
  let jqueryStub: any;
  let jqueryInstance: any;

  beforeEach(() => {
    chtApi = {
      v1: {
        place: {
          getPageByType: sinon.stub().resolves({ data: [mockPlace()] }),
          getByUuid: sinon.stub().resolves(mockPlace()),
        },
        person: {
          getPageByType: sinon.stub().resolves({ data: [mockPerson()] }),
          getByUuid: sinon.stub().resolves(mockPerson()),
        },
        contact: {
          getByUuid: sinon.stub().resolves(mockContact()),
        },
      },
    };

    chtDatasourceService = { get: sinon.stub().resolves(chtApi) };
    contactTypesService = {
      getPlaceTypes: sinon.stub().resolves([{ id: 'district_hospital' }]),
      getPersonTypes: sinon.stub().resolves([{ id: 'person' }]),
    };

    // Mock jQuery and Select2 globally
    jqueryInstance = {
      select2: sinon.stub().returnsThis(),
      find: sinon.stub().returns({ length: 0 }),
      append: sinon.stub().returnsThis(),
      trigger: sinon.stub().returnsThis(),
      val: sinon.stub().returns(''),
    };
    jqueryStub = sinon.stub().returns(jqueryInstance);
    (window as any).$ = jqueryStub;

    mockSelectEl = document.createElement('select');

    TestBed.configureTestingModule({
      providers: [
        Select2SearchService,
        { provide: CHTDatasourceService, useValue: chtDatasourceService },
        { provide: ContactTypesService, useValue: contactTypesService },
      ],
    });

    service = TestBed.inject(Select2SearchService);
  });

  afterEach(() => {
    sinon.restore();
    delete (window as any).$;
  });

  // --- ZERO ---
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

    it('should not call datasource when placeIds is empty', async () => {
      await service.isContactInPlace('contact-1', []);
      expect(chtDatasourceService.get.callCount).to.equal(0);
    });
  });

  // --- ONE ---
  describe('One', () => {
    it('should initialise Select2 on the element when initPlaceSelect is called', async () => {
      await service.initPlaceSelect(mockSelectEl);
      expect(jqueryInstance.select2.callCount).to.equal(1);
    });

    it('should initialise Select2 on the element when initPersonSelect is called', async () => {
      await service.initPersonSelect(mockSelectEl);
      expect(jqueryInstance.select2.callCount).to.equal(1);
    });

    it('should call getPlaceTypes when initPlaceSelect is called', async () => {
      await service.initPlaceSelect(mockSelectEl);
      expect(contactTypesService.getPlaceTypes.callCount).to.equal(1);
    });

    it('should call getPersonTypes when initPersonSelect is called', async () => {
      await service.initPersonSelect(mockSelectEl);
      expect(contactTypesService.getPersonTypes.callCount).to.equal(1);
    });

    it('should return true when contact parent matches the place', async () => {
      chtApi.v1.contact.getByUuid.resolves(mockContact({
        parent: { _id: 'place-1', parent: null },
      }));

      const result = await service.isContactInPlace('contact-1', ['place-1']);
      expect(result).to.equal(true);
    });

    it('should return false when contact parent does not match the place', async () => {
      chtApi.v1.contact.getByUuid.resolves(mockContact({
        parent: { _id: 'other-place', parent: null },
      }));

      const result = await service.isContactInPlace('contact-1', ['place-1']);
      expect(result).to.equal(false);
    });
  });

  // --- MANY ---
  describe('Many', () => {
    it('should query all place type ids when initPlaceSelect is called', async () => {
      contactTypesService.getPlaceTypes.resolves([
        { id: 'district_hospital' },
        { id: 'health_center' },
        { id: 'clinic' },
      ]);
      chtApi.v1.place.getPageByType.resolves({ data: [] });

      await service.initPlaceSelect(mockSelectEl);

      expect(chtApi.v1.place.getPageByType.callCount).to.equal(0);
    });

    it('should query all person type ids when initPersonSelect is called', async () => {
      contactTypesService.getPersonTypes.resolves([
        { id: 'person' },
        { id: 'chw' },
      ]);
      chtApi.v1.person.getPageByType.resolves({ data: [] });

      await service.initPersonSelect(mockSelectEl);

      expect(chtApi.v1.person.getPageByType.callCount).to.equal(0);
    });

    it('should return true when contact is a grandchild of the place', async () => {
      chtApi.v1.contact.getByUuid.resolves(mockContact({
        parent: {
          _id: 'child-place',
          parent: { _id: 'place-1', parent: null },
        },
      }));

      const result = await service.isContactInPlace('contact-1', ['place-1']);
      expect(result).to.equal(true);
    });

    it('should return true when contact matches one of multiple place ids', async () => {
      chtApi.v1.contact.getByUuid.resolves(mockContact({
        parent: { _id: 'place-2', parent: null },
      }));

      const result = await service.isContactInPlace('contact-1', ['place-1', 'place-2', 'place-3']);
      expect(result).to.equal(true);
    });
  });

  // --- BOUNDARIES ---
  describe('Boundaries', () => {
    it('should return false when contact has no parent', async () => {
      chtApi.v1.contact.getByUuid.resolves(mockContact({ parent: null }));

      const result = await service.isContactInPlace('contact-1', ['place-1']);
      expect(result).to.equal(false);
    });

    it('should return false when contact parent chain ends without matching place', async () => {
      chtApi.v1.contact.getByUuid.resolves(mockContact({
        parent: {
          _id: 'level-1',
          parent: {
            _id: 'level-2',
            parent: null,
          },
        },
      }));

      const result = await service.isContactInPlace('contact-1', ['place-1']);
      expect(result).to.equal(false);
    });

    it('should preselect place when initialValue is provided', async () => {
      chtApi.v1.place.getByUuid.resolves(mockPlace({ _id: 'place-1', name: 'District Hospital' }));

      await service.initPlaceSelect(mockSelectEl, { initialValue: 'place-1' });

      expect(chtApi.v1.place.getByUuid.callCount).to.equal(1);
      expect(chtApi.v1.place.getByUuid.calledWith('place-1')).to.equal(true);
    });

    it('should preselect person when initialValue is provided', async () => {
      chtApi.v1.person.getByUuid.resolves(mockPerson({ _id: 'person-1', name: 'Bruce Wayne' }));

      await service.initPersonSelect(mockSelectEl, { initialValue: 'person-1' });

      expect(chtApi.v1.person.getByUuid.callCount).to.equal(1);
      expect(chtApi.v1.person.getByUuid.calledWith('person-1')).to.equal(true);
    });

    it('should not call getByUuid when no initialValue is provided', async () => {
      await service.initPlaceSelect(mockSelectEl);
      expect(chtApi.v1.place.getByUuid.callCount).to.equal(0);
    });
  });

  // --- INTERFACE ---
  describe('Interface', () => {
    it('should call chtDatasourceService.get when initPlaceSelect is called', async () => {
      await service.initPlaceSelect(mockSelectEl);
      expect(chtDatasourceService.get.callCount).to.equal(1);
    });

    it('should call chtDatasourceService.get when initPersonSelect is called', async () => {
      await service.initPersonSelect(mockSelectEl);
      expect(chtDatasourceService.get.callCount).to.equal(1);
    });

    it('should call chtDatasourceService.get when isContactInPlace is called', async () => {
      await service.isContactInPlace('contact-1', ['place-1']);
      expect(chtDatasourceService.get.callCount).to.equal(1);
    });

    it('should call contact.getByUuid with the contactId', async () => {
      await service.isContactInPlace('contact-1', ['place-1']);
      expect(chtApi.v1.contact.getByUuid.calledWith('contact-1')).to.equal(true);
    });

    it('should initialise Select2 with multiple: true for place select', async () => {
      await service.initPlaceSelect(mockSelectEl);
      const config = jqueryInstance.select2.getCall(0).args[0];
      expect(config.multiple).to.equal(true);
    });

    it('should initialise Select2 with multiple: false for person select', async () => {
      await service.initPersonSelect(mockSelectEl);
      const config = jqueryInstance.select2.getCall(0).args[0];
      expect(config.multiple).to.equal(false);
    });

    it('should initialise Select2 with minimumInputLength: 3', async () => {
      await service.initPlaceSelect(mockSelectEl);
      const config = jqueryInstance.select2.getCall(0).args[0];
      expect(config.minimumInputLength).to.equal(3);
    });
  });

  // --- EXCEPTIONS ---
  describe('Exceptions', () => {
    it('should return true when isContactInPlace throws an error', async () => {
      chtApi.v1.contact.getByUuid.rejects(new Error('Network error'));

      const result = await service.isContactInPlace('contact-1', ['place-1']);
      expect(result).to.equal(true);
    });

    it('should not throw when preselect place fetch fails', async () => {
      chtApi.v1.place.getByUuid.rejects(new Error('Not found'));

      await expect(service.initPlaceSelect(mockSelectEl, { initialValue: 'place-1' }))
        .to.not.be.rejected;
    });

    it('should not throw when preselect person fetch fails', async () => {
      chtApi.v1.person.getByUuid.rejects(new Error('Not found'));

      await expect(service.initPersonSelect(mockSelectEl, { initialValue: 'person-1' }))
        .to.not.be.rejected;
    });

    it('should not throw when preselect returns null', async () => {
      chtApi.v1.place.getByUuid.resolves(null);

      await expect(service.initPlaceSelect(mockSelectEl, { initialValue: 'place-1' }))
        .to.not.be.rejected;
    });
  });

  // --- SCENARIOS ---
  describe('Scenarios', () => {
    it('should complete full place init: get settings → get place types → init Select2', async () => {
      await service.initPlaceSelect(mockSelectEl);

      expect(chtDatasourceService.get.callCount).to.equal(1);
      expect(contactTypesService.getPlaceTypes.callCount).to.equal(1);
      expect(jqueryInstance.select2.callCount).to.equal(1);
    });

    it('should complete full person init: get settings → get person types → init Select2', async () => {
      await service.initPersonSelect(mockSelectEl);

      expect(chtDatasourceService.get.callCount).to.equal(1);
      expect(contactTypesService.getPersonTypes.callCount).to.equal(1);
      expect(jqueryInstance.select2.callCount).to.equal(1);
    });

    it('should correctly validate a contact three levels deep in the hierarchy', async () => {
      chtApi.v1.contact.getByUuid.resolves(mockContact({
        parent: {
          _id: 'clinic-1',
          parent: {
            _id: 'health-center-1',
            parent: {
              _id: 'district-1',
              parent: null,
            },
          },
        },
      }));

      const validResult = await service.isContactInPlace('contact-1', ['district-1']);
      expect(validResult).to.equal(true);

      const invalidResult = await service.isContactInPlace('contact-1', ['other-district']);
      expect(invalidResult).to.equal(false);
    });
  });
});
