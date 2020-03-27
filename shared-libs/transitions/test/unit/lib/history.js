const history = require('../../../src/lib/history');
const sinon = require('sinon');
const should = require('chai').should();

describe('history utility', () => {

  let clock = null;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    history._clear();
    should.equal(history.check('to1', 'msg1'), false);
    should.equal(history.check('to2', 'msg2'), false);
    should.equal(history.check('to1', 'msg1'), true);
  });

  afterEach(() => {
    clock.restore();
  });

  it('tracks keys', () => {
    should.equal(history.check('to1', 'msg1'), true); // duplicate
    clock.tick(history._periodMins*60000); // expires keys
    should.equal(history.check('to1', 'msg1'), false); // not duplicate
    should.equal(history.check('to1', 'msg1'), true); // duplicate again
  });

  it('checks keys', () => {
    history._size().should.equal(2);
    should.exist(history._get('to1', 'msg1'));
    should.exist(history._get('to2', 'msg2'));
    should.not.exist(history._get('to3', 'msg3'));
  });

  it('purges keys after history period', () => {
    should.equal(history._size(), 2);
    clock.tick(history._periodMins*60000); // expires keys
    should.not.exist(history._get('to1', 'msg1'));
    should.not.exist(history._get('to2', 'msg2'));
    should.equal(history._size(), 0);
  });

  it('clears keys regardless', () => {
    should.equal(history._size(), 2);
    history._clear();
    should.equal(history._size(), 0);
  });

});
