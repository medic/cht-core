const sinon = require('sinon');
const { expect } = require('chai');
const rewire = require('rewire');

let changeRetryHistory;

describe('change-retry-history', () => {
  beforeEach(() => {
    changeRetryHistory = rewire('../../../src/lib/change-retry-history');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('add', () => {
    it('should not throw errors on bad changes', () => {
      changeRetryHistory.add();
      changeRetryHistory.add(false);
      changeRetryHistory.add('string');
      changeRetryHistory.add(23);
      changeRetryHistory.add({});
      changeRetryHistory.add({ id: 'test', changes: false });
      expect(changeRetryHistory.__get__('historyKeys').length).to.equal(2);
    });

    it('should add key to history', () => {
      changeRetryHistory.add({ id: 'theid', changes: [{ rev: '22-rev' }] });
      expect(changeRetryHistory.__get__('historyKeys')).to.deep.equal(['theid22-rev']);
      expect(changeRetryHistory.__get__('history')).to.deep.equal({ 'theid22-rev': 1 });

      changeRetryHistory.add({ id: 'theid', changes: [{ rev: '23-rev' }] });
      expect(changeRetryHistory.__get__('historyKeys')).to.deep.equal(['theid22-rev', 'theid23-rev']);
      expect(changeRetryHistory.__get__('history')).to.deep.equal({ 'theid22-rev': 1, 'theid23-rev': 1 });
    });

    it('should increase number when re-adding', () => {
      changeRetryHistory.add({ id: 'phil', changes: [{ rev: '11-77' }] });
      expect(changeRetryHistory.__get__('historyKeys')).to.deep.equal(['phil11-77']);
      expect(changeRetryHistory.__get__('history')).to.deep.equal({ 'phil11-77': 1 });


      changeRetryHistory.add({ id: 'phil', changes: [{ rev: '11-77' }] });
      expect(changeRetryHistory.__get__('historyKeys')).to.deep.equal(['phil11-77']);
      expect(changeRetryHistory.__get__('history')).to.deep.equal({ 'phil11-77': 2 });

      changeRetryHistory.add({ id: 'phil', changes: [{ rev: '11-77' }] });
      expect(changeRetryHistory.__get__('historyKeys')).to.deep.equal(['phil11-77']);
      expect(changeRetryHistory.__get__('history')).to.deep.equal({ 'phil11-77': 3 });

      changeRetryHistory.add({ id: 'phil', changes: [{ rev: '11-77' }] });
      expect(changeRetryHistory.__get__('history')).to.deep.equal({ 'phil11-77': 4 });
    });

    it('should push old changes out of queue', () => {
      Array
        .from({ length: 1000 })
        .forEach((_, idx) => changeRetryHistory.add({ id: `${idx + 1}`, changes: [{ rev: `${idx + 1}` }] }));

      expect(changeRetryHistory.__get__('historyKeys').length).to.equal(1000);

      changeRetryHistory.add({ id: 'george', changes: [{ rev: '22-77' }] });
      expect(changeRetryHistory.__get__('historyKeys').length).to.equal(1000);
      expect(changeRetryHistory.__get__('historyKeys')[0]).to.equal('22');
      expect(changeRetryHistory.__get__('historyKeys')[1]).to.equal('33');
      expect(changeRetryHistory.__get__('historyKeys')[999]).to.equal('george22-77');

      changeRetryHistory.add({ id: 'michael', changes: [{ rev: '33-77' }] });
      expect(changeRetryHistory.__get__('historyKeys').length).to.equal(1000);
      expect(changeRetryHistory.__get__('historyKeys')[0]).to.equal('33');
      expect(changeRetryHistory.__get__('historyKeys')[1]).to.equal('44');
      expect(changeRetryHistory.__get__('historyKeys')[998]).to.equal('george22-77');
      expect(changeRetryHistory.__get__('historyKeys')[999]).to.equal('michael33-77');
    });
  });

  describe('shouldProcess', () => {
    it('should not throw errors on bad changes', () => {
      expect(changeRetryHistory.shouldProcess()).to.equal(false);
      changeRetryHistory.shouldProcess(false);
      changeRetryHistory.shouldProcess('string');
      changeRetryHistory.shouldProcess(23);
      changeRetryHistory.shouldProcess({});
      changeRetryHistory.shouldProcess({ id: 'test', changes: false });
    });

    it('should return true when item is not present', () => {
      const change = { id: 'a', changes: [{ rev: '33-77' }] };
      expect(changeRetryHistory.shouldProcess(change)).to.equal(true);
      changeRetryHistory.add({ id: 'george', changes: [{ rev: '22-77' }] });
      expect(changeRetryHistory.shouldProcess(change)).to.equal(true);
      changeRetryHistory.add({ id: 'michael', changes: [{ rev: '33-77' }] });
      expect(changeRetryHistory.shouldProcess(change)).to.equal(true);
    });

    it('should return true when item is present but does not exceed limit', () => {
      const change = { id: 'a', changes: [{ rev: '33-77' }] };
      changeRetryHistory.add(change);
      expect(changeRetryHistory.shouldProcess(change)).to.equal(true);
      changeRetryHistory.add(change);
      expect(changeRetryHistory.shouldProcess(change)).to.equal(true);
      changeRetryHistory.add(change);
      expect(changeRetryHistory.shouldProcess(change)).to.equal(true);
      changeRetryHistory.add(change);
      expect(changeRetryHistory.shouldProcess(change)).to.equal(true);
      changeRetryHistory.add(change);
      expect(changeRetryHistory.shouldProcess(change)).to.equal(true);
      changeRetryHistory.add(change);
      expect(changeRetryHistory.shouldProcess(change)).to.equal(false);
    });

    it('should return true when item is present and new rev does not exceed limit', () => {
      const change = { id: 'a', changes: [{ rev: '33-77' }] };
      changeRetryHistory.add(change);
      changeRetryHistory.add(change);
      changeRetryHistory.add(change);
      changeRetryHistory.add(change);
      changeRetryHistory.add(change);
      changeRetryHistory.add(change);

      const newRevChange = { id: 'a', changes: [{ rev: '34-77' }] };
      expect(changeRetryHistory.shouldProcess(newRevChange)).to.equal(true);
      expect(changeRetryHistory.shouldProcess(change)).to.equal(false);
    });
  });
});
