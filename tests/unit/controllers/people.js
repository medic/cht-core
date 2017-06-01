const controller = require('../../../controllers/people'),
      places = require('../../../controllers/places'),
      cutils = require('../../../controllers/utils'),
      db = require('../../../db'),
      sinon = require('sinon').sandbox.create();

let example;

exports.tearDown = callback => {
  sinon.restore();
  callback();
};

exports.setUp = callback => {
  example = {
    name: 'Henrique'
  };
  callback();
};

exports['validatePerson returns error on string argument.'] = test => {
  controller.validatePerson('x', err => {
    test.equal(err.code, 400);
    test.equal(err.message, 'Person must be an object.');
    test.done();
  });
};

exports['validatePerson returns error on wrong doc type.'] = test => {
  controller.validatePerson({type: 'shoe'}, err => {
    test.equal(err.code, 400);
    test.equal(err.message, 'Wrong type, this is not a person.');
    test.done();
  });
};

exports['validatePerson returns error if missing name property.'] = test => {
  controller.validatePerson({type: 'person'}, err => {
    test.equal(err.code, 400);
    test.equal(err.message, 'Person is missing a "name" property.');
    test.done();
  });
};

exports['validatePerson returns error if name is an integer.'] = test => {
  controller.validatePerson({type: 'person', name: 1}, err => {
    test.equal(err.code, 400);
    test.equal(err.message, 'Property "name" must be a string.');
    test.done();
  });
};

exports['validatePerson returns error if name is an object.'] = test => {
  controller.validatePerson({type: 'person', name: {}}, err => {
    test.equal(err.code, 400);
    test.equal(err.message, 'Property "name" must be a string.');
    test.done();
  });
};

exports['getPerson returns custom message on 404 errors.'] = test => {
  sinon.stub(db.medic, 'get').callsArgWith(1, {statusCode: 404});
  controller.getPerson('x', err => {
    test.equal(err.message, 'Failed to find person.');
    test.done();
  });
};

exports['getPerson returns not found message if doc is wrong type.'] = test => {
  sinon.stub(db.medic, 'get').callsArgWith(1, null, {type: 'clinic'});
  controller.getPerson('x', err => {
    test.equal(err.message, 'Failed to find person.');
    test.done();
  });
};

exports['getPerson succeeds and returns doc when person type.'] = test => {
  sinon.stub(db.medic, 'get').callsArgWith(1, null, {type: 'person'});
  controller.getPerson('x', (err, doc) => {
    test.equal(err, void 0);
    test.deepEqual(doc, { type: 'person' });
    test.done();
  });
};

exports['createPerson sets contact type before validating'] = test => {
  sinon.stub(controller, 'validatePerson').callsFake(data => {
    test.equal(data.type, 'person');
    test.equal(data.name, 'Kobe');
    test.done();
  });
  controller.createPerson({ type: 'shoe', name: 'Kobe' });
};

exports['createPerson returns error from db insert'] = test => {
  sinon.stub(controller, 'validatePerson').callsArg(1);
  sinon.stub(places, 'getOrCreatePlace').callsArg(1);
  sinon.stub(db.medic, 'insert').callsArgWith(1, 'yucky');
  controller.createPerson({}, err => {
    test.ok(err);
    test.done();
  });
};

exports['createPerson rejects invalid reported_date.'] = test => {
  const person = {
    name: 'Test',
    reported_date: 'x'
  };
  sinon.stub(places, 'getOrCreatePlace').callsArg(1);
  sinon.stub(cutils, 'isDateStrValid').returns(false);
  controller.createPerson (person, err => {
    test.equal(err.code, 400);
    test.equal(err.message, 'Reported date is invalid: x');
    test.done();
  });
};

exports['createPerson accepts valid reported_date in ms since epoch.'] = test => {
  const person = {
    name: 'Test',
    reported_date: '123'
  };
  sinon.stub(places, 'getOrCreatePlace').callsArg(1);
  sinon.stub(db.medic, 'insert').callsFake(doc => {
    test.ok(doc.reported_date === 123);
    test.done();
  });
  controller.createPerson(person);
};

exports['createPerson accepts valid reported_date in string format'] = test => {
  const person = {
    name: 'Test',
    reported_date: '2011-10-10T14:48:00-0300'
  };
  sinon.stub(places, 'getOrCreatePlace').callsArg(1);
  sinon.stub(db.medic, 'insert').callsFake(doc => {
    test.ok(doc.reported_date === new Date('2011-10-10T14:48:00-0300').valueOf());
    test.done();
  });
  controller.createPerson(person);
};

exports['createPerson minifies the given parent'] = test => {
  const person = {
    name: 'Test',
    reported_date: '2011-10-10T14:48:00-0300',
    place: 'a'
  };
  const place = {
    _id: 'a',
    name: 'Test area',
    parent: {
      _id: 'b',
      name: 'Test district',
    }
  };
  const minified = {
    _id: 'a',
    parent: {
      _id: 'b'
    }
  };
  sinon.stub(places, 'getOrCreatePlace').callsArgWith(1, null, place);
  sinon.stub(places, 'minify').returns(minified);
  sinon.stub(db.medic, 'insert').callsFake(doc => {
    test.ok(!doc.place);
    test.deepEqual(doc.parent, minified);
    test.equals(places.getOrCreatePlace.callCount, 1);
    test.equals(places.getOrCreatePlace.args[0][0], 'a');
    test.equals(places.minify.callCount, 1);
    test.deepEqual(places.minify.args[0][0], place);
    test.done();
  });
  controller.createPerson(person);
};

exports['createPerson sets a default reported_date.'] = test => {
  const person = {
    name: 'Test'
  };
  sinon.stub(db.medic, 'insert').callsFake(doc => {
    // should be set to within 5 seconds of now
    test.ok(doc.reported_date <= (new Date().valueOf()));
    test.ok(doc.reported_date > (new Date().valueOf() - 5000));
    test.done();
  });
  controller.createPerson(person);
};
