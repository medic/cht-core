const sinon = require('sinon');
const assert = require('chai').assert;
const config = require('../../src/config');
const transitionUtils = require('../../src/transitions/utils');
const transition = require('../../src/transitions/generate_patient_id_on_people');

const types = [
  { id: 'person', person: true },
  { id: 'place' }
];

describe('generate_patient_id_on_people transition', () => {
  beforeEach(() => sinon.stub(config, 'get').returns(types));
  afterEach(() => sinon.restore());

  it('adds patient_id to people', () => {
    sinon.stub(transitionUtils, 'addUniqueId');
    transition.onMatch({}, {}, {}, {});
    assert.equal(transitionUtils.addUniqueId.callCount, 1);
  });

  describe('filter', () => {

    it('accepts person contact types', () => {
      const doc = { type: 'person' };
      assert.equal(!!transition.filter(doc), true);
    });

    it('ignores docs that already have a patient_id', () => {
      const doc = { type: 'person', patient_id: '12345' };
      assert.equal(!!transition.filter(doc), false);
    });

    it('ignores docs with unknown type', () => {
      const doc = { };
      assert.equal(!!transition.filter(doc), false);
    });

    it('ignores docs with place type', () => {
      const doc = { type: 'clinic' };
      assert.equal(!!transition.filter(doc), false);
    });

  });

});
