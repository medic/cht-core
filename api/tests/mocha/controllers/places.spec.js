const controller = require('../../../src/controllers/places'),
      chai = require('chai'),
      people = require('../../../src/controllers/people'),
      cutils = require('../../../src/controllers/utils'),
      db = require('../../../src/db-pouch'),
      sinon = require('sinon');

let examplePlace;

describe('places controller', () => {

  beforeEach(() => {
    examplePlace = {
      type: 'clinic',
      name: 'St. Paul',
      parent: 'x'
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('validatePlace', () => {

    it('returns error on string argument.', done => {
      controller._validatePlace('x').catch(err => {
        chai.expect(err.message).to.equal('Place must be an object.');
        done();
      });
    });

    it('returns error on number argument.', done => {
      controller._validatePlace(42).catch(err => {
        chai.expect(err.message).to.equal('Place must be an object.');
        done();
      });
    });

    it('returns error when doc is wrong type.', done => {
      examplePlace._id = 'xyz';
      examplePlace.type = 'food';
      controller._validatePlace(examplePlace).catch(err => {
        chai.expect(err.message, 'Wrong type).to.equal(object xyz is not a place.');
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
        chai.expect(err.message).to.equal('Health Center xyz should have "district_hospital" parent type.');
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
        chai.expect(err.message).to.equal('Clinic xyz should have "health_center" parent type.');
        done();
      });
    });

    it('does not return error if district is missing parent', () => {
      delete examplePlace.parent;
      examplePlace.type = 'district_hospital';
      return controller._validatePlace(examplePlace);
    });

    it('does not return error if national office is missing parent', () => {
      delete examplePlace.parent;
      examplePlace.type = 'national_office';
      return controller._validatePlace(examplePlace);
    });

  });

  describe('getPlace', () => {

    it('returns custom message on 404 errors.', done => {
      sinon.stub(controller._lineage, 'fetchHydratedDoc').returns(Promise.reject({statusCode: 404}));
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
      const post = sinon.stub(db.medic, 'post');
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
      const post = sinon.stub(db.medic, 'post');
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
      const post = sinon.stub(db.medic, 'post');
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
      sinon.stub(db.medic, 'post').callsFake(doc => {
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
      sinon.stub(controller._lineage, 'fetchHydratedDoc').callsFake(id => {
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
        name: 'Jim',
        type: 'person'
      });
      sinon.stub(controller._lineage, 'fetchHydratedDoc').returns(Promise.resolve({
        _id: 'ad06d137',
        name: 'CHP Branch One',
        type: 'district_hospital'
      }));
      sinon.stub(db.medic, 'post').callsFake(doc => {
        chai.expect(doc.contact._id).to.equal('qwe');
        chai.expect(doc.contact.name).to.equal(undefined); // minified
        chai.expect(doc.contact.type).to.equal(undefined); // minified
        return Promise.resolve({id: 'ghi'});
      });
      return controller._createPlaces(place).then(actual => {
        chai.expect(actual).to.deep.equal({id: 'ghi'});
      });
    });

    it('supports parents defined as uuids.', () => {
      const place = {
        name: 'CHP Area One',
        type: 'health_center',
        parent: 'ad06d137'
      };
      sinon.stub(controller._lineage, 'fetchHydratedDoc').returns(Promise.resolve({
        _id: 'ad06d137',
        name: 'CHP Branch One',
        type: 'district_hospital'
      }));
      sinon.stub(db.medic, 'post').callsFake(doc => {
        // the parent should be created/resolved, parent id should be set.
        chai.expect(doc.name).to.equal('CHP Area One');
        chai.expect(doc.type).to.equal('health_center');
        chai.expect(doc.parent._id).to.equal('ad06d137');
        chai.expect(doc.parent.name).to.equal(undefined); // minified
        chai.expect(doc.parent.type).to.equal(undefined); // minified
        return Promise.resolve({id: 'abc123'});
      });
      return controller._createPlaces(place).then(actual => {
        chai.expect(actual).to.deep.equal({id: 'abc123'});
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
      sinon.stub(db.medic, 'post');
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
      sinon.stub(db.medic, 'post');
      return controller._createPlaces(place).then(() => {
        chai.expect(db.medic.post.args[0][0].reported_date).to.equal(expected);
      });
    });

    it('sets a default reported_date.', () => {
      const place = {
        name: 'Test',
        type: 'district_hospital'
      };
      sinon.stub(db.medic, 'post');
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
      sinon.stub(db.medic, 'post').callsFake(doc => {
        chai.expect(doc.contact._id).to.equal('a');
        chai.expect(doc.contact.name).to.equal(undefined); // minified
        return Promise.resolve({id: 'x', rev: 'y'});
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
      sinon.stub(db.medic, 'post').callsFake(doc => {
        chai.expect(doc.parent._id).to.equal('a');
        chai.expect(doc.parent.name).to.equal(undefined); // minified
        return Promise.resolve({id: 'x', rev: 'y'});
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
