var controller = require('../../controllers/places'),
    people = require('../../controllers/people'),
    cutils = require('../../controllers/utils'),
    db = require('../../db'),
    utils = require('../utils'),
    sinon = require('sinon');

var examplePlace;

exports.tearDown = function (callback) {
  utils.restore(
    db.medic.get,
    db.medic.insert,
    controller.getPlace,
    controller._createPlace,
    controller._validatePlace,
    people.getOrCreatePerson,
    cutils.isDateStrValid
  );
  callback();
};

exports.setUp = function(callback) {
  examplePlace = {
    type: 'clinic',
    name: 'St. Paul',
    parent: 'x'
  };
  callback();
};

exports['validatePlace returns error on string argument.'] = function(test) {
  controller._validatePlace('x', function(err) {
    test.equal(err.message, 'Place must be an object.');
    test.done();
  });
};

exports['validatePlace returns error on number argument.'] = function(test) {
  controller._validatePlace(42, function(err) {
    test.equal(err.message, 'Place must be an object.');
    test.done();
  });
};

exports['validatePlace returns error when doc is wrong type.'] = function(test) {
  examplePlace.type = 'food';
  controller._validatePlace(examplePlace, function(err) {
    test.equal(err.message, 'Wrong type, this is not a place.');
    test.done();
  });
};

exports['validatePlace returns error if clinic is missing parent'] = function(test) {
  delete examplePlace.parent;
  controller._validatePlace(examplePlace, function(err) {
    test.equal(err.message, 'Place is missing a "parent" property.');
    test.done();
  });
};

exports['validatePlace returns error if health center is missing parent'] = function(test) {
  delete examplePlace.parent;
  examplePlace.type = 'health_center';
  controller._validatePlace(examplePlace, function(err) {
    test.equal(err.message, 'Place is missing a "parent" property.');
    test.done();
  });
};

exports['validatePlace returns error if health center has wrong parent type'] = function(test) {
  var data = {
    type: 'health_center',
    name: 'St. Paul',
    parent: {
      name: 'MoH',
      type: 'national_office'
    }
  };
  controller._validatePlace(data, function(err) {
    test.ok(err);
    test.equal(err.message, 'Health Centers should have "district_hospital" parent type.');
    test.done();
  });
};

exports['validatePlace returns error if clinic has wrong parent type'] = function(test) {
  examplePlace.parent = {
    name: 'St Paul Hospital',
    type: 'district_hospital'
  };
  controller._validatePlace(examplePlace, function(err) {
    test.ok(err);
    test.equal(err.message, 'Clinics should have "health_center" parent type.');
    test.done();
  });
};

exports['validatePlace does not return error if district is missing parent'] = function(test) {
  delete examplePlace.parent;
  examplePlace.type = 'district_hospital';
  controller._validatePlace(examplePlace, function(err) {
    test.ok(!err);
    test.done();
  });
};

exports['validatePlace does not return error if national office is missing parent'] = function(test) {
  delete examplePlace.parent;
  examplePlace.type = 'national_office';
  controller._validatePlace(examplePlace, function(err) {
    test.ok(!err);
    test.done();
  });
};

exports['getPlace returns custom message on 404 errors.'] = function(test) {
  sinon.stub(db.medic, 'get').callsArgWith(1, {statusCode: 404});
  controller.getPlace('x', function(err) {
    test.equal(err.message, 'Failed to find place.');
    test.done();
  });
};

exports['createPlaces rejects objects with wrong type.'] = function(test) {
  var place = {
   name: 'CHP Family',
   type: 'food'
  };
  var insert = sinon.stub(db.medic, 'insert');
  controller._createPlaces(place, function(err) {
    test.ok(err);
    test.equal(insert.callCount, 0);
    test.done();
  });
};

exports['createPlaces rejects parent objects with wrong type.'] = function(test) {
  var place = {
   name: 'CHP Family',
   type: 'clinic',
   parent: {
     name: 'CHP Area',
     type: 'food'
   }
  };
  var insert = sinon.stub(db.medic, 'insert');
  controller._createPlaces(place, function(err) {
    test.ok(err);
    test.equal(insert.callCount, 0);
    test.done();
  });
};

exports['createPlaces rejects when parent lookup fails.'] = function(test) {
  var place = {
   name: 'CHP Family',
   type: 'food',
   parent: 'x'
  };
  var insert = sinon.stub(db.medic, 'insert');
  sinon.stub(controller, 'getPlace').callsArgWith(1, 'boom');
  controller._createPlaces(place, function(err) {
    test.ok(err);
    test.equal(insert.callCount, 0);
    test.done();
  });
};

