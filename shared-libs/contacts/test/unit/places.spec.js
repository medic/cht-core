const chai = require('chai');
const sinon = require('sinon');
const config = require('../../src/libs/config');
const db = require('../../src/libs/db');
const controller = require('../../src/places');
const people = require('../../src/people');
const cutils = require('../../src/libs/utils');
const lineage = require('../../src/libs/lineage');

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
    id: 'health_center',
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
    parents: ['health_center'],
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
    parents: ['district_hospital', 'health_center', 'clinic'],
    icon: 'medic-person',
    create_form: 'form:contact:person:create',
    edit_form: 'form:contact:person:edit',
    person: true
  }
];

describe('places controller', () => {
  let fetchHydratedDoc;

  beforeEach(() => {
    config.init({ get: sinon.stub() });
    db.init({ medic: { post: sinon.stub() } });
    examplePlace = {
      type: 'clinic',
      name: 'St. Paul',
      parent: 'x'
    };
    config.get.returns({ contact_types: contactTypes });
    lineage.init(require('@medic/lineage')(Promise, db.medic));

    fetchHydratedDoc = sinon.stub(lineage, 'fetchHydratedDoc');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('validatePlace', () => {

    it('returns error on string argument', done => {
      controller._validatePlace('x').catch(err => {
        chai.expect(err.message).to.equal('Place must be an object.');
        done();
      });
    });

    it('returns error on number argument', done => {
      controller._validatePlace(42).catch(err => {
        chai.expect(err.message).to.equal('Place must be an object.');
        done();
      });
    });

    it('returns error when doc is wrong type', done => {
      examplePlace._id = 'xyz';
      examplePlace.type = 'food';
      controller._validatePlace(examplePlace).catch(err => {
        chai.expect(err.message).to.equal('Wrong type, object xyz is not a place.');
        done();
      });
    });

    it('returns error when doc is person', done => {
      examplePlace._id = 'xyz';
      examplePlace.type = 'person';
      controller._validatePlace(examplePlace).catch(err => {
        chai.expect(err.message).to.equal('Wrong type, object xyz is not a place.');
        done();
      });
    });

    it('returns error when doc type is not "contact"', done => {
      examplePlace._id = 'xyz';
      examplePlace.type = 'shoe';
      examplePlace.contact_type = 'clinic';
      controller._validatePlace(examplePlace).catch(err => {
        chai.expect(err.message).to.equal('Wrong type, object xyz is not a place.');
        done();
      });
    });

    it('returns error if clinic is missing parent', done => {
      examplePlace._id = 'xyz';
      delete examplePlace.parent;
      controller._validatePlace(examplePlace).catch(err => {
        chai.expect(err.message).to.equal('Place xyz is missing a "parent" property.');
        done();
      });
    });

    it('returns error if clinic has null parent', done => {
      examplePlace._id = 'xyz';
      examplePlace.parent = null;
      controller._validatePlace(examplePlace).catch(err => {
        chai.expect(err.message).to.equal('Place xyz is missing a "parent" property.');
        done();
      });
    });

    it('returns error if health center is missing parent', done => {
      examplePlace._id = 'xyz';
      delete examplePlace.parent;
      examplePlace.type = 'health_center';
      controller._validatePlace(examplePlace).catch(err => {
        chai.expect(err.message).to.equal('Place xyz is missing a "parent" property.');
        done();
      });
    });

    it('returns error if health center has wrong parent type', done => {
      const data = {
        _id: 'xyz',
        type: 'health_center',
        name: 'St. Paul',
        parent: {
          name: 'MoH',
          type: 'national_office'
        }
      };
      controller._validatePlace(data).catch(err => {
        chai.expect(err.message)
          .to.equal('health_center "xyz" should have one of the following parent types: "district_hospital".');
        done();
      });
    });

    it('returns error if clinic has wrong parent type', done => {
      examplePlace._id = 'xyz';
      examplePlace.parent = {
        name: 'St Paul Hospital',
        type: 'district_hospital'
      };
      controller._validatePlace(examplePlace).catch(err => {
        chai.expect(err.message)
          .to.equal('clinic "xyz" should have one of the following parent types: "health_center".');
        done();
      });
    });

    it('does not return error if district is missing parent', () => {
      delete examplePlace.parent;
      examplePlace.type = 'district_hospital';
      return controller._validatePlace(examplePlace);
    });

  });

  describe('getPlace', () => {

    it('returns custom message on 404 errors.', done => {
      fetchHydratedDoc.rejects({ status: 404 });
      controller.getPlace('x').catch(err => {
        chai.expect(err.message).to.equal('Failed to find place.');
        done();
      });
    });

  });

  describe('createPlaces', () => {

    it('rejects objects with wrong type.', done => {
      const place = {
        name: 'CHP Family',
        type: 'food'
      };
      const post = db.medic.post;
      controller._createPlaces(place).catch(err => {
        chai.expect(err.message).to.equal('Wrong type, object  is not a place.');
        chai.expect(post.callCount).to.equal(0);
        done();
      });
    });

    it('rejects parent objects with wrong type.', done => {
      const place = {
        name: 'CHP Family',
        type: 'clinic',
        parent: {
          name: 'CHP Area',
          type: 'food'
        }
      };
      const post = db.medic.post;
      controller._createPlaces(place).catch(err => {
        chai.expect(err.message).to.equal('Wrong type, object  is not a place.');
        chai.expect(post.callCount).to.equal(0);
        done();
      });
    });

    it('rejects when parent lookup fails.', done => {
      const place = {
        name: 'CHP Family',
        type: 'food',
        parent: 'x'
      };
      const post = db.medic.post;
      sinon.stub(controller, 'getPlace').returns(Promise.reject('boom'));
      controller._createPlaces(place).catch(err => {
        chai.expect(err).to.equal('boom');
        chai.expect(post.callCount).to.equal(0);
        done();
      });
    });

    it('supports objects with name and right type.', () => {
      const place = {
        name: 'CHP Family',
        type: 'clinic',
        parent: {
          name: 'CHP Area One',
          type: 'health_center',
          parent: {
            name: 'CHP Branch One',
            type: 'district_hospital'
          }
        }
      };
      db.medic.post.callsFake(doc => {
        if (doc.name === 'CHP Branch One') {
          return Promise.resolve({id: 'abc'});
        }
        if (doc.name === 'CHP Area One') {
          // the parent should be created/resolved, parent id should be set.
          chai.expect(doc.parent._id).to.equal('abc');
          chai.expect(doc.parent.name).to.equal(undefined); // minified
          chai.expect(doc.parent.type).to.equal(undefined); // minified
          return Promise.resolve({id: 'def'});
        }
        if (doc.name === 'CHP Family') {
          // both parents should be created/resolved
          chai.expect(doc.parent._id).to.equal('def');
          chai.expect(doc.parent.name).to.equal(undefined); // minified
          chai.expect(doc.parent.type).to.equal(undefined); // minified
          chai.expect(doc.parent.parent._id).to.equal('abc');
          chai.expect(doc.parent.parent.name).to.equal(undefined); // minified
          chai.expect(doc.parent.parent.type).to.equal(undefined); // minified
          return Promise.resolve({id: 'ghi'});
        }
      });
      fetchHydratedDoc.callsFake(id => {
        if (id === 'abc') {
          return Promise.resolve({
            _id: 'abc',
            name: 'CHP Branch One',
            type: 'district_hospital'
          });
        }
        if (id === 'def') {
          return Promise.resolve({
            _id: 'def',
            name: 'CHP Area One',
            type: 'health_center',
            parent: {
              _id: 'abc',
              name: 'CHP Branch One',
              type: 'district_hospital'
            }
          });
        }
        if (id === 'ghi') {
          return Promise.resolve({
            _id: 'ghi',
            name: 'CHP Family',
            type: 'clinic',
            parent: {
              _id: 'def',
              name: 'CHP Area One',
              type: 'health_center',
              parent: {
                _id: 'abc',
                name: 'CHP Branch One',
                type: 'district_hospital'
              }
            }
          });
        }
      });
      return controller._createPlaces(place).then(actual => {
        chai.expect(actual).to.deep.equal({id: 'ghi'});
      });
    });

    it('creates contacts', () => {
      const place = {
        name: 'CHP Family',
        type: 'health_center',
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
      db.medic.post.callsFake(doc => {
        if (doc.name === 'CHP Family') {
          return Promise.resolve({ id: 'hc', rev: '1' });
        }
        if (doc.name === 'CHP Branch One') {
          return Promise.resolve({ id: 'ad06d137' });
        }
      });
      fetchHydratedDoc.callsFake(id => {
        if (id === 'hc') {
          return Promise.resolve({
            name: 'CHP Family',
            type: 'health_center',
            parent: {
              _id: 'ad06d137',
              name: 'CHP Branch One',
              type: 'district_hospital'
            },
          });
        }
        if (id === 'ad06d137') {
          return Promise.resolve({
            _id: 'ad06d137',
            name: 'CHP Branch One',
            type: 'district_hospital'
          });
        }
      });
      return controller._createPlaces(place).then(actual => {
        chai.expect(actual).to.deep.equal({
          id: 'hc',
          rev: '1',
          contact: {
            id: 'qwe',
            rev: '1'
          }
        });
      });
    });

    it('supports parents defined as uuids.', () => {
      const place = {
        name: 'CHP Area One',
        type: 'health_center',
        parent: 'ad06d137'
      };
      fetchHydratedDoc.resolves({
        _id: 'ad06d137',
        name: 'CHP Branch One',
        type: 'district_hospital'
      });
      db.medic.post.callsFake(doc => {
        // the parent should be created/resolved, parent id should be set.
        chai.expect(doc.name).to.equal('CHP Area One');
        chai.expect(doc.type).to.equal('health_center');
        chai.expect(doc.parent._id).to.equal('ad06d137');
        chai.expect(doc.parent.name).to.equal(undefined); // minified
        chai.expect(doc.parent.type).to.equal(undefined); // minified
        return Promise.resolve({ id: 'abc123' });
      });
      return controller._createPlaces(place).then(actual => {
        chai.expect(actual).to.deep.equal({ id: 'abc123' });
      });
    });

    it('rejects invalid reported_date.', done => {
      const place = {
        name: 'Test',
        type: 'district_hospital',
        reported_date: 'x'
      };
      sinon.stub(cutils, 'isDateStrValid').returns(false);
      controller._createPlaces(place).catch(err => {
        chai.expect(err.code).to.equal(400);
        chai.expect(err.message).to.equal('Reported date on place  is invalid: x');
        done();
      });
    });

    it('accepts valid reported_date in ms since epoch', () => {
      const place = {
        name: 'Test',
        type: 'district_hospital',
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
        type: 'district_hospital',
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
        type: 'district_hospital'
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

    it('errors with empty data', done => {
      controller.updatePlace('123', {}).catch(err => {
        chai.expect(err.code).to.equal(400);
        done();
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

    it('errors when function in series fails', done => {
      const data = {
        contact: '71df9'
      };
      sinon.stub(controller, 'getPlace').resolves({});
      sinon.stub(controller, '_validatePlace').resolves();
      sinon.stub(people, 'getOrCreatePerson').returns(Promise.reject('go away'));
      controller.updatePlace('123', data).catch(err => {
        chai.expect(err).to.equal('go away');
        done();
      });
    });

  });

});
