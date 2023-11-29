const { expect } = require('chai');
const { RestorableRulesStateStore } = require('./mocks');
const sinon = require('sinon');
const moment = require('moment');

const rulesStateStore = RestorableRulesStateStore();
const hashRulesConfig = rulesStateStore.__get__('hashRulesConfig');

const sevenDays = 7 * 24 * 60 * 60 * 1000 + 1000;

let clock;

const mockState = contactState => ({
  rulesConfigHash: hashRulesConfig({}),
  contactState,
});

describe('rules-state-store', () => {
  afterEach(() => {
    clock && clock.restore();
    sinon.restore();
    rulesStateStore.restore();
  });

  it('throw on build twice', async () => {
    const state = mockState({ 'a': { calculatedAt: 1 } });
    await rulesStateStore.load(state, {});
    expect(() => rulesStateStore.load(state, {})).to.throw('multiple times');
    expect(rulesStateStore.currentUserContact()).to.deep.eq(undefined);
    expect(rulesStateStore.currentUserSettings()).to.deep.eq(undefined);
  });

  it('throw if not initialized', async () => {
    expect(() => rulesStateStore.isDirty('a')).to.throw('before call to');
  });

  it('load a dirty contact', async () => {
    const state = mockState({ 'a': { calculatedAt: 1 } });
    const contactDoc = { _id: 'foo' };
    const userDoc = { _id: 'org.couchdb.user.foo' };

    await rulesStateStore.load(state, { user: userDoc, contact: contactDoc });

    const isDirty = rulesStateStore.isDirty('a');
    expect(isDirty).to.be.true;
    expect(rulesStateStore.currentUserContact()).to.eq(contactDoc);
    expect(rulesStateStore.currentUserSettings()).to.eq(userDoc);
  });

  it('load a fresh contact', async () => {
    const state = mockState({ 'a': { calculatedAt: Date.now(), expireAt: Date.now() + 1000 } });
    await rulesStateStore.load(state, {});

    const isDirty = rulesStateStore.isDirty('a');
    expect(isDirty).to.be.false;
  });

  it('does not load undefined contact', async () => {
    const state = mockState({ 'a': { calculatedAt: Date.now(), expireAt: Date.now() + 1000 } });
    await rulesStateStore.load(state, {});

    const isDirty = rulesStateStore.isDirty(undefined);
    expect(isDirty).to.be.false;
  });

  it('fresh contact but dirty hash', async () => {
    const state = mockState({ 'a': { calculatedAt: Date.now(), expireAt: Date.now() + 1000 } });
    state.rulesConfigHash = 'hash';
    const needsBuilding = await rulesStateStore.load(state, {});
    expect(needsBuilding).to.equal(true);
    await rulesStateStore.build({});

    const isDirty = rulesStateStore.isDirty('a');
    expect(isDirty).to.be.true;
  });

  it('scenario after loading state', async () => {
    const onStateChange = sinon.stub().resolves();
    const state = mockState({ 'a': { calculatedAt: Date.now(), expireAt: Date.now() + 1000 } });
    await rulesStateStore.load(state, {}, onStateChange);

    const isDirty = rulesStateStore.isDirty('a');
    expect(isDirty).to.be.false;

    rulesStateStore.markDirty('b');
    expect(onStateChange.callCount).to.eq(1);
    expect(rulesStateStore.isDirty('b')).to.be.true;

    rulesStateStore.rulesConfigChange({ updated: true }); // force hash to be different!
    expect(onStateChange.callCount).to.eq(2);
    expect(rulesStateStore.isDirty('a')).to.be.true;
    expect(rulesStateStore.isDirty('b')).to.be.true;
  });

  it('scenario after building state', async () => {
    const onStateChange = sinon.stub().resolves();
    await rulesStateStore.build({}, onStateChange);
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

    rulesStateStore.rulesConfigChange({ updated: true }); // force hash to be different!
    expect(onStateChange.callCount).to.eq(4);
    expect(rulesStateStore.isDirty('a')).to.be.true;
    expect(rulesStateStore.isDirty('b')).to.be.true;
    expect(rulesStateStore.hasAllContacts()).to.be.false;
    expect(rulesStateStore.getContactIds()).to.deep.eq([]);
  });

  it('hasAllContacts:true scenario', async () => {
    const onStateChange = sinon.stub().resolves();
    await rulesStateStore.build({}, onStateChange);
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

    rulesStateStore.rulesConfigChange({ updated: true }); // force hash to be different!
    expect(onStateChange.callCount).to.eq(4);
    expect(rulesStateStore.isDirty('a')).to.be.true;
    expect(rulesStateStore.isDirty('b')).to.be.true;
    expect(rulesStateStore.hasAllContacts()).to.be.false;
  });

  it('rewinding clock makes contacts dirty', async () => {
    await rulesStateStore.build({});
    const now = Date.now();
    clock = sinon.useFakeTimers(now);
    await rulesStateStore.markFresh(now + 1000, 'a');
    expect(rulesStateStore.stateLastUpdatedAt()).to.equal(now);
    expect(rulesStateStore.isDirty('a')).to.be.true;
  });

  it('contact marked fresh a month ago is not fresh', async () => {
    const now = moment().valueOf();
    const oneMonthFromNow = moment().add(1, 'month').valueOf();
    await rulesStateStore.build({});
    await rulesStateStore.markFresh(now, 'a');
    expect(rulesStateStore.isDirty('a')).to.be.false;
    clock = sinon.useFakeTimers(oneMonthFromNow);
    expect(rulesStateStore.isDirty('a')).to.be.true;
  });

  it('empty targets', async () => {
    const onStateChange = sinon.stub().resolves();
    await rulesStateStore.build({}, onStateChange);
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
    await rulesStateStore.build(mockSettings, onStateChange);
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

  describe('marking contacts as dirty when switching reporting intervals', () => {
    it('next interval exceeds expiration time', async () => {
      const today = moment('2020-03-20').valueOf();
      const nextInterval = moment('2020-04-07').valueOf();
      clock = sinon.useFakeTimers(today);
      await rulesStateStore.build({}); // default monthStartDate is 1
      await rulesStateStore.markFresh(today, 'a');
      expect(rulesStateStore.isDirty('a')).to.be.false;
      clock.tick(nextInterval - today);
      expect(rulesStateStore.isDirty('a')).to.be.true;
    });

    it('next interval does not exceed expiration time', async () => {
      const today = moment('2020-03-30').valueOf();
      const nextInterval = moment('2020-04-02').valueOf();
      clock = sinon.useFakeTimers(today);
      await rulesStateStore.build({}); // default monthStartDate is 1
      await rulesStateStore.markFresh(today, 'a');
      expect(rulesStateStore.isDirty('a')).to.be.false;
      clock.tick(nextInterval - today);
      expect(rulesStateStore.isDirty('a')).to.be.true;
      await rulesStateStore.markFresh(nextInterval, 'a');
      expect(rulesStateStore.isDirty('a')).to.be.false;

    });

    xit('when monthStartDate is close in the past', async () => {
      const today = moment('2020-03-30').valueOf();
      const nextDate = moment('2020-04-02').valueOf();
      const pastExpiration = moment('2020-04-08').valueOf();
      clock = sinon.useFakeTimers(today);
      await rulesStateStore.build({ monthStartDate: 25 });
      await rulesStateStore.markFresh(today, 'a');
      expect(rulesStateStore.isDirty('a')).to.be.false;
      clock.tick(nextDate - today);
      expect(rulesStateStore.isDirty('a')).to.be.false;
      clock.tick(pastExpiration - today);
      expect(rulesStateStore.isDirty('a')).to.be.true;
    });

    xit('when monthStartDate is close in the future', async () => {
      const today = moment('2020-03-24').valueOf();
      const nextDate = moment('2020-03-28').valueOf();
      clock = sinon.useFakeTimers(today);
      await rulesStateStore.build({ monthStartDate: 25 });
      await rulesStateStore.markFresh(today, 'a');
      expect(rulesStateStore.isDirty('a')).to.be.false;
      clock.tick(nextDate - today);
      expect(rulesStateStore.isDirty('a')).to.be.true;
      await rulesStateStore.markFresh(nextDate, 'a');
      expect(rulesStateStore.isDirty('a')).to.be.false;
      clock.tick(sevenDays);
      expect(rulesStateStore.isDirty('a')).to.be.true;
    });

  });

  describe('onChangeState', () => {
    it('should update calculatedAt when making any change', async () => {
      const one = moment('2020-04-12').valueOf();
      clock = sinon.useFakeTimers(one);
      await rulesStateStore.build({ monthStartDate: 25, targets: [{ id: 'target' }] });

      await rulesStateStore.markDirty(['a']);
      expect(rulesStateStore.stateLastUpdatedAt()).to.equal(one);

      clock.tick(5000);
      await rulesStateStore.markFresh(one, ['a']);
      expect(rulesStateStore.stateLastUpdatedAt()).to.equal(one + 5000);

      clock.tick(5000);
      await rulesStateStore.markAllFresh(one, ['a']);
      expect(rulesStateStore.stateLastUpdatedAt()).to.equal(one + 5000 + 5000);

      clock.tick(5000);
      await rulesStateStore.storeTargetEmissions([], [{ type: 'target', contact: { _id: 'c' } }]);
      expect(rulesStateStore.stateLastUpdatedAt()).to.equal(one + 5000 + 5000 + 5000);
    });
  });

  describe('hashRulesConfig', () => {
    it('empty objects', () => {
      const actual = hashRulesConfig({});
      expect(actual).to.not.be.empty;
    });

    it('cht config', () => {
      const settings = require('../../../config/default/app_settings.json');
      const actual = hashRulesConfig(settings);
      expect(actual).to.not.be.empty;
    });
  });

  describe('getDirtyContacts', () => {
    it('no contacts', async () => {
      await rulesStateStore.build({});
      expect(rulesStateStore.getDirtyContacts()).to.deep.equal([]);
    });

    xit('some contacts', async () => {
      clock = sinon.useFakeTimers();
      const now = moment();
      await rulesStateStore.build({});
      await rulesStateStore.markFresh(0, ['a', 'b', 'c', 'd']);
      const tenDays = 10 * 24 * 60 * 60 * 1000;
      clock.tick(tenDays); // 10 days
      expect(rulesStateStore.getDirtyContacts()).to.deep.equal(['a', 'b', 'c', 'd']);
      await rulesStateStore.markFresh(now.add(10, 'days').valueOf(), ['a', 'b', 'c']);
      expect(rulesStateStore.getDirtyContacts()).to.deep.equal(['d']);
    });
  });
});
