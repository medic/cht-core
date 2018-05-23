const controller = require('../../../src/controllers/places'),
      chai = require('chai'),
      people = require('../../../src/controllers/people'),
      cutils = require('../../../src/controllers/utils'),
      db = require('../../../src/db-nano'),
      sinon = require('sinon').sandbox.create();

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

  it('validatePlace returns error on string argument.', done => {
    controller._validatePlace('x', err => {
      chai.expect(err.message).to.equal('Place must be an object.');
      done();
    });
  });

  it('validatePlace returns error on number argument.', done => {
    controller._validatePlace(42, err => {
      chai.expect(err.message).to.equal('Place must be an object.');
      done();
    });
  });

  it('validatePlace returns error when doc is wrong type.', done => {
    examplePlace._id = 'xyz';
    examplePlace.type = 'food';
    controller._validatePlace(examplePlace, err => {
      chai.expect(err.message, 'Wrong type).to.equal(object xyz is not a place.');
      done();
    });
  });

  it('validatePlace returns error if clinic is missing parent', done => {
    examplePlace._id = 'xyz';
    delete examplePlace.parent;
    controller._validatePlace(examplePlace, err => {
      chai.expect(err.message).to.equal('Place xyz is missing a "parent" property.');
      done();
    });
  });

  it('validatePlace returns error if clinic has null parent', done => {
    examplePlace._id = 'xyz';
    examplePlace.parent = null;
    controller._validatePlace(examplePlace, err => {
      chai.expect(err.message).to.equal('Place xyz is missing a "parent" property.');
      done();
    });
  });

  it('validatePlace returns error if health center is missing parent', done => {
    examplePlace._id = 'xyz';
    delete examplePlace.parent;
    examplePlace.type = 'health_center';
    controller._validatePlace(examplePlace, err => {
      chai.expect(err.message).to.equal('Place xyz is missing a "parent" property.');
      done();
    });
  });

  it('validatePlace returns error if health center has wrong parent type', done => {
    const data = {
      _id: 'xyz',
      type: 'health_center',
      name: 'St. Paul',
      parent: {
        name: 'MoH',
        type: 'national_office'
      }
    };
    controller._validatePlace(data, err => {
      chai.expect(err.message).to.equal('Health Center xyz should have "district_hospital" parent type.');
      done();
    });
  });

  it('validatePlace returns error if clinic has wrong parent type', done => {
    examplePlace._id = 'xyz';
    examplePlace.parent = {
      name: 'St Paul Hospital',
      type: 'district_hospital'
    };
    controller._validatePlace(examplePlace, err => {
      chai.expect(err.message).to.equal('Clinic xyz should have "health_center" parent type.');
      done();
    });
  });

  it('validatePlace does not return error if district is missing parent', done => {
    delete examplePlace.parent;
    examplePlace.type = 'district_hospital';
    controller._validatePlace(examplePlace, err => {
      done(err);
    });
  });

  it('validatePlace does not return error if national office is missing parent', done => {
    delete examplePlace.parent;
    examplePlace.type = 'national_office';
    controller._validatePlace(examplePlace, err => {
      done(err);
    });
  });

  it('getPlace returns custom message on 404 errors.', done => {
    sinon.stub(controller._lineage, 'fetchHydratedDoc').returns(Promise.reject({statusCode: 404}));
    controller.getPlace('x', err => {
      chai.expect(err.message).to.equal('Failed to find place.');
      done();
    });
  });

  it('createPlaces rejects objects with wrong type.', done => {
    const place = {
      name: 'CHP Family',
      type: 'food'
    };
    const insert = sinon.stub(db.medic, 'insert');
    controller._createPlaces(place, err => {
      chai.expect(err.message).to.equal('Wrong type, object  is not a place.');
      chai.expect(insert.callCount).to.equal(0);
      done();
    });
  });

  it('createPlaces rejects parent objects with wrong type.', done => {
    const place = {
      name: 'CHP Family',
      type: 'clinic',
      parent: {
        name: 'CHP Area',
        type: 'food'
      }
    };
    const insert = sinon.stub(db.medic, 'insert');
    controller._createPlaces(place, err => {
      chai.expect(err.message).to.equal('Wrong type, object  is not a place.');
      chai.expect(insert.callCount).to.equal(0);
      done();
    });
  });

  it('createPlaces rejects when parent lookup fails.', done => {
    const place = {
      name: 'CHP Family',
      type: 'food',
      parent: 'x'
    };
    const insert = sinon.stub(db.medic, 'insert');
    sinon.stub(controller, 'getPlace').callsArgWith(1, 'boom');
    controller._createPlaces(place, err => {
      chai.expect(err).to.deep.equal('boom');
      chai.expect(insert.callCount).to.equal(0);
      done();
    });
  });

  it('createPlaces supports objects with name and right type.', done => {
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
    sinon.stub(db.medic, 'insert').callsFake((doc, cb) => {
      if (doc.name === 'CHP Branch One') {
        return cb(null, {id: 'abc'});
      }
      if (doc.name === 'CHP Area One') {
        // the parent should be created/resolved, parent id should be set.
        chai.expect(doc.parent._id).to.equal('abc');
        chai.expect(doc.parent.name).to.equal(undefined); // minified
        chai.expect(doc.parent.type).to.equal(undefined); // minified
        return cb(null, {id: 'def'});
      }
      if (doc.name === 'CHP Family') {
        // both parents should be created/resolved
        chai.expect(doc.parent._id).to.equal('def');
        chai.expect(doc.parent.name).to.equal(undefined); // minified
        chai.expect(doc.parent.type).to.equal(undefined); // minified
        chai.expect(doc.parent.parent._id).to.equal('abc');
        chai.expect(doc.parent.parent.name).to.equal(undefined); // minified
        chai.expect(doc.parent.parent.type).to.equal(undefined); // minified
        return cb(null, {id: 'ghi'});
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
    controller._createPlaces(place, (err, val) => {
      chai.expect({id: 'ghi'}).to.deep.equal(val);
      done();
    });
  });

  it('createPlaces creates contacts', done => {
    const place = {
      name: 'CHP Family',
      type: 'health_center',
      parent: 'ad06d137',
      contact: {
        name: 'Jim',
        type: 'person'
      }
    };
    sinon.stub(people, 'getOrCreatePerson').callsFake((contact, cb) => {
      return cb(null, {
        _id: 'qwe',
        name: 'Jim',
        type: 'person'
      });
    });
    sinon.stub(controller._lineage, 'fetchHydratedDoc').returns(Promise.resolve({
      _id: 'ad06d137',
      name: 'CHP Branch One',
      type: 'district_hospital'
    }));
    sinon.stub(db.medic, 'insert').callsFake((doc, cb) => {
      chai.expect(doc.contact._id).to.equal('qwe');
      chai.expect(doc.contact.name).to.equal(undefined); // minified
      chai.expect(doc.contact.type).to.equal(undefined); // minified
      return cb(null, {id: 'ghi'});
    });
    controller._createPlaces(place, (err, val) => {
      chai.expect({id: 'ghi'}).to.deep.equal(val);
      done();
    });
  });

  it('createPlaces supports parents defined as uuids.', done => {
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
    sinon.stub(db.medic, 'insert').callsFake((doc, cb) => {
      // the parent should be created/resolved, parent id should be set.
      chai.expect(doc.name).to.equal('CHP Area One');
      chai.expect(doc.type).to.equal('health_center');
      chai.expect(doc.parent._id).to.equal('ad06d137');
      chai.expect(doc.parent.name).to.equal(undefined); // minified
      chai.expect(doc.parent.type).to.equal(undefined); // minified
      return cb(null, {id: 'abc123'});
    });
    controller._createPlaces(place, (err, val) => {
      chai.expect({id: 'abc123'}).to.deep.equal(val);
      done();
    });
  });

  it('createPlaces rejects invalid reported_date.', done => {
    const place = {
      name: 'Test',
      type: 'district_hospital',
      reported_date: 'x'
    };
    sinon.stub(cutils, 'isDateStrValid').returns(false);
    controller.createPlace(place, err => {
      chai.expect(err.code).to.equal(400);
      chai.expect(err.message).to.equal('Reported date on place  is invalid: x');
      done();
    });
  });

  it('createPlaces accepts valid reported_date in ms since epoch', done => {
    const place = {
      name: 'Test',
      type: 'district_hospital',
      reported_date: '123'
    };
    sinon.stub(db.medic, 'insert').callsFake(doc => {
      chai.expect(doc.reported_date).to.equal(123);
      done();
    });
    controller._createPlaces(place);
  });

  it('createPlaces accepts valid reported_date in string format', done => {
    const place = {
      name: 'Test',
      type: 'district_hospital',
      reported_date: '2011-10-10T14:48:00-0300'
    };
    const expected = new Date('2011-10-10T14:48:00-0300').valueOf();
    sinon.stub(db.medic, 'insert').callsFake(doc => {
      chai.expect(doc.reported_date).to.equal(expected);
      done();
    });
    controller._createPlaces(place);
  });

  it('createPlaces sets a default reported_date.', done => {
    const place = {
      name: 'Test',
      type: 'district_hospital'
    };
    sinon.stub(db.medic, 'insert').callsFake(doc => {
      // should be set to within 5 seconds of now
      const now = new Date().valueOf();
      chai.expect(doc.reported_date).to.not.be.above(now);
      chai.expect(doc.reported_date).to.be.above(now - 5000);
      done();
    });
    controller._createPlaces(place);
  });

  it('updatePlace errors with empty data', done => {
    controller.updatePlace('123', {}, (err, resp) => {
      chai.expect(err.code).to.equal(400);
      chai.expect(resp).to.equal(undefined);
      done();
    });
  });

  it('updatePlace handles contact field', done => {
    const data = {
      contact: '71df9'
    };
    sinon.stub(controller, 'getPlace').callsArgWith(1, null, {});
    sinon.stub(controller, '_validatePlace').callsArg(1);
    sinon.stub(people, 'getOrCreatePerson').callsArgWith(1, null, { _id: 'a', name: 'Jack' });
    sinon.stub(db.medic, 'insert').callsFake((doc, cb) => {
      chai.expect(doc.contact._id).to.equal('a');
      chai.expect(doc.contact.name).to.equal(undefined); // minified
      cb(null, {id: 'x', rev: 'y'});
    });
    controller.updatePlace('123', data, (err, resp) => {
      chai.expect(resp).to.deep.equal({ id: 'x', rev: 'y' });
      done();
    });
  });


  it('updatePlace handles parent field', done => {
    const data = {
      parent: '71df9'
    };
    sinon.stub(controller, 'getPlace').callsArgWith(1, null, {});
    sinon.stub(controller, '_validatePlace').callsArg(1);
    sinon.stub(controller, 'getOrCreatePlace').callsArgWith(1, null, { _id: 'a', name: 'Jack' });
    sinon.stub(db.medic, 'insert').callsFake((doc, cb) => {
      chai.expect(doc.parent._id).to.equal('a');
      chai.expect(doc.parent.name).to.equal(undefined); // minified
      cb(null, {id: 'x', rev: 'y'});
    });
    controller.updatePlace('123', data, (err, resp) => {
      chai.expect(resp).to.deep.equal({ id: 'x', rev: 'y' });
      done();
    });
  });

  it('updatePlace errors when function in series fails', done => {
    const data = {
      contact: '71df9'
    };
    sinon.stub(controller, 'getPlace').callsArgWith(1, null, {});
    sinon.stub(controller, '_validatePlace').callsArg(1);
    sinon.stub(people, 'getOrCreatePerson').callsArgWith(1, 'go away');
    controller.updatePlace('123', data, err => {
      chai.expect(err).to.equal('go away');
      done();
    });
  });

});
