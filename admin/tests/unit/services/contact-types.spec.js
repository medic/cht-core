describe('ContactTypes service', () => {

  let service;
  let Settings;

  const HARDCODED_TYPES = [
    'district_hospital',
    'health_center',
    'clinic',
    'person'
  ];

  beforeEach(() => {
    Settings = sinon.stub();

    module('adminApp');
    module($provide => {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('Settings', Settings);
    });
    inject(_ContactTypes_ => {
      service = _ContactTypes_;
    });
  });

  describe('get', () => {

    it('returns undefined when no config', () => {
      Settings.resolves({});
      return service.get('nothing').then(type => {
        chai.assert.isUndefined(type);
      });
    });

    it('returns undefined when no match', () => {
      const types = [ { id: 'something' } ];
      Settings.resolves({ contact_types: types });
      return service.get('nothing').then(type => {
        chai.assert.isUndefined(type);
      });
    });

    it('returns type when match', () => {
      const types = [
        { id: 'nothing' },
        { id: 'something' },
      ];
      Settings.resolves({ contact_types: types });
      return service.get('something').then(type => {
        chai.expect(type.id).to.equal('something');
      });
    });
  });

  describe('getAll', () => {

    it('returns an empty array when no config', () => {
      Settings.resolves({});
      return service.getAll().then(config => {
        chai.expect(config).to.deep.equal([]);
      });
    });

    it('returns the types array when configured', () => {
      const types = [
        { id: 'nothing' },
        { id: 'something' },
      ];
      Settings.resolves({ contact_types: types });
      return service.getAll().then(config => {
        chai.expect(config).to.deep.equal([
          { id: 'nothing' },
          { id: 'something' },
        ]);
      });
    });

  });

  describe('isHardcodedType', () => {

    HARDCODED_TYPES.forEach(type => {
      it(`returns true for ${type}`, () => {
        chai.expect(service.isHardcodedType(type)).to.equal(true);
      });
    });

    it('returns false for contact type', () => {
      chai.expect(service.isHardcodedType('contact')).to.equal(false);
    });

    it('returns false for random type', () => {
      chai.expect(service.isHardcodedType('xyz')).to.equal(false);
    });

  });


  describe('includes', () => {

    HARDCODED_TYPES.forEach(type => {
      it(`returns true for ${type}`, () => {
        chai.expect(service.includes({ type: type })).to.equal(true);
      });
    });

    it('returns true for contact type', () => {
      chai.expect(service.includes({ type: 'contact' })).to.equal(true);
    });

    it('returns false for random type', () => {
      chai.expect(service.includes({ type: 'xyz' })).to.equal(false);
    });

    it('returns false for unknown type', () => {
      chai.expect(service.includes({ })).to.equal(false);
    });

    it('returns false for null doc', () => {
      chai.expect(service.includes()).to.equal(false);
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
        chai.expect(ids).to.deep.equal([ 'region', 'district' ]);
      });
    });

    it('gets all the possible children for the given type', () => {
      Settings.resolves({ contact_types: types });
      return service.getChildren('suburb').then(children => {
        const ids = children.map(child => child.id);
        chai.expect(ids).to.deep.equal([ 'family', 'chp' ]);
      });
    });

    it('returns empty array if no match', () => {
      Settings.resolves({ contact_types: types });
      return service.getChildren('district').then(children => {
        chai.expect(children).to.deep.equal([ ]);
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
        chai.expect(ids).to.deep.equal([ 'region', 'family' ]);
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
        chai.expect(ids).to.deep.equal([ 'chp', 'patient' ]);
      });
    });

  });

  describe('getTypeId', () => {
    it('should return the type id of the provided contact', () => {
      chai.expect(service.getTypeId({ type: 'person' })).to.equal('person');
      chai.expect(service.getTypeId({ type: 'clinic' })).to.equal('clinic');
      chai.expect(service.getTypeId({ type: 'contact', contact_type: 'something' })).to.equal('something');
    });

    it('should not crash when provided invalid inputs', () => {
      chai.expect(service.getTypeId()).to.equal(undefined);
      chai.expect(service.getTypeId({})).to.equal(undefined);
      chai.expect(service.getTypeId([])).to.equal(undefined);
    });
  });

  describe('isPersonType', () => {
    it('should return true when provided a person type', () => {
      chai.expect(service.isPersonType({ id: 'person' })).to.equal(true);
      chai.expect(service.isPersonType({ id: 'other', person: true })).to.equal(true);
    });

    it('should return falsy when not provided a person type', () => {
      chai.expect(service.isPersonType()).to.equal(undefined);
      chai.expect(service.isPersonType({})).to.equal(false);
      chai.expect(service.isPersonType({ id: 'not_a_person' })).to.equal(false);
      chai.expect(service.isPersonType({ id: 'other', person: false })).to.equal(false);
    });
  });
});
