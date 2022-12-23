const sinon = require('sinon');
const assert = require('chai').assert;
const config = require('../../../src/config');

const types = [
  { id: 'person', person: true },
  { id: 'place' }
];

describe('generate_shortcode_on_contacts transition', () => {
  let transitionUtils;
  let transition;

  beforeEach(() => {
    config.init({ getAll: sinon.stub().returns({ contact_types: types }), });
    transitionUtils = require('../../../src/transitions/utils');
    transition = require('../../../src/transitions/generate_shortcode_on_contacts');
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  it('adds patient_id to people', () => {
    sinon.stub(transitionUtils, 'getUniqueId').resolves('something');
    transition.onMatch({ doc: {} });
    assert.equal(transitionUtils.getUniqueId.callCount, 1);
  });

  describe('filter', () => {

    it('accepts person contact types', () => {
      const doc = { type: 'person' };
      assert.equal(!!transition.filter(doc), true);
    });

    it('should accept place contact types', () => {
      const doc = { type: 'contact', contact_type: 'place' };
      assert.equal(!!transition.filter(doc), true);
    });

    it('ignores persons that already have a patient_id', () => {
      const doc = { type: 'person', patient_id: '12345' };
      assert.equal(!!transition.filter(doc), false);
    });

    it('ignores places that already have a patient_id', () => {
      const doc = { type: 'place', place_id: '12345' };
      assert.equal(!!transition.filter(doc), false);
    });

    it('ignores docs with unknown type', () => {
      const doc = { };
      assert.equal(!!transition.filter(doc), false);
    });
  });

  describe('onMatch', () => {
    it('should add patient_id to people', () => {
      const doc = { type: 'contact', contact_type: 'person' };
      sinon.stub(transitionUtils, 'getUniqueId').resolves('the_unique_id');
      return transition.onMatch({ doc }).then(result => {
        assert.equal(result, true);
        assert.deepEqual(doc, { type: 'contact', contact_type: 'person', patient_id: 'the_unique_id' });
      });
    });

    it('should add place_id to places', () => {
      const doc = { type: 'contact', contact_type: 'place' };
      sinon.stub(transitionUtils, 'getUniqueId').resolves('the_unique_id');
      return transition.onMatch({ doc }).then(result => {
        assert.equal(result, true);
        assert.deepEqual(doc, { type: 'contact', contact_type: 'place', place_id: 'the_unique_id' });
      });
    });
  });

});
