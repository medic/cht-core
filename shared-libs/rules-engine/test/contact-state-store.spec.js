const { expect } = require('chai');
const { RestorableContactStateStore } = require('./mocks');
const sinon = require('sinon');

const contactStateStore = RestorableContactStateStore();
const hashRulesConfig = contactStateStore.__get__('hashRulesConfig');

const mockState = contactStates => ({
  rulesConfigHash: hashRulesConfig({}, {}),
  contactStates,
});

describe('contact-state-store', () => {
  afterEach(() => {
    sinon.restore();
    contactStateStore.restore();
  });

  it('throw on build twice', async () => {
    const state = mockState({ 'a': { calculatedAt: 1 } });
    await contactStateStore.load(state, {}, {});
    expect(() => contactStateStore.load(state, {}, {})).to.throw('multiple times');
    expect(contactStateStore.currentUser()).to.deep.eq({});
  });

  it('throw if not initialized', async () => {
    expect(() => contactStateStore.isDirty('a').to.throw('before call to'));
  });

  it('load a dirty contact', async () => {
    const state = mockState({ 'a': { calculatedAt: 1 } });
    const userDoc = { _id: 'foo' };
    await contactStateStore.load(state, {}, userDoc);

    const isDirty = contactStateStore.isDirty('a');
    expect(isDirty).to.be.true;
    expect(contactStateStore.currentUser()).to.eq(userDoc);
  });

  it('load a fresh contact', async () => {
    const state = mockState({ 'a': { calculatedAt: Date.now() } });
    await contactStateStore.load(state, {}, {});

    const isDirty = contactStateStore.isDirty('a');
    expect(isDirty).to.be.false;
  });

  it('fresh contact but dirty hash', async () => {
    const state = mockState({ 'a': { calculatedAt: Date.now() } });
    state.rulesConfigHash = 'hash';
    await contactStateStore.load(state, {}, {});

    const isDirty = contactStateStore.isDirty('a');
    expect(isDirty).to.be.true;
  });

  it('scenario after loading state', async () => {
    const onStateChange = sinon.stub().resolves();
    const state = mockState({ 'a': { calculatedAt: Date.now() } });
    await contactStateStore.load(state, {}, {}, onStateChange);

    const isDirty = contactStateStore.isDirty('a');
    expect(isDirty).to.be.false;

    contactStateStore.markDirty('b');
    expect(onStateChange.callCount).to.eq(1);
    expect(contactStateStore.isDirty('b')).to.be.true;

    contactStateStore.rulesConfigChange({ targets: {} });
    expect(onStateChange.callCount).to.eq(2);
    expect(contactStateStore.isDirty('a')).to.be.true;
    expect(contactStateStore.isDirty('b')).to.be.true;
  });

  it('scenario after building state', async () => {
    const onStateChange = sinon.stub().resolves();
    await contactStateStore.build({}, {}, onStateChange);
    expect(onStateChange.callCount).to.eq(1);
    expect(contactStateStore.getContactIds()).to.deep.eq([]);
    expect(contactStateStore.isDirty('a')).to.be.true;
    expect(contactStateStore.isDirty('b')).to.be.true;
    expect(contactStateStore.hasAllContacts()).to.be.false;

    await contactStateStore.markFresh(Date.now(), ['a', 'b']);
    expect(onStateChange.callCount).to.eq(2);
    expect(contactStateStore.isDirty('a')).to.be.false;
    expect(contactStateStore.isDirty('b')).to.be.false;
    expect(contactStateStore.getContactIds()).to.deep.eq(['a', 'b']);
    expect(contactStateStore.hasAllContacts()).to.be.false;

    contactStateStore.markDirty('b');
    expect(onStateChange.callCount).to.eq(3);
    expect(contactStateStore.isDirty('b')).to.be.true;

    contactStateStore.rulesConfigChange({ targets: {} });
    expect(onStateChange.callCount).to.eq(4);
    expect(contactStateStore.isDirty('a')).to.be.true;
    expect(contactStateStore.isDirty('b')).to.be.true;
    expect(contactStateStore.hasAllContacts()).to.be.false;
    expect(contactStateStore.getContactIds()).to.deep.eq([]);
  });

  it('hasAllContacts:true scenario', async () => {
    const onStateChange = sinon.stub().resolves();
    await contactStateStore.build({}, {}, onStateChange);
    expect(onStateChange.callCount).to.eq(1);
    expect(contactStateStore.isDirty('a')).to.be.true;
    expect(contactStateStore.isDirty('b')).to.be.true;
    expect(contactStateStore.hasAllContacts()).to.be.false;

    contactStateStore.markAllFresh(Date.now(), ['a', 'b']);
    expect(onStateChange.callCount).to.eq(2);
    expect(contactStateStore.isDirty('a')).to.be.false;
    expect(contactStateStore.isDirty('b')).to.be.false;
    expect(contactStateStore.hasAllContacts()).to.be.true;

    contactStateStore.markDirty('b');
    expect(onStateChange.callCount).to.eq(3);
    expect(contactStateStore.isDirty('a')).to.be.false;
    expect(contactStateStore.isDirty('b')).to.be.true;
    expect(contactStateStore.hasAllContacts()).to.be.true;

    contactStateStore.rulesConfigChange({ targets: {} });
    expect(onStateChange.callCount).to.eq(4);
    expect(contactStateStore.isDirty('a')).to.be.true;
    expect(contactStateStore.isDirty('b')).to.be.true;
    expect(contactStateStore.hasAllContacts()).to.be.false;
  });

  it('contact marked fresh a month ago is not fresh', async () => {
    await contactStateStore.build(['a'], {});
    await contactStateStore.markFresh(Date.now(), 'a');
    expect(contactStateStore.isDirty('a')).to.be.false;
    sinon.useFakeTimers(Date.now() + 7004800000);
    expect(contactStateStore.isDirty('a')).to.be.true;
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

    it('salt', () => expect(hashRulesConfig({}, {}, 1)).to.not.eq(hashRulesConfig({}, {}, 2)));
  });
});
