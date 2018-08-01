const history = require('../../../src/lib/history'),
      sinon = require('sinon'),
      should = require('chai').should();

describe('history utility', () => {

  let clock = null;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    history.clear();
    should.equal(history.track('key1'), false);
    should.equal(history.track('key2'), false);
    should.equal(history.track('key1'), true);
  });

  afterEach(() => {
    clock.restore();
  });

  it('tracks keys', () => {
    should.equal(history.track('key1'), true); // duplicate
    clock.tick(history.periodMins*60000); // expires keys
    should.equal(history.track('key1'), false); // not duplicate
    should.equal(history.track('key1'), true); // duplicate again
  });

  it('checks keys', () => {
    history.size().should.equal(2);
    should.exist(history.get('key1'));
    should.exist(history.get('key2'));
    should.not.exist(history.get('key3'));
  });

  it('purges keys after history period', () => {
    should.equal(history.size(), 2);
    clock.tick(history.periodMins*60000); // expires keys
    should.not.exist(history.get('key1'));
    should.not.exist(history.get('key2'));
    should.equal(history.size(), 2);
    history.purge();
    should.equal(history.size(), 0);
  });

  it('clears keys regardless', () => {
    should.equal(history.size(), 2);
    history.clear();
    should.equal(history.size(), 0);
  });

});
