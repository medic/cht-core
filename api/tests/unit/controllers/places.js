const controller = require('../../../controllers/places'),
      people = require('../../../controllers/people'),
      cutils = require('../../../controllers/utils'),
      db = require('../../../db'),
      sinon = require('sinon').sandbox.create();

let examplePlace;

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

exports.setUp = callback => {
  examplePlace = {
    type: 'clinic',
    name: 'St. Paul',
    parent: 'x'
  };
  callback();
};

exports['validatePlace returns error on string argument.'] = test => {
  controller._validatePlace('x', err => {
    test.equal(err.message, 'Place must be an object.');
    test.done();
  });
};

exports['validatePlace returns error on number argument.'] = test => {
  controller._validatePlace(42, err => {
    test.equal(err.message, 'Place must be an object.');
    test.done();
  });
};

exports['validatePlace returns error when doc is wrong type.'] = test => {
  examplePlace._id = 'xyz';
  examplePlace.type = 'food';
  controller._validatePlace(examplePlace, err => {
    test.equal(err.message, 'Wrong type, object xyz is not a place.');
    test.done();
  });
};

exports['validatePlace returns error if clinic is missing parent'] = test => {
  examplePlace._id = 'xyz';
  delete examplePlace.parent;
  controller._validatePlace(examplePlace, err => {
    test.equal(err.message, 'Place xyz is missing a "parent" property.');
    test.done();
  });
};

exports['validatePlace returns error if clinic has null parent'] = test => {
  examplePlace._id = 'xyz';
  examplePlace.parent = null;
  controller._validatePlace(examplePlace, err => {
    test.equal(err.message, 'Place xyz is missing a "parent" property.');
    test.done();
  });
};

exports['validatePlace returns error if health center is missing parent'] = test => {
  examplePlace._id = 'xyz';
  delete examplePlace.parent;
  examplePlace.type = 'health_center';
  controller._validatePlace(examplePlace, err => {
    test.equal(err.message, 'Place xyz is missing a "parent" property.');
    test.done();
  });
};

exports['validatePlace returns error if health center has wrong parent type'] = test => {
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
    test.equal(err.message, 'Health Center xyz should have "district_hospital" parent type.');
    test.done();
  });
};

exports['validatePlace returns error if clinic has wrong parent type'] = test => {
  examplePlace._id = 'xyz';
  examplePlace.parent = {
    name: 'St Paul Hospital',
    type: 'district_hospital'
  };
  controller._validatePlace(examplePlace, err => {
    test.equal(err.message, 'Clinic xyz should have "health_center" parent type.');
    test.done();
  });
};

exports['validatePlace does not return error if district is missing parent'] = test => {
  delete examplePlace.parent;
  examplePlace.type = 'district_hospital';
  controller._validatePlace(examplePlace, err => {
    test.ok(!err);
    test.done();
  });
};

exports['validatePlace does not return error if national office is missing parent'] = test => {
  delete examplePlace.parent;
  examplePlace.type = 'national_office';
  controller._validatePlace(examplePlace, err => {
    test.ok(!err);
    test.done();
  });
};

exports['getPlace returns custom message on 404 errors.'] = test => {
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {total_rows: 1000, offset: 0, rows: []});
  controller.getPlace('x', err => {
    test.equal(err.message, 'Failed to find place.');
    test.done();
  });
};

exports['createPlaces rejects objects with wrong type.'] = test => {
  const place = {
    name: 'CHP Family',
    type: 'food'
  };
  const insert = sinon.stub(db.medic, 'insert');
  controller._createPlaces(place, err => {
    test.ok(err);
    test.equal(insert.callCount, 0);
    test.done();
  });
};

exports['createPlaces rejects parent objects with wrong type.'] = test => {
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
    test.ok(err);
    test.equal(insert.callCount, 0);
    test.done();
  });
};

