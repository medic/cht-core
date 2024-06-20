const utils = require('../src/index');
const chai = require('chai');

const districtHospitalType = {
  id: 'my_district_hospital',
  name_key: 'contact.type.district_hospital',
  group_key: 'contact.type.district_hospital.plural',
  create_key: 'contact.type.district_hospital.new',
  edit_key: 'contact.type.place.edit',
  icon: 'medic-district-hospital',
  create_form: 'form:contact:district_hospital:create',
  edit_form: 'form:contact:district_hospital:edit',
};

const healthCenterType = {
  id: 'my_health_center',
  name_key: 'contact.type.health_center',
  group_key: 'contact.type.health_center.plural',
  create_key: 'contact.type.health_center.new',
  edit_key: 'contact.type.place.edit',
  parents: [ 'my_district_hospital' ],
  icon: 'medic-health-center',
  create_form: 'form:contact:health_center:create',
  edit_form: 'form:contact:health_center:edit',
};

const clinicType = {
  id: 'my_clinic',
  name_key: 'contact.type.clinic',
  group_key: 'contact.type.clinic.plural',
  create_key: 'contact.type.clinic.new',
  edit_key: 'contact.type.place.edit',
  parents: [ 'my_health_center' ],
  icon: 'medic-clinic',
  create_form: 'form:contact:clinic:create',
  edit_form: 'form:contact:clinic:edit',
  count_visits: true,
  person: false,
};

const personType = {
  id: 'person',
  name_key: 'contact.type.person',
  group_key: 'contact.type.person.plural',
  create_key: 'contact.type.person.new',
  edit_key: 'contact.type.person.edit',
  primary_contact_key: 'clinic.field.contact',
  parents: [ 'my_district_hospital', 'my_health_center', 'my_clinic' ],
  icon: 'medic-person',
  create_form: 'form:contact:person:create',
  edit_form: 'form:contact:person:edit',
  person: true,
};

const patientType = {
  id: 'patient',
  name_key: 'contact.type.patient',
  group_key: 'contact.type.patient.plural',
  create_key: 'contact.type.patient.new',
  edit_key: 'contact.type.patient.edit',
  primary_contact_key: 'clinic.field.contact',
  parents: [ 'my_district_hospital', 'my_health_center', 'my_clinic' ],
  icon: 'medic-person',
  create_form: 'form:contact:patient:create',
  edit_form: 'form:contact:patient:edit',
  person: true,
};

const chwType = {
  id: 'chw',
  name_key: 'contact.type.chw',
  group_key: 'contact.type.chw.plural',
  create_key: 'contact.type.chw.new',
  edit_key: 'contact.type.chw.edit',
  primary_contact_key: 'clinic.field.contact',
  parents: [ 'district_hospital', 'health_center' ],
  icon: 'medic-person',
  create_form: 'form:contact:chw:create',
  edit_form: 'form:contact:chw:edit',
  person: true,
};

const settings = {
  contact_types: [
    districtHospitalType,
    healthCenterType,
    clinicType,
    chwType,
    patientType,
    personType,
  ]
};

