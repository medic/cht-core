const sinon = require('sinon');
const { assert, expect, ...chai } = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const transitions = require('../../src/transitions');
const config = require('../../src/config');
const _ = require('lodash');
const infodoc = require('@medic/infodoc');

const requiredFunctions = {
  onMatch: 1,
  filter: 1,
};

const asyncOnlyTransitions = [
  'muting',
  'update_notifications',
  'multi_report_alerts',
  'generate_patient_id_on_people',
  'generate_shortcode_on_contacts'
];

describe('transitions', () => {
  afterEach(() => sinon.restore());

  it('canRun returns false if filter returns false', () => {
    assert.equal(
      transitions.canRun({
        change: {
          doc: {},
          info: {},
        },
        transition: {
          filter: () => false,
        },
      }),
      false
    );
  });

  it('canRun returns true if filter returns true', () => {
    assert.equal(
      transitions.canRun({
        change: {
          doc: {},
          info: {},
        },
        transition: {
          filter: () => true,
        },
      }),
      true
    );
  });

  it('canRun returns false if change is deletion', () => {
    assert.equal(
      transitions.canRun({
        change: {
          doc: {},
          info: {},
          deleted: true,
        },
        transition: {
          filter: () => true,
        },
      }),
      false
    );
  });

  it('canRun returns false if rev is same', () => {
    assert.equal(
      transitions.canRun({
        key: 'x',
        change: {
          doc: {
            _rev: '1',
          },
          info: {
            transitions: {
              x: {
                last_rev: '1',
              },
            },
          },
        },
        transition: {
          filter: () => true,
        },
      }),
      false
    );
  });

  it('canRun returns true if rev is different', () => {
    assert.equal(
      transitions.canRun({
        key: 'x',
        change: {
          doc: {
            _rev: '1',
          },
          info: {
            transitions: {
              x: {
                last_rev: '2',
              },
            },
          },
        },
        transition: {
          filter: () => true,
        },
      }),
      true
    );
  });

  it('canRun returns true if transition is not defined', () => {
    assert.equal(
      transitions.canRun({
        key: 'foo',
        change: {
          doc: {
            _rev: '1',
          },
          info: {
            transitions: {
              baz: {
                last_rev: '2',
              },
            },
          },
        },
        transition: {
          filter: () => true,
        },
      }),
      true
    );
    assert.equal(
      transitions.canRun({
        key: 'foo',
        change: {
          doc: {
            _rev: '1',
          },
          info: {
            transitions: {},
          },
        },
        transition: {
          filter: () => true,
        },
      }),
      true
    );
  });



  // A list of states to test, first arg is the `transitions` config value and
  // second is whether you expect loadTransition to get called.
  const loadTests = [
    // empty configuration
    { name: 'empty', given: {}, expectedCalls: { load: false, attach: true } },
    {
      name: 'undefined',
      given: undefined,
      expectedCalls: { load: false, attach: true },
    },
    { name: 'null', given: null, expectedCalls: { load: false, attach: true } },

    // falsey configuration
    {
      name: 'transition null',
      given: { registration: null },
      expectedCalls: { load: false, attach: true },
    },
    {
      name: 'transition undefined',
      given: { registration: undefined },
      expectedCalls: { load: false, attach: true },
    },
    {
      name: 'transition false',
      given: { registration: false },
      expectedCalls: { load: false, attach: true },
    },

    // invalid configurations
    {
      name: 'unknown name',
      given: { foo: true },
      expectedCalls: { load: false, attach: false },
    },

    // available and enabled
    {
      name: 'transition empty',
      given: { registration: {} },
      expectedCalls: { load: true, attach: true },
    },
    {
      name: 'transition true',
      given: { registration: true },
      expectedCalls: { load: true, attach: true },
    },
    {
      name: 'transition string',
      given: { registration: 'x' },
      expectedCalls: { load: true, attach: true },
    },
    {
      name: 'transition object',
      given: { registration: { param: 'val' } },
      expectedCalls: { load: true, attach: true },
    },

    // support old style
    {
      name: 'old style',
      given: { registration: { load: '../etc/passwd' } },
      expectedCalls: { load: true, attach: true },
    },
    {
      name: 'old style true',
      given: { registration: { disable: true } },
      expectedCalls: { load: false, attach: true },
    },
    {
      name: 'old style false',
      given: { registration: { disable: false } },
      expectedCalls: { load: true, attach: true },
    },
  ];
  loadTests.forEach(loadTest => {
    it(`loadTransitions loads configured transitions: ${loadTest.name}`, () => {
      sinon.stub(config, 'get').returns(loadTest.given);
      const load = sinon.stub(transitions, '_loadTransition');
      try {
        transitions.loadTransitions();
      } catch (e) {
        // not empty
      }
      assert.equal(load.callCount, loadTest.expectedCalls.load ? 1 : 0);
    });
  });

  transitions.availableTransitions().forEach(name => {
    const transition = require(`../../src/transitions/${name}`);
    Object.keys(requiredFunctions).forEach(key => {
      it(`Checking ${key} signature for ${name} transition`, () => {
        assert(_.isFunction(transition[key]), 'Required function not found');
        assert.equal(
          transition[key].length,
          requiredFunctions[key],
          'Function takes the wrong number of parameters'
        );
      });

      it('Checking for asynchronousOnly flag', () => {
        assert(asyncOnlyTransitions.includes(name) ? transition.asynchronousOnly : !transition.asynchronousOnly);
      });
    });
  });

  it('loadTransitions does not load system transitions that have been explicitly disabled', () => {
    sinon.stub(config, 'get').returns({ death_reporting: { disable: true } });
    const stub = sinon.stub(transitions, '_loadTransition');
    transitions.loadTransitions();
    assert.equal(stub.calledWith('death_reporting'), false);
  });

  it('loadTransitions loads system transitions by default', () => {
    sinon.stub(config, 'get').returns({});
    const stub = sinon.stub(transitions, '_loadTransition');
    transitions.loadTransitions();
    assert.equal(stub.callCount, 0);
  });

  it('loadTransitions loads synchronous transitions only', () => {
    sinon.stub(config, 'get').returns({
      death_reporting: { disable: true },
      update_clinics: true,
      default_responses: true,
      muting: true
    });
    sinon.spy(transitions, '_loadTransition');
    transitions.loadTransitions(true);
    assert.equal(transitions._loadTransition.callCount, 3);
    assert.equal(transitions._loadTransition.calledWith('update_clinics', true), true);
    assert.equal(transitions._loadTransition.calledWith('default_responses', true), true);
    assert.equal(transitions._loadTransition.calledWith('muting', true), true);
    assert.deepEqual(transitions._transitions().map(tr => tr.key), ['update_clinics', 'default_responses']);
  });

  it('loads all enabled transitions when async', () => {
    sinon.stub(config, 'get').returns({
      death_reporting: { disable: true },
      update_clinics: true,
      default_responses: true,
      muting: true
    });
    sinon.spy(transitions, '_loadTransition');
    const muting = require('../../src/transitions/muting');
    sinon.stub(muting, 'init').returns();

    transitions.loadTransitions(false);
    assert.equal(transitions._loadTransition.callCount, 3);
    assert.equal(transitions._loadTransition.calledWith('update_clinics', false), true);
    assert.equal(transitions._loadTransition.calledWith('default_responses', false), true);
    assert.equal(transitions._loadTransition.calledWith('muting', false), true);
    assert.deepEqual(transitions._transitions().map(tr => tr.key), ['update_clinics', 'default_responses', 'muting']);
    assert.equal(muting.init.callCount, 1);
  });

  it('should empty transitions list when one fails', () => {
    sinon.stub(config, 'get').returns({
      death_reporting: { disable: true },
      update_clinics: true,
      default_responses: true,
      muting: true
    });

    sinon.stub(transitions, '_loadTransition');
    transitions._loadTransition.withArgs('default_responses').throws({ some: 'err' });
    assert.throws(transitions.loadTransitions);
    assert.deepEqual(transitions._transitions(), []);
  });

  it('getDeprecatedTransitions() should return list of current deprecated transitions', () => {
    const deprecatedTransitions = transitions.getDeprecatedTransitions();

    assert.isDefined(deprecatedTransitions);
    assert.equal(deprecatedTransitions.length, 2);
  });

  describe('applyTransition',  () => {
    it('should apply transition with change', async () => {
      const transition = {
        key: 'mytransition',
        filter: sinon.stub().returns(true),
        onMatch: sinon.stub().resolves(true),
      };
      sinon.stub(infodoc, 'updateTransition');
      const change = { doc: {}, info: {} };

      const result = await new Promise((resolve, reject) => {
        transitions.applyTransition(
          { key: transition.key, change, transition },
          (err, result) => err ? reject(err) : resolve(result)
        );
      });

      expect(result).to.equal(true);
      expect(transition.filter.args).to.deep.equal([[change.doc, change.info]]);
      expect(transition.onMatch.args).to.deep.equal([[change]]);
      expect(infodoc.updateTransition.args).to.deep.equal([[change, transition.key, true]]);
    });

    it('should apply transition without change', async () => {
      const transition = {
        key: 'mytransition',
        filter: sinon.stub().returns(true),
        onMatch: sinon.stub().resolves(false),
      };
      sinon.stub(infodoc, 'updateTransition');
      const change = { doc: {}, info: {} };

      const result = await new Promise((resolve, reject) => {
        transitions.applyTransition(
          { key: transition.key, change, transition },
          (err, result) => err ? reject(err) : resolve(result)
        );
      });

      expect(result).to.equal(false);
      expect(transition.filter.args).to.deep.equal([[change.doc, change.info]]);
      expect(transition.onMatch.args).to.deep.equal([[change]]);
      expect(infodoc.updateTransition.called).to.equal(false);
    });

    it('should skip transitions that dont pass filter', async () => {
      const transition = {
        key: 'mytransition',
        filter: sinon.stub().returns(false),
        onMatch: sinon.stub(),
      };
      sinon.stub(infodoc, 'updateTransition');
      const change = { doc: {}, info: {} };

      const result = await new Promise((resolve, reject) => {
        transitions.applyTransition(
          { key: transition.key, change, transition },
          (err, result) => err ? reject(err) : resolve(result)
        );
      });

      expect(result).to.equal(undefined);
      expect(transition.filter.args).to.deep.equal([[change.doc, change.info]]);
      expect(transition.onMatch.called).to.equal(false);
      expect(infodoc.updateTransition.called).to.equal(false);
    });

    it('should skip transitions that cant run', async () => {
      const transition = {
        key: 'mytransition',
        filter: sinon.stub(),
        onMatch: sinon.stub(),
      };

      sinon.stub(infodoc, 'updateTransition');
      const change = { deleted: true, doc: {}, info: {} };

      const result = await new Promise((resolve, reject) => {
        transitions.applyTransition(
          { key: transition.key, change, transition },
          (err, result) => err ? reject(err) : resolve(result)
        );
      });

      expect(result).to.equal(undefined);
      expect(transition.filter.called).to.equal(false);
      expect(transition.onMatch.called).to.equal(false);
      expect(infodoc.updateTransition.called).to.equal(false);
    });

    it('should force running a transition', async () => {
      const transition = {
        key: 'mytransition',
        filter: sinon.stub(),
        onMatch: sinon.stub().resolves(true),
      };

      sinon.stub(transitions, 'canRun').returns(false);
      sinon.stub(infodoc, 'updateTransition');
      const change = { doc: {}, info: {} };

      const result = await new Promise((resolve, reject) => {
        transitions.applyTransition(
          { key: transition.key, change, transition, force: true },
          (err, result) => err ? reject(err) : resolve(result)
        );
      });

      expect(result).to.equal(true);
      expect(transitions.canRun.called).to.equal(false);
      expect(transition.onMatch.args).to.deep.equal([[change]]);
      expect(infodoc.updateTransition.args).to.deep.equal([[change, transition.key, true]]);
    });

    it('should catch transition filter errors', async () => {
      const transition = {
        key: 'mytransition',
        filter: sinon.stub().throws(new Error('boom')),
        onMatch: sinon.stub(),
      };
      sinon.stub(infodoc, 'updateTransition');
      const change = { doc: {}, info: {} };

      const result = await new Promise((resolve, reject) => {
        transitions.applyTransition(
          { key: transition.key, change, transition },
          (err, result) => err ? reject(err) : resolve(result)
        );
      });
      expect(result).to.equal(false);
      expect(transition.filter.args).to.deep.equal([[change.doc, change.info]]);
      expect(transition.onMatch.called).to.equal(false);
      expect(infodoc.updateTransition.called).to.equal(false);
    });

    it('should catch transition onMatch errors without changes', async () => {
      const transition = {
        key: 'mytransition',
        filter: sinon.stub().returns(true),
        onMatch: sinon.stub().rejects(new Error('and its gone')),
      };
      sinon.stub(infodoc, 'updateTransition');
      const change = { doc: {}, info: {} };

      const result = await new Promise((resolve, reject) => {
        transitions.applyTransition(
          { key: transition.key, change, transition },
          (err, result) => err ? reject(err) : resolve(result)
        );
      });

      expect(result).to.equal(false);
      expect(transition.filter.args).to.deep.equal([[change.doc, change.info]]);
      expect(transition.onMatch.called).to.equal(true);
      expect(infodoc.updateTransition.called).to.equal(false);
    });

    it('should catch transition onMatch errors with changes', async () => {
      const transition = {
        key: 'mytransition',
        filter: sinon.stub().returns(true),
        onMatch: sinon.stub().rejects({ changed: true }),
      };
      sinon.stub(infodoc, 'updateTransition');
      const change = { doc: {}, info: {} };

      const result = await new Promise((resolve, reject) => {
        transitions.applyTransition(
          { key: transition.key, change, transition },
          (err, result) => err ? reject(err) : resolve(result)
        );
      });

      expect(result).to.equal(true);
      expect(transition.filter.args).to.deep.equal([[change.doc, change.info]]);
      expect(transition.onMatch.called).to.equal(true);
      expect(infodoc.updateTransition.args).to.deep.equal([[change, transition.key, false]]);
    });
  });

});

