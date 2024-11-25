const config = require('../../src/config');
config.initTransitionLib();
const rewire = require('rewire');

const sinon = require('sinon');
const expect = require('chai').expect;
const feed = require('../../src/lib/feed');
let transitions;

describe('transitions', () => {
  afterEach(() => {
    sinon.restore();
  });

  beforeEach(() => {
    transitions = rewire('../../src/transitions');
    sinon.stub(feed, 'listen');
    sinon.stub(feed, 'cancel');
  });

  describe('loadTransitions', () => {
    it('Should load all transitions', () => {
      const transitionsLib =  { loadTransitions: sinon.stub() };
      transitions.__set__('transitionsLib', transitionsLib);

      transitions.loadTransitions();
      expect(transitionsLib.loadTransitions.calledOnce).to.equal(true);
      expect(feed.listen.called).to.equal(true);
      expect(feed.cancel.calledOnce).to.equal(false);
    });

    it('cancel is called when load throws', () => {
      const transitionsLib =  { loadTransitions: sinon.stub().throws() };
      transitions.__set__('transitionsLib', transitionsLib);

      transitions.loadTransitions();

      expect(transitionsLib.loadTransitions.calledOnce).to.equal(true);
      expect(feed.listen.called).to.equal(false);
      expect(feed.cancel.calledOnce).to.equal(true);
    });
  });
});
