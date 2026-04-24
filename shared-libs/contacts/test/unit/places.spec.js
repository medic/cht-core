const chai = require('chai');
chai.use(require('chai-as-promised'));
const sinon = require('sinon');
const config = require('../../src/libs/config');
const db = require('../../src/libs/db');
const dataContext = require('../../src/libs/data-context');
const controller = require('../../src/places');
const people = require('../../src/people');
const cutils = require('../../src/libs/utils');
const lineage = require('../../src/libs/lineage');
const { Place, Qualifier } = require('@medic/cht-datasource');
const contactTypesUtils = require('@medic/contact-types-utils');
const { CONTACT_TYPES } = require('@medic/constants');

let examplePlace;

const contactTypes = [
  {
    id: 'district_hospital',
    name_key: 'contact.type.district_hospital',
    group_key: 'contact.type.district_hospital.plural',
    create_key: 'contact.type.district_hospital.new',
    edit_key: 'contact.type.place.edit',
    icon: 'medic-district-hospital',
    create_form: 'form:contact:district_hospital:create',
    edit_form: 'form:contact:district_hospital:edit'
  },
  {
    id: CONTACT_TYPES.HEALTH_CENTER,
    name_key: 'contact.type.health_center',
    group_key: 'contact.type.health_center.plural',
    create_key: 'contact.type.health_center.new',
    edit_key: 'contact.type.place.edit',
    parents: ['district_hospital'],
    icon: 'medic-health-center',
    create_form: 'form:contact:health_center:create',
    edit_form: 'form:contact:health_center:edit'
  },
  {
    id: 'clinic',
    name_key: 'contact.type.clinic',
    group_key: 'contact.type.clinic.plural',
    create_key: 'contact.type.clinic.new',
    edit_key: 'contact.type.place.edit',
    parents: [CONTACT_TYPES.HEALTH_CENTER],
    icon: 'medic-clinic',
    create_form: 'form:contact:clinic:create',
    edit_form: 'form:contact:clinic:edit',
    count_visits: true
  },
  {
    id: 'person',
    name_key: 'contact.type.person',
    group_key: 'contact.type.person.plural',
    create_key: 'contact.type.person.new',
    edit_key: 'contact.type.person.edit',
    primary_contact_key: 'clinic.field.contact',
    parents: ['district_hospital', CONTACT_TYPES.HEALTH_CENTER, 'clinic'],
    icon: 'medic-person',
    create_form: 'form:contact:person:create',
    edit_form: 'form:contact:person:edit',
    person: true
  }
];

