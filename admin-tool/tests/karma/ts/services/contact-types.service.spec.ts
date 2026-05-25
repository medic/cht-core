import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { ContactTypesService } from '@admin-tool-services/contact-types.service';
import { SettingsService } from '@admin-tool-services/settings.service';

const mockSettings = (overrides: any = {}) => ({
  contact_types: [
    {
      id: 'district_hospital',
      name_key: 'contact.type.district_hospital',
      parents: [],
    },
    {
      id: 'health_center',
      name_key: 'contact.type.health_center',
      parents: ['district_hospital'],
    },
    {
      id: 'clinic',
      name_key: 'contact.type.clinic',
      parents: ['health_center'],
    },
    {
      id: 'person',
      name_key: 'contact.type.person',
      person: true,
      parents: ['clinic'],
    },
  ],
  ...overrides,
});

describe('ContactTypesService', () => {
  let service: ContactTypesService;
  let settingsService: any;

  beforeEach(() => {
    settingsService = { get: sinon.stub().resolves(mockSettings()) };

    TestBed.configureTestingModule({
      providers: [
        ContactTypesService,
        { provide: SettingsService, useValue: settingsService },
      ],
    });

    service = TestBed.inject(ContactTypesService);
  });

  afterEach(() => sinon.restore());

  // --- ZERO ---
  describe('Zero', () => {
    it('should return empty array when no contact_types are configured', async () => {
      settingsService.get.resolves({});
      const result = await service.getAll();
      expect(result).to.deep.equal([]);
    });

    it('should return empty array from getPlaceTypes when no types configured', async () => {
      settingsService.get.resolves({});
      const result = await service.getPlaceTypes();
      expect(result).to.deep.equal([]);
    });

    it('should return empty array from getPersonTypes when no types configured', async () => {
      settingsService.get.resolves({});
      const result = await service.getPersonTypes();
      expect(result).to.deep.equal([]);
    });

    it('should return undefined from get() when id does not exist', async () => {
      const result = await service.get('nonexistent');
      expect(result).to.be.undefined;
    });
  });

  // --- ONE ---
  describe('One', () => {
    it('should return a single place type', async () => {
      settingsService.get.resolves(
        mockSettings({
          contact_types: [
            {
              id: 'district_hospital',
              name_key: 'contact.type.district_hospital',
              parents: [],
            },
          ],
        }),
      );

      const result = await service.getPlaceTypes();
      expect(result.length).to.equal(1);
      expect(result[0].id).to.equal('district_hospital');
    });

    it('should return a single person type', async () => {
      settingsService.get.resolves(
        mockSettings({
          contact_types: [
            {
              id: 'person',
              name_key: 'contact.type.person',
              person: true,
              parents: [],
            },
          ],
        }),
      );

      const result = await service.getPersonTypes();
      expect(result.length).to.equal(1);
      expect(result[0].id).to.equal('person');
    });

    it('should find a type by id', async () => {
      const result = await service.get('clinic');
      expect(result).to.not.be.undefined;
      expect(result!.id).to.equal('clinic');
    });
  });

  // --- MANY ---
  describe('Many', () => {
    it('should return all configured contact types', async () => {
      const result = await service.getAll();
      expect(result.length).to.equal(4);
    });

    it('should return only place types — no person types', async () => {
      const result = await service.getPlaceTypes();
      expect(result.every((t) => !t.person)).to.equal(true);
    });

    it('should return only person types — no place types', async () => {
      const result = await service.getPersonTypes();
      expect(result.every((t) => t.person === true)).to.equal(true);
    });

    it('should return multiple place types when configured', async () => {
      const result = await service.getPlaceTypes();
      expect(result.length).to.equal(3);
      const ids = result.map((t) => t.id);
      expect(ids).to.include('district_hospital');
      expect(ids).to.include('health_center');
      expect(ids).to.include('clinic');
    });
  });

  // --- BOUNDARIES ---
  describe('Boundaries', () => {
    it('should return false from isSameContactType for empty array', () => {
      const result = service.isSameContactType([]);
      expect(result).to.equal(false);
    });

    it('should return true from isSameContactType when all places share the same type', () => {
      const places = [
        { type: 'contact', contact_type: 'clinic' },
        { type: 'contact', contact_type: 'clinic' },
      ];
      const result = service.isSameContactType(places);
      expect(result).to.equal(true);
    });

    it('should return false from isSameContactType when places have different types', () => {
      const places = [
        { type: 'contact', contact_type: 'clinic' },
        { type: 'contact', contact_type: 'health_center' },
      ];
      const result = service.isSameContactType(places);
      expect(result).to.equal(false);
    });

    it('should return true for hardcoded legacy types', () => {
      expect(service.isHardcodedType('person')).to.equal(true);
      expect(service.isHardcodedType('clinic')).to.equal(true);
      expect(service.isHardcodedType('health_center')).to.equal(true);
      expect(service.isHardcodedType('district_hospital')).to.equal(true);
    });

    it('should return false for non-hardcoded types', () => {
      expect(service.isHardcodedType('custom_type')).to.equal(false);
    });
  });

  // --- INTERFACE ---
  describe('Interface', () => {
    it('should call settingsService.get for getAll', async () => {
      await service.getAll();
      expect(settingsService.get.callCount).to.equal(1);
    });

    it('should call settingsService.get for getPlaceTypes', async () => {
      await service.getPlaceTypes();
      expect(settingsService.get.callCount).to.equal(1);
    });

    it('should call settingsService.get for getPersonTypes', async () => {
      await service.getPersonTypes();
      expect(settingsService.get.callCount).to.equal(1);
    });

    it('should call settingsService.get for get(id)', async () => {
      await service.get('clinic');
      expect(settingsService.get.callCount).to.equal(1);
    });

    it('isHardcodedType should not call settingsService.get', () => {
      service.isHardcodedType('person');
      expect(settingsService.get.callCount).to.equal(0);
    });

    it('isSameContactType should not call settingsService.get', () => {
      service.isSameContactType([]);
      expect(settingsService.get.callCount).to.equal(0);
    });
  });

  // --- EXCEPTIONS ---
  describe('Exceptions', () => {
    it('should propagate error when settingsService.get fails in getAll', async () => {
      settingsService.get.rejects(new Error('Settings unavailable'));
      try {
        await service.getAll();
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.message).to.equal('Settings unavailable');
      }
    });

    it('should propagate error when settingsService.get fails in getPlaceTypes', async () => {
      settingsService.get.rejects(new Error('Settings unavailable'));
      try {
        await service.getPlaceTypes();
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.message).to.equal('Settings unavailable');
      }
    });

    it('should propagate error when settingsService.get fails in getPersonTypes', async () => {
      settingsService.get.rejects(new Error('Settings unavailable'));
      try {
        await service.getPersonTypes();
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.message).to.equal('Settings unavailable');
      }
    });
  });

  // --- SCENARIOS ---
  describe('Scenarios', () => {
    it('should correctly separate place and person types from a mixed config', async () => {
      const placeTypes = await service.getPlaceTypes();
      const personTypes = await service.getPersonTypes();

      expect(placeTypes.map((t) => t.id)).to.not.include('person');
      expect(personTypes.map((t) => t.id)).to.not.include('district_hospital');
      expect(personTypes.map((t) => t.id)).to.not.include('health_center');
      expect(personTypes.map((t) => t.id)).to.not.include('clinic');
    });

    it('should find a type by id that exists in the full type list', async () => {
      const all = await service.getAll();
      const found = await service.get('health_center');

      expect(found).to.not.be.undefined;
      expect(all.map((t) => t.id)).to.include(found!.id);
    });
  });
});
