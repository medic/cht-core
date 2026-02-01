import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { assert, expect } from 'chai';

import { ContactTypesService } from '@mm-services/contact-types.service';
import { SettingsService } from '@mm-services/settings.service';
import { DOC_IDS } from '@medic/constants';


describe('ContactTypes service', () => {
  let service:ContactTypesService;
  let Settings;

  const HARDCODED_TYPES = [
    'district_hospital',
    DOC_IDS.HEALTH_CENTER,
    'clinic',
    'person'
  ];

  beforeEach(() => {
    Settings = sinon.stub();

    TestBed.configureTestingModule({
      providers: [
        { provide: SettingsService, useValue: { get: Settings } },
      ]
    });
    service = TestBed.inject(ContactTypesService);
  });

  afterEach(() => sinon.restore());


  describe('get', () => {

    it('returns undefined when no config', () => {
      Settings.resolves({});
      return service.get('nothing').then(type => {
        assert.isUndefined(type);
      });
    });

    it('returns undefined when no match', () => {
      const types = [ { id: 'something' } ];
      Settings.resolves({ contact_types: types });
      return service.get('nothing').then(type => {
        assert.isUndefined(type);
      });
    });

    it('returns type when match', () => {
      const types = [
        { id: 'nothing' },
        { id: 'something' },
      ];
      Settings.resolves({ contact_types: types });
      return service.get('something').then(type => {
        expect(type?.id).to.equal('something');
      });
    });
  });

  describe('getAll', () => {

    it('returns an empty array when no config', () => {
      Settings.resolves({});
      return service.getAll().then(config => {
        expect(config).to.deep.equal([]);
      });
    });

    it('returns the types array when configured', () => {
      const types = [
        { id: 'nothing' },
        { id: 'something' },
      ];
      Settings.resolves({ contact_types: types });
      return service.getAll().then(config => {
        expect(config).to.deep.equal([
          { id: 'nothing' },
          { id: 'something' },
        ]);
      });
    });

  });

  describe('isHardcodedType', () => {

    HARDCODED_TYPES.forEach(type => {
      it(`returns true for ${type}`, () => {
        expect(service.isHardcodedType(type)).to.equal(true);
      });
    });

    it('returns false for contact type', () => {
      expect(service.isHardcodedType('contact')).to.equal(false);
    });

    it('returns false for random type', () => {
      expect(service.isHardcodedType('xyz')).to.equal(false);
    });

  });


  describe('includes', () => {

    HARDCODED_TYPES.forEach(type => {
      it(`returns true for ${type}`, () => {
        expect(service.includes({ type: type })).to.equal(true);
      });
    });

    it('returns true for contact type', () => {
      expect(service.includes({ type: 'contact' })).to.equal(true);
    });

    it('returns false for random type', () => {
      expect(service.includes({ type: 'xyz' })).to.equal(false);
    });

    it('returns false for unknown type', () => {
      expect(service.includes({ })).to.equal(false);
    });

    it('returns false for null doc', () => {
      expect(service.includes()).to.equal(false);
    });

  });

  describe('getChildren', () => {

    const types = [
      { id: 'region' },
      { id: 'district', parents: [] },
      { id: 'suburb',   parents: [ 'region' ] },
      { id: 'family',   parents: [ 'suburb' ] },
      { id: 'chp',      parents: [ 'region', 'suburb' ] },
      { id: 'patient',  parents: [ 'family' ] },
    ];

    it('gets all top level types when no parent given', () => {
      Settings.resolves({ contact_types: types });
      return service.getChildren().then(children => {
        const ids = children.map(child => child.id);
        expect(ids).to.deep.equal([ 'region', 'district' ]);
      });
    });

    it('gets all the possible children for the given type', () => {
      Settings.resolves({ contact_types: types });
      return service.getChildren('suburb').then(children => {
        const ids = children.map(child => child.id);
        expect(ids).to.deep.equal([ 'family', 'chp' ]);
      });
    });

    it('returns empty array if no match', () => {
      Settings.resolves({ contact_types: types });
      return service.getChildren('district').then(children => {
        expect(children).to.deep.equal([ ]);
      });
    });

  });

  describe('getPlaceTypes', () => {

    const types = [
      { id: 'region' },
      { id: 'family',  person: false },
      { id: 'chp',     person: true },
      { id: 'patient', person: true },
    ];

    it('returns all place types', () => {
      Settings.resolves({ contact_types: types });
      return service.getPlaceTypes().then(places => {
        const ids = places.map(place => place.id);
        expect(ids).to.deep.equal([ 'region', 'family' ]);
      });
    });

  });

  describe('getPersonTypes', () => {

    const types = [
      { id: 'region' },
      { id: 'family',  person: false },
      { id: 'chp',     person: true },
      { id: 'patient', person: true },
    ];

    it('returns all person types', () => {
      Settings.resolves({ contact_types: types });
      return service.getPersonTypes().then(persons => {
        const ids = persons.map(person => person.id);
        expect(ids).to.deep.equal([ 'chp', 'patient' ]);
      });
    });

  });

  describe('getTypeId', () => {
    it('should return the type id of the provided contact', () => {
      expect(service.getTypeId({ type: 'person' })).to.equal('person');
      expect(service.getTypeId({ type: 'clinic' })).to.equal('clinic');
      expect(service.getTypeId({ type: 'contact', contact_type: 'something' })).to.equal('something');
    });

    it('should not crash when provided invalid inputs', () => {
      expect(service.getTypeId()).to.equal(undefined);
      expect(service.getTypeId({})).to.equal(undefined);
      expect(service.getTypeId([])).to.equal(undefined);
    });
  });

  describe('getPlaceChildTypes', () => {
    it('should return the child types that are not persons', async () => {
      const types = [
        { id: 'region' },
        { id: 'district', parents: [] },
        { id: 'suburb',   parents: [ 'region' ] },
        { id: 'family',   parents: [ 'suburb' ] },
        { id: 'chp',      parents: [ 'region', 'suburb' ], person: true },
        { id: 'patient',  parents: [ 'family' ], person: true },
      ];
      Settings.resolves({ contact_types: types });

      expect(await service.getPlaceChildTypes('region')).to.deep.equal([
        { id: 'suburb', parents: [ 'region' ] },
      ]);

      expect(await service.getPlaceChildTypes('suburb')).to.deep.equal([
        { id: 'family', parents: [ 'suburb' ] },
      ]);

      expect(await service.getPlaceChildTypes('family')).to.deep.equal([]);
    });
  });

  describe('getTypeById', () => {
    it('should work with bad data', () => {
      expect(service.getTypeById([], undefined)).to.equal(undefined);
      expect(service.getTypeById(undefined, undefined)).to.equal(undefined);
      expect(service.getTypeById([undefined], undefined)).to.equal(undefined);
    });

    it('should return undefined if not found', () => {
      const types = [
        undefined,
        { notid: 'test' },
        { id: 'type1' },
        { id: 'type2' },
      ];

      expect(service.getTypeById(types, 't1')).to.equal(undefined);
      expect(service.getTypeById(types, 't2')).to.equal(undefined);
    });

    it('should return type when found', () => {
      const types = [
        undefined,
        { notid: 'test' },
        { id: 'type1' },
        { id: 'type2' },
      ];

      expect(service.getTypeById(types, 'type1')).to.deep.equal({ id: 'type1' });
      expect(service.getTypeById(types, 'type2')).to.deep.equal({ id: 'type2' });
    });
  });

  describe('getLeafPlaceTypes', () => {
    it('should return leaf type places', async () => {
      const types = [
        { id: 'nothing', parents: ['something'] },
        { id: 'something' },
      ];
      Settings.resolves({ contact_types: types });
      expect(await service.getLeafPlaceTypes()).to.deep.equal([{ id: 'nothing', parents: ['something'] }]);
    });

    it('should return nothing with bad data', async () => {
      Settings.resolves({ });
      expect(await service.getLeafPlaceTypes()).to.deep.equal([]);

      Settings.resolves({ contact_types: {} });
      expect(await service.getLeafPlaceTypes()).to.deep.equal([]);
    });
  });

  describe('isLeafPlaceType', () => {
    it('should return false for bad data', () => {
      expect(service.isLeafPlaceType([], undefined)).to.equal(false);
      expect(service.isLeafPlaceType(false, undefined)).to.equal(false);
      expect(service.isLeafPlaceType([undefined], undefined)).to.equal(false);
    });

    it('should return false when type is not a leaf place type', () => {
      const types = [ { id: 'clinic1' }, { id: 'clinic2' }, { id: 'clinic3' } ];
      expect(service.isLeafPlaceType(types, 'person')).to.equal(false);
      expect(service.isLeafPlaceType(types, 'health_center')).to.equal(false);
    });

    it('should return true when type is a leaf place type', () => {
      const types = [ undefined, {}, { id: 'clinic1' }, { id: 'clinic2' }, { id: 'clinic3' } ];
      expect(service.isLeafPlaceType(types, 'clinic1')).to.equal(true);
      expect(service.isLeafPlaceType(types, 'clinic2')).to.equal(true);
    });
  });

  describe('isPerson', () => {
    it('should return true if passed an object and contact is a person', async () => {
      const contact = { type: { id: 'a_person', person: true } };
      expect(await service.isPerson(contact)).to.equal(true);

      const contact2 = { type: { id: 'person' } };
      expect(await service.isPerson(contact2)).to.equal(true);
    });

    it('should return false if passed an object and contact is not a person', async () => {
      const contact = { type: { id: 'not_person', person: false } };
      expect(await service.isPerson(contact)).to.equal(false);

      const contact2 = { type: { id: 'notperson' } };
      expect(await service.isPerson(contact2)).to.equal(false);
    });

    it('should return true if passed a string and contact is a person', async () => {
      const contact = { type: 'a_person' };
      const types = [
        { id: 'nothing', parents: ['something'] },
        { id: 'a_person', person: true },
      ];
      Settings.resolves({ contact_types: types });
      expect(await service.isPerson(contact)).to.equal(true);
    });

    it('should return false if passed a string and contact is not a person', async () => {
      const contact = { type: 'nothing' };
      const types = [
        { id: 'nothing', parents: ['something'] },
        { id: 'a_person', person: true },
      ];
      Settings.resolves({ contact_types: types });
      expect(await service.isPerson(contact)).to.equal(false);
    });
  });
});
