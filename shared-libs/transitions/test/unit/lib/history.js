const sinon = require('sinon');
const should = require('chai').should();
const rewire = require('rewire');

const config = require('../../../src/config');
let history;

describe('history utility', () => {

  let clock = null;

  beforeEach(() => {
    config.init({ get: sinon.stub() });
    clock = sinon.useFakeTimers();
    history = rewire('../../../src/lib/history');
  });

  afterEach(() => {
    clock.restore();
    sinon.reset();
    sinon.restore();
  });

  it('should not default to duplicate', () => {
    should.equal(history.check('to1', 'msg1'), false);
    should.equal(history.check('to2', 'msg1'), false);
    should.equal(history.check('to1', 'msg2'), false);
    should.equal(history.check('to2', 'msg2'), false);
  });

  it('should return false when not duplicate with default limit', () => {
    // not stubbing config.get cause, let's presume we have no config at all
    // default limit is 5
    should.equal(history.check('to1', 'msg1'), false);
    should.equal(history.check('to1', 'msg1'), false);
    should.equal(history.check('to1', 'msg1'), false);
    should.equal(history.check('to1', 'msg1'), false);
    should.equal(history.check('to1', 'msg1'), false);
    should.equal(history.check('to1', 'msg1'), true);

    clock.tick(history.__get__('TIME_TO_LIVE')); // expires keys
    should.equal(history.check('to1', 'msg1'), false);
  });

  it('should return false when duplicate with configured limit', () => {
    config.get.returns({ duplicate_limit: 3 });
    should.equal(history.check('to1', 'msg1'), false);
    should.equal(history.check('to1', 'msg1'), false);
    should.equal(history.check('to1', 'msg1'), false);
    should.equal(history.check('to1', 'msg1'), true);
    should.equal(history.check('to1', 'msg1'), true);

    clock.tick(history.__get__('TIME_TO_LIVE')); // expires keys
    should.equal(history.check('to1', 'msg1'), false);
  });

  it('should use default maximum limit when configured limit is too high', () => {
    config.get.returns({ duplicate_limit: 300 });
    for (let i = 0; i < 20; i++) {
      should.equal(history.check('to1', 'msg1'), false);
    }
    should.equal(history.check('to1', 'msg1'), true);
  });

  it('should normalize limit', () => {
    config.get.returns({ duplicate_limit: 'not a number' });
    should.equal(history.check('to1', 'msg1'), false);
    should.equal(history.check('to1', 'msg1'), false);
    should.equal(history.check('to1', 'msg1'), false);
    should.equal(history.check('to1', 'msg1'), false);
    should.equal(history.check('to1', 'msg1'), false);
    should.equal(history.check('to1', 'msg1'), true);

    config.get.returns({ duplicate_limit: '25 dolars' }); // not a number, so uses default limit
    should.equal(history.check('to2', 'msg1'), false);
    should.equal(history.check('to2', 'msg1'), false);
    should.equal(history.check('to2', 'msg1'), false);
    should.equal(history.check('to2', 'msg1'), false);
    should.equal(history.check('to2', 'msg1'), false);
    should.equal(history.check('to2', 'msg1'), true);

    config.get.returns({ duplicate_limit: '0' }); // zero, so uses default limit
    should.equal(history.check('to3', 'msg1'), false);
    should.equal(history.check('to3', 'msg1'), false);
    should.equal(history.check('to3', 'msg1'), false);
    should.equal(history.check('to3', 'msg1'), false);
    should.equal(history.check('to3', 'msg1'), false);
    should.equal(history.check('to3', 'msg1'), true);

    config.get.returns({ duplicate_limit: '-20' }); // lower than 0, so uses default limit
    should.equal(history.check('to4', 'msg1'), false);
    should.equal(history.check('to4', 'msg1'), false);
    should.equal(history.check('to4', 'msg1'), false);
    should.equal(history.check('to4', 'msg1'), false);
    should.equal(history.check('to4', 'msg1'), false);
    should.equal(history.check('to4', 'msg1'), true);
  });

  it('tracks keys', () => {
    config.get.returns({ duplicate_limit: 1 });
    should.equal(history.check('to1', 'msg1'), false);
    should.equal(history.check('to1', 'msg1'), true); // duplicate

    clock.tick(history.__get__('TIME_TO_LIVE')); // expires keys

    should.equal(history.check('to1', 'msg1'), false); // not duplicate
    should.equal(history.check('to1', 'msg1'), true); // duplicate again
  });

  it('checks keys', () => {
    should.equal(history.check('to1', 'msg1'), false);
    should.equal(history.check('to1', 'msg2'), false);
    should.equal(history.check('to2', 'msg1'), false);
    should.equal(history.check('to2', 'msg2'), false);

    const records = history.__get__('records');
    const getKey = history.__get__('getKey');

    should.equal(Object.keys(records).length, 4);
    should.equal(records[getKey('to1', 'msg1')].count, 1);
    should.equal(records[getKey('to1', 'msg2')].count, 1);
    should.equal(records[getKey('to2', 'msg1')].count, 1);
    should.equal(records[getKey('to2', 'msg2')].count, 1);

    should.equal(history.check('to1', 'msg1'), false);
    should.equal(records[getKey('to1', 'msg1')].count, 2);
    should.equal(records[getKey('to1', 'msg2')].count, 1);
    should.equal(records[getKey('to2', 'msg1')].count, 1);
    should.equal(records[getKey('to2', 'msg2')].count, 1);

    should.equal(history.check('to1', 'msg1'), false);
    should.equal(records[getKey('to1', 'msg1')].count, 3);
    should.equal(records[getKey('to1', 'msg2')].count, 1);
    should.equal(records[getKey('to2', 'msg1')].count, 1);
    should.equal(records[getKey('to2', 'msg2')].count, 1);

    clock.tick(history.__get__('TIME_TO_LIVE')); // expires keys
    should.equal(history.check('to1', 'msg1'), false);
    should.equal(Object.keys(records).length, 4);
    should.equal(records[getKey('to1', 'msg1')].count, 1);
    should.equal(records[getKey('to1', 'msg2')].count, 1);
    should.equal(records[getKey('to2', 'msg1')].count, 1);
    should.equal(records[getKey('to2', 'msg2')].count, 1);
  });

  it('should purge expired keys when key threshold is reached', () => {
    const limit = 1000;
    for (let i = 0; i < limit; i++) {
      history.check(i, i);
      history.check(i, i);
    }
    const records = history.__get__('records');
    should.equal(Object.keys(records).length, 1000);

    clock.tick(history.__get__('TIME_TO_LIVE')); // expires keys
    history.check('new', 'message');
    should.equal(Object.keys(records).length, 1);
  });
});
