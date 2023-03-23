const sinon = require('sinon');
const assert = require('chai').assert;
const config = require('../../src/config');
const logger = require('../../src/lib/logger');

const types = [
  { id: 'person', person: true },
  { id: 'place' }
];

describe('generate_patient_id_on_people transition', () => {
  let transitionUtils;
  let generateShortcodeOnContacts;
  let transition;

  beforeEach(() => {
    config.init({ getAll: sinon.stub().returns({ contact_types: types }), });
    transitionUtils = require('../../src/transitions/utils');
    generateShortcodeOnContacts = require('../../src/transitions/generate_shortcode_on_contacts');
    transition = require('../../src/transitions/generate_patient_id_on_people');
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  it('should have basic properties defined', () => {
    assert.equal(transition.name, 'generate_patient_id_on_people');
    assert.equal(transition.asynchronousOnly, true);
    assert.equal(transition.deprecated, true);
    assert.equal(transition.deprecatedIn, '3.8.x');
  });

  it('init() should log a warning when transition is deprecated.', () => {
    const deprecatedMsg = 'Please use "generate_shortcode_on_contacts" transition instead.';
    sinon.stub(logger, 'warn');

    transition.init();

    assert.equal(logger.warn.callCount, 1);
    assert.equal(logger.warn.args[0][0].includes(transition.name), true);
    assert.equal(logger.warn.args[0][0].includes(transition.deprecatedIn), true);
    assert.equal(logger.warn.args[0][0].includes(deprecatedMsg), true);
  });

  it('adds patient_id to people', () => {
    sinon.stub(transitionUtils, 'getUniqueId').resolves('something');
    transition.onMatch({ doc: {} });
    assert.equal(transitionUtils.getUniqueId.callCount, 1);
  });

  describe('filter', () => {

    it('accepts person contact types', () => {
      const doc = { type: 'person' };
      assert.equal(!!transition.filter({ doc }), true);
    });

    it('should accept place contact types', () => {
      const doc = { type: 'contact', contact_type: 'place' };
      assert.equal(!!transition.filter({ doc }), true);
    });

    it('ignores persons that already have a patient_id', () => {
      const doc = { type: 'person', patient_id: '12345' };
      assert.equal(!!transition.filter({ doc }), false);
    });

    it('ignores places that already have a patient_id', () => {
      const doc = { type: 'place', place_id: '12345' };
      assert.equal(!!transition.filter({ doc }), false);
    });

    it('ignores docs with unknown type', () => {
      const doc = { };
      assert.equal(!!transition.filter({ doc }), false);
    });

    it('should call generate_shortcode_on_contacts.filter', () => {
      sinon.stub(generateShortcodeOnContacts, 'filter').returns('something');
      const result = transition.filter({ doc: { the: 'doc' } });
      assert.equal(generateShortcodeOnContacts.filter.callCount, 1);
      assert.deepEqual(generateShortcodeOnContacts.filter.args[0], [{ doc: { the: 'doc' } }]);
      assert.equal(result, 'something');
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

    it('should call generate_shortcode_on_contacts.onMatch', () => {
      sinon.stub(generateShortcodeOnContacts, 'onMatch').returns('the result');
      const result = transition.onMatch({ my: 'object' });
      assert.equal(generateShortcodeOnContacts.onMatch.callCount, 1);
      assert.deepEqual(generateShortcodeOnContacts.onMatch.args[0], [{ my: 'object' }]);
      assert.equal(result, 'the result');
    });
  });

});
