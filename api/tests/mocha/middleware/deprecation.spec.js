const { expect } = require('chai');
const sinon = require('sinon');

const deprecation = require('../../../src/middleware/deprecation');
const logger = require('@medic/logger');

describe('deprecation middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    next = sinon.stub();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return a function', () => {
    const middleware = deprecation.deprecate();
    expect(middleware).to.be.a('function');
  });

  it('should log current req path and point to replacement', () => {
    sinon.stub(logger, 'warn');
    req = { path: '/old-endpoint' };

    const middleware = deprecation.deprecate('/new-endpoint');

    expect(logger.warn.callCount).to.equal(0);
    expect(next.callCount).to.equal(0);

    middleware(req, res, next);

    expect(logger.warn.callCount).to.equal(1);
    expect(logger.warn.args[0]).to.deep.equal(['/old-endpoint is deprecated. Please use /new-endpoint instead.']);
    expect(next.callCount).to.equal(1);
    expect(next.args[0]).to.deep.equal([]);
  });

  it('should work without replacement', () => {
    sinon.stub(logger, 'warn');
    req = { path: '/v1/something' };

    const middleware = deprecation.deprecate();

    expect(logger.warn.callCount).to.equal(0);
    expect(next.callCount).to.equal(0);

    middleware(req, res, next);

    expect(logger.warn.callCount).to.equal(1);
    expect(logger.warn.args[0]).to.deep.equal(['/v1/something is deprecated.']);
    expect(next.callCount).to.equal(1);
    expect(next.args[0]).to.deep.equal([]);
  });
});
