var controller = require('../../controllers/people'),
    places = require('../../controllers/places'),
    db = require('../../db'),
    utils = require('../utils'),
    sinon = require('sinon');

var example;

exports.tearDown = function (callback) {
  utils.restore(
    db.medic.get,
    db.medic.insert,
    controller.getPerson,
    controller.createPerson,
    controller.validatePerson,
    places.getOrCreatePlace
  );
  callback();
};

exports.setUp = function(callback) {
  example = {
    name: 'Henrique'
  };
  callback();
};

exports['validatePerson returns error on string argument.'] = function(test) {
  controller.validatePerson('x', function(err) {
    test.equal(err.code, 400);
    test.equal(err.message, 'Person must be an object.');
    test.done();
  });
};

exports['validatePerson returns error on wrong doc type.'] = function(test) {
  controller.validatePerson({type: 'shoe'}, function(err) {
    test.equal(err.code, 400);
    test.equal(err.message, 'Wrong type, this is not a person.');
    test.done();
  });
};

exports['validatePerson returns error if missing name property.'] = function(test) {
  controller.validatePerson({type: 'person'}, function(err) {
    test.equal(err.code, 400);
    test.equal(err.message, 'Person is missing a "name" property.');
    test.done();
  });
};

exports['validatePerson returns error if name is an integer.'] = function(test) {
  controller.validatePerson({type: 'person', name: 1}, function(err) {
    test.equal(err.code, 400);
    test.equal(err.message, 'Property "name" must be a string.');
    test.done();
  });
};

exports['validatePerson returns error if name is an object.'] = function(test) {
  controller.validatePerson({type: 'person', name: {}}, function(err) {
    test.equal(err.code, 400);
    test.equal(err.message, 'Property "name" must be a string.');
    test.done();
  });
};

exports['getPerson returns custom message on 404 errors.'] = function(test) {
  sinon.stub(db.medic, 'get').callsArgWith(1, {statusCode: 404});
  controller.getPerson('x', function(err) {
    test.equal(err.message, 'Failed to find person.');
    test.done();
  });
};

exports['getPerson returns not found message if doc is wrong type.'] = function(test) {
  sinon.stub(db.medic, 'get').callsArgWith(1, null, {type: 'clinic'});
  controller.getPerson('x', function(err) {
    test.equal(err.message, 'Failed to find person.');
    test.done();
  });
};

exports['getPerson succeeds and returns doc when person type.'] = function(test) {
  sinon.stub(db.medic, 'get').callsArgWith(1, null, {type: 'person'});
  controller.getPerson('x', function(err, doc) {
    test.equal(err, void 0);
    test.deepEqual(doc, { type: 'person' });
    test.done();
  });
};

exports['createPerson sets contact type before validating'] = function(test) {
  sinon.stub(controller, 'validatePerson', function(data) {
    test.equal(data.type, 'person');
    test.equal(data.name, 'Kobe');
    test.done();
  });
  controller.createPerson({ type: 'shoe', name: 'Kobe' });
};

exports['createPerson returns error from db insert'] = function(test) {
  sinon.stub(controller, 'validatePerson').callsArg(1);
  sinon.stub(places, 'getOrCreatePlace').callsArg(1);
  sinon.stub(db.medic, 'insert').callsArgWith(1, 'yucky');
  controller.createPerson({}, function(err) {
    test.ok(err);
    test.done();
  });
};

exports['createPerson  rejects reported_date formatted as integer.'] = function(test) {
  var person = {
    name: 'Test',
    reported_date: 1234
  };
  sinon.stub(places, 'getOrCreatePlace').callsArg(1);
  controller.createPerson (person, function(err) {
    test.equal(err.code, 400);
    test.equal(err.message, 'Reported date is invalid: 1234');
    test.done();
  });
};

exports['createPerson  rejects reported_date missing timezone.'] = function(test) {
  var person = {
    name: 'Test',
    reported_date: '2011-10-10T14:48:00'
  };
  controller.createPerson (person, function(err) {
    test.equal(err.code, 400);
    test.equal(err.message, 'Reported date is invalid: 2011-10-10T14:48:00');
    test.done();
  });
};

exports['createPerson  rejects reported_date with timezone with 5 digits.'] = function(test) {
  var person = {
    name: 'Test',
    reported_date: '2011-10-10T14:48:00-00000'
  };
  controller.createPerson(person, function(err) {
    test.equal(err.code, 400);
    test.equal(err.message, 'Reported date is invalid: 2011-10-10T14:48:00-00000');
    test.done();
  });
};

exports['createPerson  accepts properly formatted reported_date field.'] = function(test) {
  var person = {
    name: 'Test',
    reported_date: '2011-10-10T14:48:00-03'
  };
  sinon.stub(db.medic, 'insert', function(doc) {
    test.equal(doc.reported_date, 1318268880000);
    test.done();
  });
  controller.createPerson(person);
};

exports['createPerson  accepts reported_date with 4 digit timezone.'] = function(test) {
  var person = {
    name: 'Test',
    reported_date: '2011-10-10T14:48:00-0330'
  };
  sinon.stub(db.medic, 'insert', function(doc) {
    test.equal(doc.reported_date, 1318270680000);
    test.done();
  });
  controller.createPerson(person);
};

exports['createPerson  sets a default reported_date.'] = function(test) {
  var person = {
    name: 'Test'
  };
  sinon.stub(db.medic, 'insert', function(doc) {
    // should be set to within 5 seconds of now
    test.ok(doc.reported_date <= (new Date().valueOf()));
    test.ok(doc.reported_date > (new Date().valueOf() - 5000));
    test.done();
  });
  controller.createPerson(person);
};
