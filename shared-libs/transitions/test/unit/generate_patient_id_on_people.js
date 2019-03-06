var sinon = require('sinon'),
    assert = require('chai').assert,
    transitionUtils = require('../../src/transitions/utils');

var transition = require('../../src/transitions/generate_patient_id_on_people');

describe('generate patient id on people', () => {
  afterEach(() => sinon.restore());

  it('Adds patient_id to people', () => {
    sinon.stub(transitionUtils, 'addUniqueId');
    transition.onMatch({}, {}, {}, {});
    assert.equal(transitionUtils.addUniqueId.callCount, 1);
  });

  it('Filter only accepts people without a patient_id', () => {
    assert.equal(transition.filter({
      type: 'person'
    }), true);

    assert.equal(transition.filter({
      type: 'person',
      patient_id: '12345'
    }), false);

    assert.equal(transition.filter({
      type: 'not-a-person'
    }), false);

    assert.equal(transition.filter({
      no: 'type'
    }), false);
  });
});
