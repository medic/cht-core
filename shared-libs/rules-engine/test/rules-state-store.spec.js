const { expect } = require('chai');
const { RestorableRulesStateStore } = require('./mocks');
const sinon = require('sinon');

const rulesStateStore = RestorableRulesStateStore();
const hashRulesConfig = rulesStateStore.__get__('hashRulesConfig');

const mockState = contactState => ({
  rulesConfigHash: hashRulesConfig({}, {}),
  contactState,
});

describe('rules-state-store', () => {
  afterEach(() => {
    sinon.restore();
    rulesStateStore.restore();
  });

  it('throw on build twice', async () => {
    const state = mockState({ 'a': { calculatedAt: 1 } });
    await rulesStateStore.load(state, {}, {});
    expect(() => rulesStateStore.load(state, {}, {})).to.throw('multiple times');
    expect(rulesStateStore.currentUser()).to.deep.eq({});
  });

  it('throw if not initialized', async () => {
    expect(() => rulesStateStore.isDirty('a')).to.throw('before call to');
  });

  it('load a dirty contact', async () => {
    const state = mockState({ 'a': { calculatedAt: 1 } });
    const userDoc = { _id: 'foo' };
    await rulesStateStore.load(state, {}, userDoc);

    const isDirty = rulesStateStore.isDirty('a');
    expect(isDirty).to.be.true;
    expect(rulesStateStore.currentUser()).to.eq(userDoc);
  });

  it('load a fresh contact', async () => {
    const state = mockState({ 'a': { calculatedAt: Date.now() } });
    await rulesStateStore.load(state, {}, {});

    const isDirty = rulesStateStore.isDirty('a');
    expect(isDirty).to.be.false;
  });

  it('fresh contact but dirty hash', async () => {
    const state = mockState({ 'a': { calculatedAt: Date.now() } });
    state.rulesConfigHash = 'hash';
    await rulesStateStore.load(state, {}, {});

    const isDirty = rulesStateStore.isDirty('a');
    expect(isDirty).to.be.true;
  });

  it('scenario after loading state', async () => {
    const onStateChange = sinon.stub().resolves();
    const state = mockState({ 'a': { calculatedAt: Date.now() } });
    await rulesStateStore.load(state, {}, {}, onStateChange);

    const isDirty = rulesStateStore.isDirty('a');
    expect(isDirty).to.be.false;

    rulesStateStore.markDirty('b');
    expect(onStateChange.callCount).to.eq(1);
    expect(rulesStateStore.isDirty('b')).to.be.true;

    rulesStateStore.rulesConfigChange({ });
    expect(onStateChange.callCount).to.eq(2);
    expect(rulesStateStore.isDirty('a')).to.be.true;
    expect(rulesStateStore.isDirty('b')).to.be.true;
  });

  it('scenario after building state', async () => {
    const onStateChange = sinon.stub().resolves();
    await rulesStateStore.build({}, {}, onStateChange);
    expect(onStateChange.callCount).to.eq(1);
    expect(rulesStateStore.getContactIds()).to.deep.eq([]);
    expect(rulesStateStore.isDirty('a')).to.be.true;
    expect(rulesStateStore.isDirty('b')).to.be.true;
    expect(rulesStateStore.hasAllContacts()).to.be.false;

    await rulesStateStore.markFresh(Date.now(), ['a', 'b']);
    expect(onStateChange.callCount).to.eq(2);
    expect(rulesStateStore.isDirty('a')).to.be.false;
    expect(rulesStateStore.isDirty('b')).to.be.false;
    expect(rulesStateStore.getContactIds()).to.deep.eq(['a', 'b']);
    expect(rulesStateStore.hasAllContacts()).to.be.false;

    rulesStateStore.markDirty('b');
    expect(onStateChange.callCount).to.eq(3);
    expect(rulesStateStore.isDirty('b')).to.be.true;

    rulesStateStore.rulesConfigChange({ });
    expect(onStateChange.callCount).to.eq(4);
    expect(rulesStateStore.isDirty('a')).to.be.true;
    expect(rulesStateStore.isDirty('b')).to.be.true;
    expect(rulesStateStore.hasAllContacts()).to.be.false;
    expect(rulesStateStore.getContactIds()).to.deep.eq([]);
  });

  it('hasAllContacts:true scenario', async () => {
    const onStateChange = sinon.stub().resolves();
    await rulesStateStore.build({}, {}, onStateChange);
    expect(onStateChange.callCount).to.eq(1);
    expect(rulesStateStore.isDirty('a')).to.be.true;
    expect(rulesStateStore.isDirty('b')).to.be.true;
    expect(rulesStateStore.hasAllContacts()).to.be.false;

    rulesStateStore.markAllFresh(Date.now(), ['a', 'b']);
    expect(onStateChange.callCount).to.eq(2);
    expect(rulesStateStore.isDirty('a')).to.be.false;
    expect(rulesStateStore.isDirty('b')).to.be.false;
    expect(rulesStateStore.hasAllContacts()).to.be.true;

    rulesStateStore.markDirty('b');
    expect(onStateChange.callCount).to.eq(3);
    expect(rulesStateStore.isDirty('a')).to.be.false;
    expect(rulesStateStore.isDirty('b')).to.be.true;
    expect(rulesStateStore.hasAllContacts()).to.be.true;

    rulesStateStore.rulesConfigChange({});
    expect(onStateChange.callCount).to.eq(4);
    expect(rulesStateStore.isDirty('a')).to.be.true;
    expect(rulesStateStore.isDirty('b')).to.be.true;
    expect(rulesStateStore.hasAllContacts()).to.be.false;
  });

  it('rewinding clock makes contacts dirty', async () => {
    await rulesStateStore.build({}, {});
    await rulesStateStore.markFresh(Date.now() + 1000, 'a');
    expect(rulesStateStore.isDirty('a')).to.be.true;
  });

  it('contact marked fresh a month ago is not fresh', async () => {
    await rulesStateStore.build(['a'], {});
    await rulesStateStore.markFresh(Date.now(), 'a');
    expect(rulesStateStore.isDirty('a')).to.be.false;
    sinon.useFakeTimers(Date.now() + 7004800000);
    expect(rulesStateStore.isDirty('a')).to.be.true;
  });

  it('empty targets', async () => {
    const onStateChange = sinon.stub().resolves();
    await rulesStateStore.build({}, {}, onStateChange);
    rulesStateStore.storeTargetEmissions([], [{ id: 'abc', type: 'dne', contact: { _id: 'a', reported_date: 1000 } }]);
    const initialTargets = rulesStateStore.aggregateStoredTargetEmissions();
    expect(initialTargets).to.be.empty;
  });

  it('target scenario', async () => {
    const mockSettings = {
      targets: [{
        id: 'target',
      }],
    };
    const onStateChange = sinon.stub().resolves();
    await rulesStateStore.build(mockSettings, {}, onStateChange);
    rulesStateStore.storeTargetEmissions([], [{
      id: 'abc', type: 'target', pass: true, contact: { _id: 'a', reported_date: 1000 }
    }]);
    const initialTargets = rulesStateStore.aggregateStoredTargetEmissions();
    expect(initialTargets).to.deep.eq([{
      id: 'target',
      value: {
        pass: 1,
        total: 1,
      },
    }]);
  });

  describe('hashRulesConfig', () => {
    it('empty objects', () => {
      const actual = hashRulesConfig({}, {});
      expect(actual).to.not.be.empty;
    });

    it('cht config', () => {
      const settings = require('../../../config/default/app_settings.json');
      const actual = hashRulesConfig(settings, { _id: 'user' });
      expect(actual).to.not.be.empty;
    });
  });
});
