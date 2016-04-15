var controller = require('../../controllers/contacts'),
    places = require('../../controllers/places'),
    db = require('../../db'),
    utils = require('../utils'),
    sinon = require('sinon');

var example;

exports.tearDown = function (callback) {
  utils.restore(
    db.medic.get,
    db.medic.insert,
    controller.getContact,
    controller.createContact,
    controller.validateContact,
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

exports['validateContact returns error on string argument.'] = function(test) {
  controller.validateContact('x', function(err) {
    test.equal(err.code, 400);
    test.equal(err.message, 'Contact must be an object.');
    test.done();
  });
};

exports['getContact returns custom message on 404 errors.'] = function(test) {
  sinon.stub(db.medic, 'get').callsArgWith(1, {statusCode: 404});
  controller.getContact('x', function(err) {
    test.equal(err.message, 'Failed to find contact.');
    test.done();
  });
};

exports['getContact returns not found message if doc is wrong type.'] = function(test) {
  sinon.stub(db.medic, 'get').callsArgWith(1, null, {type: 'clinic'});
  controller.getContact('x', function(err) {
    test.equal(err.message, 'Failed to find contact.');
    test.done();
  });
};

exports['getContact succeeds and returns doc when person type.'] = function(test) {
  sinon.stub(db.medic, 'get').callsArgWith(1, null, {type: 'person'});
  controller.getContact('x', function(err, doc) {
    test.equal(err, void 0);
    test.deepEqual(doc, { type: 'person' });
    test.done();
  });
};

exports['createContact sets contact type before validating'] = function(test) {
  sinon.stub(controller, 'validateContact', function(data) {
    test.equal(data.type, 'person');
    test.equal(data.name, 'Kobe');
    test.done();
  });
  controller.createContact({ type: 'shoe', name: 'Kobe' });
};

exports['createContact returns error from db insert'] = function(test) {
  sinon.stub(controller, 'validateContact').callsArg(1);
  sinon.stub(places, 'getOrCreatePlace').callsArg(1);
  sinon.stub(db.medic, 'insert').callsArgWith(1, 'yucky');
  controller.createContact({}, function(err) {
    test.ok(err);
    test.done();
  });
};