describe('places controller', () => {
  let getWithLineage;

  beforeEach(() => {
    config.init({ get: sinon.stub() });
    db.init({ medic: { post: sinon.stub(), allDocs: sinon.stub() } });
    dataContext.init({ bind: sinon.stub() });
    examplePlace = {
      type: 'clinic',
      name: 'St. Paul',
      parent: 'x'
    };
    config.get.returns({ contact_types: contactTypes });
    lineage.init(require('@medic/lineage')(Promise, db.medic));

    getWithLineage = sinon.stub();
    dataContext.bind.returns(getWithLineage);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('validatePlace', () => {

    it('returns error on string argument', () => {
      return controller
        ._validatePlace('x')
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.message).to.equal('Place must be an object.');
        });
    });

    it('returns error on number argument', () => {
      return controller
        ._validatePlace(42)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.message).to.equal('Place must be an object.');
        });
    });

    it('returns error when doc is wrong type', () => {
      examplePlace._id = 'xyz';
      examplePlace.type = 'food';
      return controller
        ._validatePlace(examplePlace)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.message).to.equal('Wrong type, object xyz is not a place.');
        });
    });

    it('returns error when doc is person', () => {
      examplePlace._id = 'xyz';
      examplePlace.type = 'person';
      return controller
        ._validatePlace(examplePlace)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.message).to.equal('Wrong type, object xyz is not a place.');
        });
    });

    it('returns error when doc type is not "contact"', () => {
      examplePlace._id = 'xyz';
      examplePlace.type = 'shoe';
      examplePlace.contact_type = 'clinic';
      return controller
        ._validatePlace(examplePlace)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.message).to.equal('Wrong type, object xyz is not a place.');
        });
    });

    it('returns error if clinic is missing parent', () => {
      examplePlace._id = 'xyz';
      delete examplePlace.parent;
      return controller
        ._validatePlace(examplePlace)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.message).to.equal('Place xyz is missing a "parent" property.');
        });
    });

    it('returns error if clinic has null parent', () => {
      examplePlace._id = 'xyz';
      examplePlace.parent = null;
      return controller
        ._validatePlace(examplePlace)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.message).to.equal('Place xyz is missing a "parent" property.');
        });
    });

    it('returns error if health center is missing parent', () => {
      examplePlace._id = 'xyz';
      delete examplePlace.parent;
      examplePlace.type = CONTACT_TYPES.HEALTH_CENTER;
      return controller
        ._validatePlace(examplePlace)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.message).to.equal('Place xyz is missing a "parent" property.');
        });
    });

    it('returns error if health center has wrong parent type', () => {
      const data = {
        _id: 'xyz',
        type: CONTACT_TYPES.HEALTH_CENTER,
        name: 'St. Paul',
        parent: {
          name: 'MoH',
          type: 'national_office'
        }
      };
      return controller
        ._validatePlace(data)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.message)
            .to.equal('health_center "xyz" should have one of the following parent types: "district_hospital".');
        });
    });

    it('returns error if clinic has wrong parent type', () => {
      examplePlace._id = 'xyz';
      examplePlace.parent = {
        name: 'St Paul Hospital',
        type: CONTACT_TYPES.DISTRICT_HOSPITAL
      };
      return controller
        ._validatePlace(examplePlace)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.message)
            .to.equal('clinic "xyz" should have one of the following parent types: "health_center".');
        });
    });

    it('returns error when place is missing name', () => {
      const place = { type: CONTACT_TYPES.DISTRICT_HOSPITAL };
      return controller
        ._validatePlace(place)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.message).to.equal('Place  is missing a "name" property.');
        });
    });

    it('returns error when name is not a string', () => {
      const place = { type: CONTACT_TYPES.DISTRICT_HOSPITAL, name: 123 };
      return controller
        ._validatePlace(place)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.message).to.equal('Property "name" on place  must be a string.');
        });
    });

    it('returns error when contact is invalid type', () => {
      const place = { type: CONTACT_TYPES.DISTRICT_HOSPITAL, name: 'Test', contact: 42 };
      return controller
        ._validatePlace(place)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.message).to.include('must be an object or string');
        });
    });

    it('does not return error if district is missing parent', () => {
      delete examplePlace.parent;
      examplePlace.type = 'district_hospital';
      return controller._validatePlace(examplePlace);
    });

  });

  describe('getPlace', () => {
    it('returns custom message on 404 errors.', async () => {
      getWithLineage.resolves(null);

      await chai.expect(controller.getPlace('x')).to.be.rejectedWith('Failed to find place.');

      chai.expect(dataContext.bind.calledOnceWithExactly(Place.v1.getWithLineage)).to.be.true;
      chai.expect(getWithLineage.calledOnceWithExactly(Qualifier.byUuid('x'))).to.be.true;
    });
  });

  describe('createPlaces', () => {

    it('rejects objects with wrong type.', () => {
      const place = {
        name: 'CHP Family',
        type: 'food'
      };
      const post = db.medic.post;
      return controller
        ._createPlaces(place)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.message).to.equal('Wrong type, object  is not a place.');
          chai.expect(post.callCount).to.equal(0);
        });
    });

    it('rejects parent objects with wrong type.', () => {
      const place = {
        name: 'CHP Family',
        type: 'clinic',
        parent: {
          name: 'CHP Area',
          type: 'food'
        }
      };
      const post = db.medic.post;
      return controller
        ._createPlaces(place)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.message).to.equal('Wrong type, object  is not a place.');
          chai.expect(post.callCount).to.equal(0);
        });
    });

    it('rejects when parent lookup fails.', () => {
      const place = {
        name: 'CHP Family',
        type: 'food',
        parent: 'x'
      };
      const post = db.medic.post;
      sinon.stub(controller, 'getPlace').returns(Promise.reject('boom'));
      return controller
        ._createPlaces(place)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err).to.equal('boom');
          chai.expect(post.callCount).to.equal(0);
        });
    });

    it('supports objects with name and right type.', async () => {
      const place = {
        name: 'CHP Family',
        type: 'clinic',
        parent: {
          name: 'CHP Area One',
          type: CONTACT_TYPES.HEALTH_CENTER,
          parent: {
            name: 'CHP Branch One',
            type: CONTACT_TYPES.DISTRICT_HOSPITAL
          }
        }
      };
      db.medic.post.callsFake(doc => {
        if (doc.name === 'CHP Branch One') {
          return Promise.resolve({ id: 'abc' });
        }
        if (doc.name === 'CHP Area One') {
          // the parent should be created/resolved, parent id should be set.
          chai.expect(doc.parent._id).to.equal('abc');
          chai.expect(doc.parent.name).to.equal(undefined); // minified
          chai.expect(doc.parent.type).to.equal(undefined); // minified
          return Promise.resolve({ id: 'def' });
        }
        if (doc.name === 'CHP Family') {
          // both parents should be created/resolved
          chai.expect(doc.parent._id).to.equal('def');
          chai.expect(doc.parent.name).to.equal(undefined); // minified
          chai.expect(doc.parent.type).to.equal(undefined); // minified
          chai.expect(doc.parent.parent._id).to.equal('abc');
          chai.expect(doc.parent.parent.name).to.equal(undefined); // minified
          chai.expect(doc.parent.parent.type).to.equal(undefined); // minified
          return Promise.resolve({ id: 'ghi' });
        }
      });
      getWithLineage.callsFake(({ uuid }) => {
        if (uuid === 'abc') {
          return Promise.resolve({
            _id: 'abc',
            name: 'CHP Branch One',
            type: CONTACT_TYPES.DISTRICT_HOSPITAL
          });
        }
        if (uuid === 'def') {
          return Promise.resolve({
            _id: 'def',
            name: 'CHP Area One',
            type: CONTACT_TYPES.HEALTH_CENTER,
            parent: {
              _id: 'abc',
              name: 'CHP Branch One',
              type: CONTACT_TYPES.DISTRICT_HOSPITAL
            }
          });
        }
        if (uuid === 'ghi') {
          return Promise.resolve({
            _id: 'ghi',
            name: 'CHP Family',
            type: 'clinic',
            parent: {
              _id: 'def',
              name: 'CHP Area One',
              type: CONTACT_TYPES.HEALTH_CENTER,
              parent: {
                _id: 'abc',
                name: 'CHP Branch One',
                type: CONTACT_TYPES.DISTRICT_HOSPITAL
              }
            }
          });
        }
      });

      const actual = await controller._createPlaces(place);

      chai.expect(actual).to.deep.equal({ id: 'ghi' });
      chai.expect(dataContext.bind.args).to.deep.equal([[Place.v1.getWithLineage], [Place.v1.getWithLineage]]);
      chai.expect(getWithLineage.args).to.deep.equal([[Qualifier.byUuid('abc')], [Qualifier.byUuid('def')]]);
    });

    it('creates contacts', async () => {
      const place = {
        name: 'CHP Family',
        type: CONTACT_TYPES.HEALTH_CENTER,
        parent: 'ad06d137',
        contact: {
          name: 'Jim',
          type: 'person'
        }
      };

      sinon.stub(people, 'getOrCreatePerson').resolves({
        _id: 'qwe',
        _rev: '1',
        name: 'Jim',
        type: 'person'
      });
      db.medic.post.withArgs(
        sinon.match((doc) => !doc.contact)
      ).callsFake(doc => {
        chai.expect(doc.name).to.equal('CHP Family');
        chai.expect(doc.parent._id).to.equal('ad06d137');
        return Promise.resolve({ id: 'hc', rev: '1' });
      });
      db.medic.post.withArgs(
        sinon.match(doc => doc.contact)
      ).callsFake(doc => {
        chai.expect(doc.name).to.equal('CHP Family');
        chai.expect(doc.parent._id).to.equal('ad06d137');
        chai.expect(doc.contact._id).to.equal('qwe');
        chai.expect(doc.contact.name).to.equal(undefined); // minified
        chai.expect(doc.contact.type).to.equal(undefined); //
        return Promise.resolve({ id: 'hc', rev: '2' });
      });

      getWithLineage.withArgs(Qualifier.byUuid('hc')).resolves({
        name: 'CHP Family',
        type: CONTACT_TYPES.HEALTH_CENTER,
        parent: {
          _id: 'ad06d137',
          name: 'CHP Branch One',
          type: CONTACT_TYPES.DISTRICT_HOSPITAL
        }
      });
      getWithLineage.withArgs(Qualifier.byUuid('ad06d137')).resolves({
        _id: 'ad06d137',
        name: 'CHP Branch One',
        type: CONTACT_TYPES.DISTRICT_HOSPITAL
      });

      const actual = await controller._createPlaces(place);

      chai.expect(db.medic.post.callCount).to.equal(2);
      chai.expect(actual).to.deep.equal({
        id: 'hc',
        rev: '2',
        contact: {
          id: 'qwe',
        }
      });
      chai.expect(dataContext.bind.args).to.deep.equal([[Place.v1.getWithLineage], [Place.v1.getWithLineage]]);
      chai.expect(getWithLineage.args).to.deep.equal([[Qualifier.byUuid('ad06d137')], [Qualifier.byUuid('hc')]]);
    });

    it('returns err if contact does not have name', () => {
      const place = {
        name: 'HC',
        type: CONTACT_TYPES.DISTRICT_HOSPITAL,
        contact: {
          type: 'person'
        }
      };
      const post = db.medic.post;
      return controller
        ._createPlaces(place)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.message).to.equal('Person is missing a "name" property.');
          chai.expect(post.callCount).to.equal(0);
        });
    });

    it('returns err if contact does not exist', async () => {
      const place = {
        name: 'HC',
        type: CONTACT_TYPES.DISTRICT_HOSPITAL,
        contact: 'person'
      };
      getWithLineage.resolves(null);
      const post = db.medic.post;
      await chai.expect(controller._createPlaces(place)).to.be.rejectedWith('Failed to find person.');

      chai.expect(post.callCount).to.equal(0);
      chai.expect(dataContext.bind.calledOnce).to.be.true;
      chai.expect(getWithLineage.calledOnceWithExactly(Qualifier.byUuid('person'))).to.be.true;
    });

    it('rejects contacts with wrong type', () => {
      const place = {
        name: 'HC',
        type: CONTACT_TYPES.DISTRICT_HOSPITAL,
        contact: {
          name: 'John Doe',
          type: 'x'
        }
      };
      const post = db.medic.post;
      return controller
        ._createPlaces(place)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.message).to.equal('Wrong type, this is not a person.');
          chai.expect(post.callCount).to.equal(0);
        });
    });


    it('supports parents defined as uuids.', async () => {
      const place = {
        name: 'CHP Area One',
        type: CONTACT_TYPES.HEALTH_CENTER,
        parent: 'ad06d137'
      };
      getWithLineage.resolves({
        _id: 'ad06d137',
        name: 'CHP Branch One',
        type: CONTACT_TYPES.DISTRICT_HOSPITAL
      });
      db.medic.post.callsFake(doc => {
        // the parent should be created/resolved, parent id should be set.
        chai.expect(doc.name).to.equal('CHP Area One');
        chai.expect(doc.type).to.equal(CONTACT_TYPES.HEALTH_CENTER);
        chai.expect(doc.parent._id).to.equal('ad06d137');
        chai.expect(doc.parent.name).to.equal(undefined); // minified
        chai.expect(doc.parent.type).to.equal(undefined); // minified
        return Promise.resolve({ id: 'abc123' });
      });

      const actual = await controller._createPlaces(place);

      chai.expect(actual).to.deep.equal({ id: 'abc123' });
      chai.expect(dataContext.bind.calledOnceWithExactly(Place.v1.getWithLineage)).to.be.true;
      chai.expect(getWithLineage.calledOnceWithExactly(Qualifier.byUuid('ad06d137'))).to.be.true;
    });

    it('rejects invalid reported_date.', () => {
      const place = {
        name: 'Test',
        type: CONTACT_TYPES.DISTRICT_HOSPITAL,
        reported_date: 'x'
      };
      sinon.stub(cutils, 'isDateStrValid').returns(false);
      return controller
        ._createPlaces(place)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.code).to.equal(400);
          chai.expect(err.message).to.equal('Reported date on place  is invalid: x');
        });
    });

    it('accepts valid reported_date in ms since epoch', () => {
      const place = {
        name: 'Test',
        type: CONTACT_TYPES.DISTRICT_HOSPITAL,
        reported_date: '123'
      };
      db.medic.post;
      return controller._createPlaces(place).then(() => {
        chai.expect(db.medic.post.args[0][0].reported_date).to.equal(123);
      });
    });

    it('accepts valid reported_date in string format', () => {
      const place = {
        name: 'Test',
        type: CONTACT_TYPES.DISTRICT_HOSPITAL,
        reported_date: '2011-10-10T14:48:00-0300'
      };
      const expected = new Date('2011-10-10T14:48:00-0300').valueOf();
      db.medic.post;
      return controller._createPlaces(place).then(() => {
        chai.expect(db.medic.post.args[0][0].reported_date).to.equal(expected);
      });
    });

    it('sets a default reported_date.', () => {
      const place = {
        name: 'Test',
        type: CONTACT_TYPES.DISTRICT_HOSPITAL
      };
      db.medic.post;
      return controller._createPlaces(place).then(() => {
        // should be set to within 5 seconds of now
        const expected = new Date().valueOf();
        const actual = db.medic.post.args[0][0].reported_date;
        chai.expect(actual).to.not.be.above(expected);
        chai.expect(actual).to.be.above(expected - 5000);
      });
    });

  });

  describe('updatePlace', () => {

    it('errors with empty data', () => {
      return controller
        .updatePlace('123', {})
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err.code).to.equal(400);
        });
    });

    it('handles contact field', () => {
      const data = {
        contact: '71df9'
      };
      sinon.stub(controller, 'getPlace').resolves({});
      sinon.stub(controller, '_validatePlace').resolves();
      sinon.stub(people, 'getOrCreatePerson').resolves({ _id: 'a', name: 'Jack' });
      db.medic.post.callsFake(doc => {
        chai.expect(doc.contact._id).to.equal('a');
        chai.expect(doc.contact.name).to.equal(undefined); // minified
        return Promise.resolve({ id: 'x', rev: 'y' });
      });
      return controller.updatePlace('123', data).then(actual => {
        chai.expect(actual).to.deep.equal({ id: 'x', rev: 'y' });
      });
    });

    it('handles parent field', () => {
      const data = {
        parent: '71df9'
      };
      sinon.stub(controller, 'getPlace').resolves({});
      sinon.stub(controller, '_validatePlace').resolves();
      sinon.stub(controller, 'getOrCreatePlace').resolves({ _id: 'a', name: 'Jack' });
      db.medic.post.callsFake(doc => {
        chai.expect(doc.parent._id).to.equal('a');
        chai.expect(doc.parent.name).to.equal(undefined); // minified
        return Promise.resolve({ id: 'x', rev: 'y' });
      });
      return controller.updatePlace('123', data).then(actual => {
        chai.expect(actual).to.deep.equal({ id: 'x', rev: 'y' });
      });
    });

    it('errors when function in series fails', () => {
      const data = {
        contact: '71df9'
      };
      sinon.stub(controller, 'getPlace').resolves({});
      sinon.stub(controller, '_validatePlace').resolves();
      sinon.stub(people, 'getOrCreatePerson').returns(Promise.reject('go away'));
      return controller
        .updatePlace('123', data)
        .then(() => chai.expect.fail('should fail'))
        .catch(err => {
          chai.expect(err).to.equal('go away');
        });
    });

  });

  describe('placesExist', () => {
    it('should throw error on invalid input', async () => {
      await chai.expect(controller.placesExist()).to.be.eventually.rejectedWith('Invalid place ids list');
      await chai.expect(controller.placesExist({})).to.be.eventually.rejectedWith('Invalid place ids list');
      await chai.expect(controller.placesExist('a')).to.be.eventually.rejectedWith('Invalid place ids list');
    });

    it('should throw an error if a place has an error', async () => {
      db.medic.allDocs.resolves({
        rows: [
          { id: '1', error: 'not found' },
          { id: '2', doc: { _id: '2' } },
        ]
      });

      await chai.expect(controller.placesExist(['1', '2'])).to.be.eventually.rejectedWith(`Failed to find place 1`);
      chai.expect(db.medic.allDocs.args).to.deep.equal([[{ keys: ['1', '2'], include_docs: true }]]);
    });

    it('should throw an error if a place is not found', async () => {
      sinon.stub(contactTypesUtils, 'isPlace').returns(true);
      db.medic.allDocs.resolves({
        rows: [
          { id: '2', doc: { _id: '2' } },
          { id: '1' },
        ]
      });

      await chai.expect(controller.placesExist(['1', '2'])).to.be.eventually.rejectedWith(`Failed to find place 1`);
    });

    it('should throw an error if any result is not a place', async () => {
      sinon.stub(contactTypesUtils, 'isPlace').returns(false);
      db.medic.allDocs.resolves({
        rows: [
          { id: '2', doc: { _id: '2' } },
          { id: '1', doc: { _id: '1' } },
        ]
      });

      await chai.expect(controller.placesExist(['1', '2'])).to.be.eventually.rejectedWith(`Failed to find place 2`);
      chai.expect(contactTypesUtils.isPlace.args[0][1]).to.deep.equal({ _id: '2' });
    });

    it('should succeed if all places are found', async () => {
      sinon.stub(contactTypesUtils, 'isPlace').returns(true);
      db.medic.allDocs.resolves({
        rows: [
          { id: '2', doc: { _id: '2' } },
          { id: '1', doc: { _id: '1' } },
          { id: '3', doc: { _id: '3' } },
        ]
      });

      chai.expect(await controller.placesExist(['1', '2', '3'])).to.equal(true);
      chai.expect(contactTypesUtils.isPlace.args[0][1]).to.deep.equal({ _id: '2' });
      chai.expect(contactTypesUtils.isPlace.args[1][1]).to.deep.equal({ _id: '1' });
      chai.expect(contactTypesUtils.isPlace.args[2][1]).to.deep.equal({ _id: '3' });
    });
  });

  describe('preparePlaceContact', () => {
    it('adds default person type', () => {
      return controller._preparePlaceContact({ name: 'test' }).then(({ exists, contact }) => {
        chai.expect(exists).to.equal(false);
        chai.expect(contact).to.have.property('type');
        chai.expect(contact).property('type').equal('person');
      });
    });

    it('rejects if contact does not exist', async () => {
      getWithLineage.resolves(null);

      await chai.expect(controller._preparePlaceContact('test')).to.be.rejectedWith('Failed to find person.');

      chai.expect(dataContext.bind.calledOnce).to.be.true;
      chai.expect(getWithLineage.calledOnceWithExactly(Qualifier.byUuid('test'))).to.be.true;
    });

    it('rejects non-object non-string contact', async () => {
      await chai.expect(controller._preparePlaceContact(42)).to.be.rejectedWith();
    });
  });

  describe('createPlace with existing contact', () => {
    it('creates place with existing string contact', async () => {
      sinon.stub(controller, '_validatePlace').resolves();
      sinon.stub(people, 'getOrCreatePerson').resolves({ _id: 'person-id', name: 'Jim' });
      db.medic.post.resolves({ id: 'place-id', rev: '1' });

      const result = await controller._createPlace({
        name: 'Test Place',
        type: CONTACT_TYPES.DISTRICT_HOSPITAL,
        contact: 'person-id'
      });

      chai.expect(result).to.deep.include({ contact: { id: 'person-id' } });
      chai.expect(db.medic.post.args[0][0].contact).to.equal('person-id');
    });
  });

  describe('getOrCreatePlace', () => {
    it('fetches place when given string id', async () => {
      sinon.stub(controller, 'getPlace').resolves({ _id: 'place-id' });
      const result = await controller.getOrCreatePlace('place-id');
      chai.expect(result._id).to.equal('place-id');
    });

    it('creates and returns place when given new object', async () => {
      sinon.stub(controller, '_createPlaces').resolves({ id: 'new-place' });
      sinon.stub(controller, 'getPlace').resolves({ _id: 'new-place' });
      const result = await controller.getOrCreatePlace({ name: 'Test', type: CONTACT_TYPES.DISTRICT_HOSPITAL });
      chai.expect(result._id).to.equal('new-place');
    });

    it('rejects existing place with _rev', async () => {
      await chai.expect(controller.getOrCreatePlace({ _id: 'x', _rev: '1' }))
        .to.be.rejectedWith('Place must be a new object');
    });
  });

});
