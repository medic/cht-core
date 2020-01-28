const config = require('../../src/config');
config.initTransitionLib();

const sinon = require('sinon');
const assert = require('chai').assert;
const db = require('../../src/db');
const transitions = require('../../src/transitions');
const metadata = require('../../src/lib/metadata');
const feed = require('../../src/lib/feed');
const tombstoneUtils = require('@medic/tombstone-utils');

describe('transitions', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('loadTransitions', () => {

    it('cancel is called when load throws', () => {
      const load = sinon.stub(transitions._transitionsLib, 'loadTransitions').throws();
      const listen = sinon.stub(feed, 'listen');
      const cancel = sinon.stub(feed, 'cancel');
      transitions.loadTransitions();
      assert.equal(load.callCount, 1);
      assert.equal(listen.callCount, 0);
      assert.equal(cancel.callCount, 1);
    });

  });

});
