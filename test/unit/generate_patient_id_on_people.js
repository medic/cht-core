var sinon = require('sinon'),
    testUtils = require('../test_utils'),
    transitionUtils = require('../../transitions/utils');

var transition = require('../../transitions/generate_patient_id_on_people');


exports.tearDown = function(callback) {
  testUtils.restore([
    transitionUtils.addUniqueId
  ]);
  callback();
};

exports['Adds patient_id to people'] = function(test) {
  sinon.stub(transitionUtils, 'addUniqueId');
  transition.onMatch({}, {}, {}, {});
  test.equal(transitionUtils.addUniqueId.callCount, 1);
  test.done();
};

exports['Filter only accepts people without a patient_id'] = function(test) {
  test.equal(transition.filter({
    type: 'person'
  }), true);

  test.equal(transition.filter({
    type: 'person',
    patient_id: '12345'
  }), false);

  test.equal(transition.filter({
    type: 'not-a-person'
  }), false);

  test.equal(transition.filter({
    no: 'type'
  }), false);

  test.done();
};
