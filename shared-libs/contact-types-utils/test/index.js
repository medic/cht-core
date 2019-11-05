const utils = require('../src/index');
const sinon = require('sinon');
const chai = require('chai');

let config;

describe('ContactType Utils', () => {
  beforeEach(() => {
    config = { get: sinon.stub() };
    config.get.returns([
      {
        id: 'my_district_hospital',
        name_key: 'contact.type.district_hospital',
        group_key: 'contact.type.district_hospital.plural',
        create_key: 'contact.type.district_hospital.new',
        edit_key: 'contact.type.place.edit',
        icon: 'medic-district-hospital',
        create_form: 'form:contact:district_hospital:create',
        edit_form: 'form:contact:district_hospital:edit'
      },
      {
        id: 'my_health_center',
        name_key: 'contact.type.health_center',
        group_key: 'contact.type.health_center.plural',
        create_key: 'contact.type.health_center.new',
        edit_key: 'contact.type.place.edit',
        parents: [ 'district_hospital' ],
        icon: 'medic-health-center',
        create_form: 'form:contact:health_center:create',
        edit_form: 'form:contact:health_center:edit'
      },
      {
        id: 'my_clinic',
        name_key: 'contact.type.clinic',
        group_key: 'contact.type.clinic.plural',
        create_key: 'contact.type.clinic.new',
        edit_key: 'contact.type.place.edit',
        parents: [ 'health_center' ],
        icon: 'medic-clinic',
        create_form: 'form:contact:clinic:create',
        edit_form: 'form:contact:clinic:edit',
        count_visits: true
      },
      {
        id: 'my_person',
        name_key: 'contact.type.person',
        group_key: 'contact.type.person.plural',
        create_key: 'contact.type.person.new',
        edit_key: 'contact.type.person.edit',
        primary_contact_key: 'clinic.field.contact',
        parents: [ 'district_hospital', 'health_center', 'clinic' ],
        icon: 'medic-person',
        create_form: 'form:contact:person:create',
        edit_form: 'form:contact:person:edit',
        person: true
      },
      {
        id: 'my_person2',
        name_key: 'contact.type.person2',
        group_key: 'contact.type.person2.plural',
        create_key: 'contact.type.person2.new',
        edit_key: 'contact.type.person2.edit',
        primary_contact_key: 'clinic.field.contact',
        parents: [ 'district_hospital', 'health_center' ],
        icon: 'medic-person',
        create_form: 'form:contact:person2:create',
        edit_form: 'form:contact:person2:edit',
        person: true
      },
    ]);
  });
  afterEach(() => sinon.restore());

  describe('getTypeId', () => {
    it('should not crash with no input', () => {
      chai.expect(utils.getTypeId()).to.equal(undefined);
      chai.expect(utils.getTypeId(false)).to.equal(false);
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
      chai.expect(utils.getTypeById(config, 'some_type')).to.equal(undefined);
      chai.expect(utils.getTypeById(config, 'clinic')).to.equal(undefined);
      chai.expect(utils.getTypeById(config, 'person')).to.equal(undefined);
    });

    it('should return matching type', () => {
      chai.expect(utils.getTypeById(config, 'my_person')).to.deep.equal({
        id: 'my_person',
        name_key: 'contact.type.person',
        group_key: 'contact.type.person.plural',
        create_key: 'contact.type.person.new',
        edit_key: 'contact.type.person.edit',
        primary_contact_key: 'clinic.field.contact',
        parents: [ 'district_hospital', 'health_center', 'clinic' ],
        icon: 'medic-person',
        create_form: 'form:contact:person:create',
        edit_form: 'form:contact:person:edit',
        person: true
      });
      chai.expect(utils.getTypeById(config, 'my_person')).to.deep.equal({
        id: 'my_person',
        name_key: 'contact.type.person',
        group_key: 'contact.type.person.plural',
        create_key: 'contact.type.person.new',
        edit_key: 'contact.type.person.edit',
        primary_contact_key: 'clinic.field.contact',
        parents: [ 'district_hospital', 'health_center', 'clinic' ],
        icon: 'medic-person',
        create_form: 'form:contact:person:create',
        edit_form: 'form:contact:person:edit',
        person: true
      });
      chai.expect(utils.getTypeById(config, 'my_district_hospital')).to.deep.equal({
        id: 'my_district_hospital',
        name_key: 'contact.type.district_hospital',
        group_key: 'contact.type.district_hospital.plural',
        create_key: 'contact.type.district_hospital.new',
        edit_key: 'contact.type.place.edit',
        icon: 'medic-district-hospital',
        create_form: 'form:contact:district_hospital:create',
        edit_form: 'form:contact:district_hospital:edit'
      });
    });
  });

  describe('isPersonType', () => {
    it('should return false for non-person types', () => {
      chai.expect(utils.isPersonType(config, 'nonexistent')).to.equal(false);
      chai.expect(utils.isPersonType(config, 'my_district_hospital')).to.equal(false);
      chai.expect(utils.isPersonType(config, 'my_health_center')).to.equal(false);
    });

    it('should return true for person types', () => {
      chai.expect(utils.isPersonType(config, 'my_person')).to.equal(true);
      chai.expect(utils.isPersonType(config, 'my_person2')).to.equal(true);
    });
  });

  describe('isPlaceType', () => {
    it('should return false for non-person types', () => {
      chai.expect(utils.isPlaceType(config, 'my_district_hospital')).to.equal(true);
      chai.expect(utils.isPlaceType(config, 'my_health_center')).to.equal(true);
    });

    it('should return true for person types or non-existent types', () => {
      chai.expect(utils.isPlaceType(config, 'nonexistent')).to.equal(undefined);
      chai.expect(utils.isPlaceType(config, 'my_person')).to.equal(false);
      chai.expect(utils.isPlaceType(config, 'my_person2')).to.equal(false);
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
      config.get.returns(hierarchy);
      chai.expect(utils.getLeafPlaceTypes(config)).to.have.deep.members([
        { id: 'l1', parents: ['root'] },
        { id: 'l2', parents: ['b2'] },
        { id: 'l3', parents: ['b2'] },
        { id: 'l4', parents: ['b4'] },
        { id: 'l5', parents: ['b5'] },
      ]);
    });
  });
});