exports['createPlaces supports objects with name and right type.'] = function(test) {
  test.expect(6);
  var place = {
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
  sinon.stub(db.medic, 'insert', function(doc, cb) {
    if (doc.name === 'CHP Branch One') {
      return cb(null, {id: 'abc'});
    }
    if (doc.name === 'CHP Area One') {
      // the parent should be created/resolved, parent id should be set.
      test.equal(doc.parent._id, 'abc');
      return cb(null, {id: 'def'});
    }
    if (doc.name === 'CHP Family') {
      // both parents should be created/resolved
      test.equal(doc.parent._id, 'def');
      test.equal(doc.parent.name, 'CHP Area One');
      test.equal(doc.parent.parent._id, 'abc');
      test.equal(doc.parent.parent.name, 'CHP Branch One');
      return cb(null, {id: 'ghi'});
    }
  });
  sinon.stub(db.medic, 'get', function(id, cb) {
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
  controller._createPlaces(place, function(err, val) {
    test.deepEqual({id: 'ghi'}, val);
    test.done();
  });
};

exports['createPlaces supports parents defined as uuids.'] = function(test) {
  test.expect(6);
  var place = {
    name: 'CHP Area One',
    type: 'health_center',
    parent: 'ad06d137'
  };
  sinon.stub(db.medic, 'get', function(id, cb) {
    return cb(null, {
      _id: 'ad06d137',
      name: 'CHP Branch One',
      type: 'district_hospital'
    });
  });
  sinon.stub(db.medic, 'insert', function(doc, cb) {
    // the parent should be created/resolved, parent id should be set.
    test.equal(doc.name, 'CHP Area One');
    test.equal(doc.type, 'health_center');
    test.equal(doc.parent._id, 'ad06d137');
    test.equal(doc.parent.name, 'CHP Branch One');
    test.equal(doc.parent.type, 'district_hospital');
    return cb(null, {id: 'abc123'});
  });
  controller._createPlaces(place, function(err, val) {
    test.deepEqual({id: 'abc123'}, val);
    test.done();
  });
};

exports['createPlaces rejects invalid reported_date.'] = function(test) {
  var place = {
    name: 'Test',
    type: 'district_hospital',
    reported_date: 'x'
  };
  sinon.stub(cutils, 'isDateStrValid').returns(false);
  controller.createPlace(place, function(err) {
    test.equal(err.code, 400);
    test.equal(err.message, 'Reported date is invalid: x');
    test.done();
  });
};

exports['createPlaces sets a default reported_date.'] = function(test) {
  var place = {
    name: 'Test',
    type: 'district_hospital'
  };
  sinon.stub(db.medic, 'insert', function(doc) {
    // should be set to within 5 seconds of now
    test.ok(doc.reported_date <= (new Date().valueOf()));
    test.ok(doc.reported_date > (new Date().valueOf() - 5000));
    test.done();
  });
  controller._createPlaces(place);
};

exports['updatePlace errors with empty data'] = function(test) {
  controller.updatePlace('123', {}, function(err, resp) {
    test.equal(err.code, 400);
    test.ok(!resp);
    test.done();
  });
};

exports['updatePlace handles contact field'] = function(test) {
  var data = {
    contact: '71df9'
  };
  sinon.stub(controller, 'getPlace').callsArgWith(1, null, {});
  sinon.stub(controller, '_validatePlace').callsArg(1);
  sinon.stub(people, 'getOrCreatePerson').callsArg(1);
  sinon.stub(db.medic, 'insert', function(doc, cb) {
    cb(null, {id: 'x', rev: 'y'});
  });
  controller.updatePlace('123', data, function(err, resp) {
    test.deepEqual(resp, { id: 'x', rev: 'y' });
    test.done();
  });
};

exports['updatePlace errors when function in series fails'] = function(test) {
  var data = {
    contact: '71df9'
  };
  sinon.stub(controller, 'getPlace').callsArgWith(1, null, {});
  sinon.stub(controller, '_validatePlace').callsArg(1);
  sinon.stub(people, 'getOrCreatePerson').callsArgWith(1, 'go away');
  controller.updatePlace('123', data, function(err) {
    test.equals(err, 'go away');
    test.done();
  });
};