exports['createPlaces rejects when parent lookup fails.'] = test => {
  const place = {
    name: 'CHP Family',
    type: 'food',
    parent: 'x'
  };
  const insert = sinon.stub(db.medic, 'insert');
  sinon.stub(controller, 'getPlace').callsArgWith(1, 'boom');
  controller._createPlaces(place, err => {
    test.ok(err);
    test.equal(insert.callCount, 0);
    test.done();
  });
};

exports['createPlaces supports objects with name and right type.'] = test => {
  test.expect(10);
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
      test.equal(doc.parent._id, 'abc');
      test.equal(doc.parent.name, undefined); // minified
      test.equal(doc.parent.type, undefined); // minified
      return cb(null, {id: 'def'});
    }
    if (doc.name === 'CHP Family') {
      // both parents should be created/resolved
      test.equal(doc.parent._id, 'def');
      test.equal(doc.parent.name, undefined); // minified
      test.equal(doc.parent.type, undefined); // minified
      test.equal(doc.parent.parent._id, 'abc');
      test.equal(doc.parent.parent.name, undefined); // minified
      test.equal(doc.parent.parent.type, undefined); // minified
      return cb(null, {id: 'ghi'});
    }
  });
  sinon.stub(controller, 'fetchHydratedDoc').callsFake((id, cb) => {
    if (id === 'abc') {
      return cb(null, {
        _id: 'abc',
        name: 'CHP Branch One',
        type: 'district_hospital'
      });
    }
    if (id === 'def') {
      return cb(null, {
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
      return cb(null, {
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
    test.deepEqual({id: 'ghi'}, val);
    test.done();
  });
};

exports['createPlaces creates contacts'] = test => {
  test.expect(4);
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
  sinon.stub(controller, 'fetchHydratedDoc').callsFake((id, cb) => {
    return cb(null, {
      _id: 'ad06d137',
      name: 'CHP Branch One',
      type: 'district_hospital'
    });
  });
  sinon.stub(db.medic, 'insert').callsFake((doc, cb) => {
    test.equal(doc.contact._id, 'qwe');
    test.equal(doc.contact.name, undefined); // minified
    test.equal(doc.contact.type, undefined); // minified
    return cb(null, {id: 'ghi'});
  });
  controller._createPlaces(place, (err, val) => {
    test.deepEqual({id: 'ghi'}, val);
    test.done();
  });
};

exports['createPlaces supports parents defined as uuids.'] = test => {
  test.expect(6);
  const place = {
    name: 'CHP Area One',
    type: 'health_center',
    parent: 'ad06d137'
  };
  sinon.stub(controller, 'fetchHydratedDoc').callsFake((id, cb) => {
    return cb(null, {
      _id: 'ad06d137',
      name: 'CHP Branch One',
      type: 'district_hospital'
    });
  });
  sinon.stub(db.medic, 'insert').callsFake((doc, cb) => {
    // the parent should be created/resolved, parent id should be set.
    test.equal(doc.name, 'CHP Area One');
    test.equal(doc.type, 'health_center');
    test.equal(doc.parent._id, 'ad06d137');
    test.equal(doc.parent.name, undefined); // minified
    test.equal(doc.parent.type, undefined); // minified
    return cb(null, {id: 'abc123'});
  });
  controller._createPlaces(place, (err, val) => {
    test.deepEqual({id: 'abc123'}, val);
    test.done();
  });
};

exports['createPlaces rejects invalid reported_date.'] = test => {
  const place = {
    name: 'Test',
    type: 'district_hospital',
    reported_date: 'x'
  };
  sinon.stub(cutils, 'isDateStrValid').returns(false);
  controller.createPlace(place, err => {
    test.equal(err.code, 400);
    test.ok(err.message.indexOf('date') > -1);
    test.done();
  });
};

exports['createPlaces accepts valid reported_date in ms since epoch'] = test => {
  const place = {
    name: 'Test',
    type: 'district_hospital',
    reported_date: '123'
  };
  sinon.stub(db.medic, 'insert').callsFake(doc => {
    test.ok(doc.reported_date === 123);
    test.done();
  });
  controller._createPlaces(place);
};

exports['createPlaces accepts valid reported_date in string format'] = test => {
  const place = {
    name: 'Test',
    type: 'district_hospital',
    reported_date: '2011-10-10T14:48:00-0300'
  };
  sinon.stub(db.medic, 'insert').callsFake(doc => {
    test.ok(doc.reported_date === new Date('2011-10-10T14:48:00-0300').valueOf());
    test.done();
  });
  controller._createPlaces(place);
};

exports['createPlaces sets a default reported_date.'] = test => {
  const place = {
    name: 'Test',
    type: 'district_hospital'
  };
  sinon.stub(db.medic, 'insert').callsFake(doc => {
    // should be set to within 5 seconds of now
    test.ok(doc.reported_date <= (new Date().valueOf()));
    test.ok(doc.reported_date > (new Date().valueOf() - 5000));
    test.done();
  });
  controller._createPlaces(place);
};

exports['updatePlace errors with empty data'] = test => {
  controller.updatePlace('123', {}, (err, resp) => {
    test.equal(err.code, 400);
    test.ok(!resp);
    test.done();
  });
};

exports['updatePlace handles contact field'] = test => {
  const data = {
    contact: '71df9'
  };
  sinon.stub(controller, 'getPlace').callsArgWith(1, null, {});
  sinon.stub(controller, '_validatePlace').callsArg(1);
  sinon.stub(people, 'getOrCreatePerson').callsArgWith(1, null, { _id: 'a', name: 'Jack' });
  sinon.stub(db.medic, 'insert').callsFake((doc, cb) => {
    test.equals(doc.contact._id, 'a');
    test.equals(doc.contact.name, undefined); // minified
    cb(null, {id: 'x', rev: 'y'});
  });
  controller.updatePlace('123', data, (err, resp) => {
    test.deepEqual(resp, { id: 'x', rev: 'y' });
    test.done();
  });
};


exports['updatePlace handles parent field'] = test => {
  const data = {
    parent: '71df9'
  };
  sinon.stub(controller, 'getPlace').callsArgWith(1, null, {});
  sinon.stub(controller, '_validatePlace').callsArg(1);
  sinon.stub(controller, 'getOrCreatePlace').callsArgWith(1, null, { _id: 'a', name: 'Jack' });
  sinon.stub(db.medic, 'insert').callsFake((doc, cb) => {
    test.equals(doc.parent._id, 'a');
    test.equals(doc.parent.name, undefined); // minified
    cb(null, {id: 'x', rev: 'y'});
  });
  controller.updatePlace('123', data, (err, resp) => {
    test.deepEqual(resp, { id: 'x', rev: 'y' });
    test.done();
  });
};

exports['updatePlace errors when function in series fails'] = test => {
  const data = {
    contact: '71df9'
  };
  sinon.stub(controller, 'getPlace').callsArgWith(1, null, {});
  sinon.stub(controller, '_validatePlace').callsArg(1);
  sinon.stub(people, 'getOrCreatePerson').callsArgWith(1, 'go away');
  controller.updatePlace('123', data, err => {
    test.equals(err, 'go away');
    test.done();
  });
};

exports['minify removes all unnecessary data'] = test => {
  const given = {
    _id: 'a',
    name: 'jim',
    parent: {
      _id: 'b',
      name: 'mr jim',
      parent: {
        _id: 'c',
        name: 'mr jim sr'
      }
    }
  };
  const expected = {
    _id: 'a',
    parent: {
      _id: 'b',
      parent: {
        _id: 'c'
      }
    }
  };
  const actual = controller.minify(given);
  test.deepEqual(actual, expected);
  test.done();
};

exports['fetchHydratedDoc returns a 404 if the document is not found'] = test => {
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {total_rows: 1000, offset: 0, rows: []});
  controller.fetchHydratedDoc('non-existent-id', err => {
    console.log(err);
    test.ok(err);
    test.equal(404, err.statusCode);
    test.done();
  });
};