describe('ContactType Utils', () => {
  describe('getTypeId', () => {
    it('should not crash with no input', () => {
      chai.expect(utils.getTypeId()).to.equal(undefined);
      chai.expect(utils.getTypeId(false)).to.equal(undefined);
      chai.expect(utils.getTypeId({})).to.equal(undefined);
    });

    it('should return hardcoded contact type', () => {
      chai.expect(utils.getTypeId({ type: 'person' })).to.equal('person');
      chai.expect(utils.getTypeId({ type: 'district_hospital' })).to.equal('district_hospital');
      chai.expect(utils.getTypeId({ type: 'health_center' })).to.equal('health_center');
      chai.expect(utils.getTypeId({ type: 'whatever' })).to.equal('whatever');
    });

    it('should return contact_type value', () => {
      chai.expect(utils.getTypeId({ type: 'contact', contact_type: 'person' })).to.equal('person');
      chai.expect(utils.getTypeId({ type: 'contact', contact_type: 'chw' })).to.equal('chw');
      chai.expect(utils.getTypeId({ type: 'contact', contact_type: 'patient' })).to.equal('patient');
      chai.expect(utils.getTypeId({ type: 'contact', contact_type: 'health_center' })).to.equal('health_center');
    });
  });

  describe('getTypeById', () => {
    it('should return nothing when no matching type', () => {
      chai.expect(utils.getTypeById()).to.equal(undefined);
      chai.expect(utils.getTypeById({})).to.equal(undefined);
      chai.expect(utils.getTypeById(settings, '')).to.equal(undefined);
      chai.expect(utils.getTypeById(settings, 'some_type')).to.equal(undefined);
      chai.expect(utils.getTypeById(settings, 'clinic')).to.equal(undefined);
      chai.expect(utils.getTypeById(settings, 'district_hospital')).to.equal(undefined);
    });

    it('should return matching type', () => {
      chai.expect(utils.getTypeById(settings, 'patient')).to.deep.equal(patientType);
      chai.expect(utils.getTypeById(settings, 'chw')).to.deep.equal(chwType);
      chai.expect(utils.getTypeById(settings, 'my_district_hospital')).to.deep.equal(districtHospitalType);
      chai.expect(utils.getTypeById(settings, 'my_health_center')).to.deep.equal(healthCenterType);
    });
  });

  describe('isPersonType', () => {
    it('should return falsy for no type', () => {
      chai.expect(utils.isPersonType(false)).to.equal(false);
      chai.expect(utils.isPersonType()).to.equal(undefined);
    });

    it('should return false for non-person types', () => {
      chai.expect(utils.isPersonType(false)).to.equal(false);
      chai.expect(utils.isPersonType({ id: 'something' })).to.equal(false);
      chai.expect(utils.isPersonType({ id: 'other', person: false})).to.equal(false);
      chai.expect(utils.isPersonType(healthCenterType)).to.equal(false);
      chai.expect(utils.isPersonType(clinicType)).to.equal(false);
    });

    it('should return true for person types', () => {
      chai.expect(utils.isPersonType({ id: 'person' })).to.equal(true);
      chai.expect(utils.isPersonType({ id: 'other', person: true })).to.equal(true);
      chai.expect(utils.isPersonType(personType)).to.equal(true);
      chai.expect(utils.isPersonType(chwType)).to.equal(true);
      chai.expect(utils.isPersonType(patientType)).to.equal(true);
    });
  });

  describe('isSameContactType', () => {
    it('should return true for hardcoded contacts of the same type', () => {
      chai.expect(utils.isSameContactType([
        { type: 'contact', contact_type: 'health_center' },
        { type: 'contact', contact_type: 'health_center' },
      ])).to.equal(true);
    });
    it('should return true for configurable contacts of the same type', () => {
      chai.expect(utils.isSameContactType([
        { type: 'my_health_center' },
        { type: 'my_health_center' },
      ])).to.equal(true);
    });
    it('should return true for a mix of hardcoded and configurable types of the same hierarchy', () => {
      chai.expect(utils.isSameContactType([
        { type: 'health_center' },
        { type: 'contact', contact_type: 'health_center' },
      ])).to.equal(true);
    });
    it('should return false for hardcoded contacts of different type', () => {
      chai.expect(utils.isSameContactType([
        { type: 'contact', contact_type: 'health_center' },
        { type: 'contact', contact_type: 'district_hospital' },
      ])).to.equal(false);
    });
    it('should return false for configurable contacts of different type', () => {
      chai.expect(utils.isSameContactType([
        { type: 'my_health_center' },
        { type: 'health_center' },
      ])).to.equal(false);
    });
    it('should return true for a mix of hardcoded and configurable types of the same hierarchy', () => {
      chai.expect(utils.isSameContactType([
        { type: 'health_center' },
        { type: 'contact', contact_type: 'my_health_center' },
      ])).to.equal(false);
    });
  });

  describe('isPlaceType', () => {
    it('should return false for no type', () => {
      chai.expect(utils.isPlaceType(false)).to.equal(false);
      chai.expect(utils.isPlaceType()).to.equal(undefined);
    });

    it('should return false for person types', () => {
      chai.expect(utils.isPlaceType({ id: 'person' })).to.equal(false);
      chai.expect(utils.isPlaceType(personType)).to.equal(false);
      chai.expect(utils.isPlaceType(chwType)).to.equal(false);
      chai.expect(utils.isPlaceType(patientType)).to.equal(false);
    });

    it('should return true for non-person types', () => {
      chai.expect(utils.isPlaceType({ id: 'place' })).to.equal(true);
      chai.expect(utils.isPlaceType(districtHospitalType)).to.equal(true);
      chai.expect(utils.isPlaceType(healthCenterType)).to.equal(true);
      chai.expect(utils.isPlaceType(clinicType)).to.equal(true);
    });
  });

  describe('hasParents', () => {
    it('should return false when no parents', () => {
      chai.expect(utils.hasParents(false)).to.equal(false);
      chai.expect(utils.hasParents({})).to.equal(false);
      chai.expect(utils.hasParents({ parents: [] })).to.equal(false);
    });

    it('should return true when type has parents', () => {
      chai.expect(utils.hasParents({ parents: ['a'] })).to.equal(true);
      chai.expect(utils.hasParents({ parents: ['a', 'b'] })).to.equal(true);
    });
  });

  describe('isParentOf', () => {
    it('should return false when wrong input', () => {
      chai.expect(utils.isParentOf()).to.equal(false);
      chai.expect(utils.isParentOf(true, true)).to.equal(false);
    });

    it('should return false when not parent of', () => {
      chai.expect(utils.isParentOf({ id: 'parent' }, { id: 'child' })).to.equal(false);
      chai.expect(utils.isParentOf('parent', { id: 'child' })).to.equal(false);
      chai.expect(utils.isParentOf({ id: 'parent' }, { id: 'child', parents: [] })).to.equal(false);
      chai.expect(utils.isParentOf('parent', { id: 'child', parents: [] })).to.equal(false);
      chai.expect(utils.isParentOf({ id: 'parent' }, { id: 'child', parents: ['other'] })).to.equal(false);
      chai.expect(utils.isParentOf('parent', { id: 'child', parents: ['other'] })).to.equal(false);
    });

    it('should return true when parent of', () => {
      chai.expect(utils.isParentOf({ id: 'parent' }, { id: 'child', parents: ['parent'] })).to.equal(true);
      chai.expect(utils.isParentOf('parent', { id: 'child', parents: ['parent'] })).to.equal(true);
      chai.expect(utils.isParentOf({ id: 'parent' }, { id: 'child', parents: ['other', 'parent'] })).to.equal(true);
      chai.expect(utils.isParentOf('parent', { id: 'child', parents: ['other', 'parent'] })).to.equal(true);
    });
  });

  describe('getLeafPlaceTypes', () => {
    it('should not crash with no config', () => {
      chai.expect(utils.getLeafPlaceTypes()).to.deep.equal([]);
      chai.expect(utils.getLeafPlaceTypes({})).to.deep.equal([]);
    });

    it('should return leaf place types', () => {
      const hierarchy = [
        { id: 'root' },
        { id: 'l1', parents: ['root'] },
        { id: 'b1', parents: ['root'] },
        { id: 'b2', parents: ['root'] },
        { id: 'b3', parents: ['b1'] },
        { id: 'l2', parents: ['b2'] },
        { id: 'l3', parents: ['b2'] },
        { id: 'b4', parents: ['b3'] },
        { id: 'b5', parents: ['b3'] },
        { id: 'l4', parents: ['b4'] },
        { id: 'l5', parents: ['b5'] },
        { id: 'p1', parents: ['l1', 'l3', 'b3', 'b5'], person: true },
        { id: 'p2', parents: ['root', 'l2', 'l4', 'b4'], person: true },
        { id: 'p4', parents: ['l1', 'l2', 'l3', 'l4', 'l5'], person: true },
      ];
      chai.expect(utils.getLeafPlaceTypes({ contact_types: hierarchy })).to.have.deep.members([
        { id: 'l1', parents: ['root'] },
        { id: 'l2', parents: ['b2'] },
        { id: 'l3', parents: ['b2'] },
        { id: 'l4', parents: ['b4'] },
        { id: 'l5', parents: ['b5'] },
      ]);
    });
  });

  describe('getContactType', () => {
    it('should return falsy when no input', () => {
      chai.expect(utils.getContactType()).to.equal(undefined);
      chai.expect(utils.getContactType(undefined, {})).to.equal(undefined);
      chai.expect(utils.getContactType({})).to.equal(undefined);
      chai.expect(utils.getContactType(settings, 'whatever')).to.equal(undefined);
      chai.expect(utils.getContactType(settings, [])).to.equal(undefined);
    });

    it('should return falsy for non-existing contact type', () => {
      chai.expect(utils.getContactType(settings, { type: 'contact' })).to.equal(undefined);
      chai.expect(utils.getContactType(settings, { type: 'contact', contact_type: 'something' })).to.equal(undefined);
    });

    it('should return contact type', () => {
      chai.expect(utils.getContactType(settings, { type: 'person' })).to.equal(personType);
      chai.expect(utils.getContactType(settings, { type: 'contact', contact_type: 'person' })).to.equal(personType);
      chai.expect(utils.getContactType(settings, { type: 'contact', contact_type: 'my_health_center' }))
        .to.equal(healthCenterType);
      chai.expect(utils.getContactType(settings, { type: 'my_health_center' })).to.equal(healthCenterType);
    });
  });

  describe('isPerson', () => {
    it('should return falsy for falsy input', () => {
      chai.expect(utils.isPerson()).to.equal(false);
      chai.expect(utils.isPerson(false, false)).to.equal(false);
      chai.expect(utils.isPerson({}, false)).to.equal(false);
      chai.expect(utils.isPerson([], false)).to.equal(false);
      chai.expect(utils.isPerson(settings, 'whaaat')).to.equal(false);
    });

    it('should return falsy for non existent contact types', () => {
      chai.expect(utils.isPerson(settings, { type: 'other' })).to.equal(false);
      chai.expect(utils.isPerson(settings, { type: 'contact', contact_type: 'other' })).to.equal(false);
    });

    it('should return falsy for place types', () => {
      chai.expect(utils.isPerson(settings, { type: districtHospitalType.id })).to.equal(false);
      chai.expect(utils.isPerson(settings, { type: clinicType.id })).to.equal(false);
      chai.expect(utils.isPerson(settings, { type: 'contact', contact_type: districtHospitalType.id })).to.equal(false);
      chai.expect(utils.isPerson(settings, { type: 'contact', contact_type: clinicType.id })).to.equal(false);
    });

    it('should return true for person types', () => {
      chai.expect(utils.isPerson({}, { type: 'person' })).to.equal(true);
      chai.expect(utils.isPerson(settings, { type: 'person' })).to.equal(true);
      chai.expect(utils.isPerson(settings, { type: chwType.id })).to.equal(true);
      chai.expect(utils.isPerson(settings, { type: 'contact', contact_type: 'person' })).to.equal(true);
      chai.expect(utils.isPerson(settings, { type: 'contact', contact_type: chwType.id })).to.equal(true);
    });
  });

  describe('isPlace', () => {
    it('should return falsy for falsy input', () => {
      chai.expect(utils.isPlace()).to.equal(undefined);
      chai.expect(utils.isPlace(false, false)).to.equal(undefined);
      chai.expect(utils.isPlace({}, false)).to.equal(undefined);
      chai.expect(utils.isPlace([], false)).to.equal(undefined);
      chai.expect(utils.isPlace(settings, 'whaaat')).to.equal(undefined);
    });

    it('should return falsy for non existent contact types', () => {
      chai.expect(utils.isPlace(settings, { type: 'other' })).to.equal(undefined);
      chai.expect(utils.isPlace(settings, { type: 'contact', contact_type: 'other' })).to.equal(undefined);
    });

    it('should return falsy for person types', () => {
      chai.expect(utils.isPlace({}, { type: 'person' })).to.equal(undefined);
      chai.expect(utils.isPlace(settings, { type: personType.id })).to.equal(false);
      chai.expect(utils.isPlace(settings, { type: patientType.id })).to.equal(false);
      chai.expect(utils.isPlace(settings, { type: 'contact', contact_type: personType.id })).to.equal(false);
      chai.expect(utils.isPlace(settings, { type: 'contact', contact_type: patientType.id })).to.equal(false);
    });

    it('should return true for place types', () => {
      chai.expect(utils.isPlace(settings, { type: districtHospitalType.id })).to.equal(true);
      chai.expect(utils.isPlace(settings, { type: clinicType.id })).to.equal(true);
      chai.expect(utils.isPlace(settings, { type: 'contact', contact_type: clinicType.id })).to.equal(true);
      chai.expect(utils.isPlace(settings, { type: 'contact', contact_type: healthCenterType.id })).to.equal(true);
    });
  });

  describe('isHardcodedType', () => {
    it('should return true for hardcoded types', () => {
      chai.expect(utils.isHardcodedType('district_hospital')).to.equal(true);
      chai.expect(utils.isHardcodedType('clinic')).to.equal(true);
      chai.expect(utils.isHardcodedType('health_center')).to.equal(true);
      chai.expect(utils.isHardcodedType('person')).to.equal(true);
    });

    it('should return false for non-hardcoded types', () => {
      chai.expect(utils.isHardcodedType('district_hospital_what?')).to.equal(false);
      chai.expect(utils.isHardcodedType('not_a_clinic')).to.equal(false);
      chai.expect(utils.isHardcodedType('healthier_center')).to.equal(false);
      chai.expect(utils.isHardcodedType('patient')).to.equal(false);
    });
  });

  describe('getContactTypes', () => {
    it('should not crash with empty config', () => {
      chai.expect(utils.getContactTypes()).to.deep.equal([]);
      chai.expect(utils.getContactTypes(false)).to.deep.equal([]);
      chai.expect(utils.getContactTypes({})).to.deep.equal([]);
      chai.expect(utils.getContactTypes({ other: true })).to.deep.equal([]);
      chai.expect(utils.getContactTypes({ contact_types: 'something' })).to.deep.equal([]);
    });

    it('should return contact_types property', () => {
      chai.expect(utils.getContactTypes({ contact_types: [{ id: 'a' }] })).to.deep.equal([{ id: 'a' }]);
    });
  });

  describe('getChildren', () => {
    it('should not crash with empty config', () => {
      chai.expect(utils.getChildren()).to.deep.equal([]);
      chai.expect(utils.getChildren(null)).to.deep.equal([]);
      chai.expect(utils.getChildren(false)).to.deep.equal([]);
    });

    it('should return children of place', () => {
      const contactTypes = [
        { id: 'root' },
        { id: 'parent1', parents: ['root'] },
        { id: 'parent2', parents: ['root'] },
        { id: 'child1', parents: ['root', 'parent1', 'parent2'] },
        { id: 'child2', parents: ['root', 'parent2'] },
        { id: 'child3', parents: ['parent1', 'parent2'] },
        { id: 'child4', parents: ['root', 'parent1'], person: true },
      ];
      const config = { contact_types: contactTypes };

      chai.expect(utils.getChildren(config, 'parent1')).to.deep.equal([
        { id: 'child1', parents: ['root', 'parent1', 'parent2'] },
        { id: 'child3', parents: ['parent1', 'parent2'] },
        { id: 'child4', parents: ['root', 'parent1'], person: true },
      ]);
      chai.expect(utils.getChildren(config, 'parent2')).to.deep.equal([
        { id: 'child1', parents: ['root', 'parent1', 'parent2'] },
        { id: 'child2', parents: ['root', 'parent2'] },
        { id: 'child3', parents: ['parent1', 'parent2'] },
      ]);
    });

    it('should return orphans for empty type', () => {
      const contactTypes = [
        { id: 'root' },
        { id: 'parent1', parents: ['root'] },
        { id: 'parent2', parents: ['root'] },
        { id: 'child1', parents: ['root', 'parent1', 'parent2'] },
        { id: 'child2', parents: ['root', 'parent2'] },
        { id: 'orphan1', parents: [] },
        { id: 'orphan2', parents: [], person: true },
      ];
      const config = { contact_types: contactTypes };
      chai.expect(utils.getChildren(config)).to.deep.equal([
        { id: 'root' },
        { id: 'orphan1', parents: [] },
        { id: 'orphan2', parents: [], person: true },
      ]);
    });
  });

  describe('getPlaceTypes', () => {
    it('should return empty array for empty config', () => {
      chai.expect(utils.getPlaceTypes()).to.deep.equal([]);
    });

    it('should return all place types', () => {
      chai.expect(utils.getPlaceTypes(settings)).to.deep.equal([
        districtHospitalType,
        healthCenterType,
        clinicType,
      ]);
    });
  });

  describe('getPersonTypes', () => {
    it('should return empty array for empty config', () => {
      chai.expect(utils.getPersonTypes()).to.deep.equal([]);
    });

    it('should return all person types', () => {
      chai.expect(utils.getPersonTypes(settings)).to.deep.equal([
        chwType,
        patientType,
        personType,
      ]);
    });
  });
});
