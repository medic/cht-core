const sinon = require('sinon');
const { expect } = require('chai');
const middleware = require('../../../src/middleware/rate-limiter');
const rateLimitService = require('../../../src/services/rate-limit');
const serverUtils = require('../../../src/server-utils');
const auth = require('../../../src/auth');

let next;
let req;
let res;

const expectedKeys = [ 'reqip', 'requser', 'reqpass', 'basicuser', 'basicpass' ];

describe('Rate limiter middleware', () => {
  beforeEach(() => {
    sinon.stub(rateLimitService, 'isLimited');
    sinon.stub(rateLimitService, 'consume');
    sinon.stub(serverUtils, 'rateLimited');
    sinon.stub(auth, 'basicAuthCredentials').returns({ username: 'basicuser', password: 'basicpass' });
    next = sinon.stub().resolves();
    req = {
      ip: 'reqip',
      body: {
        user: 'requser',
        password: 'reqpass'
      }
    };
    res = {
      on: sinon.stub()
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  const finish = () => {
    expect(res.on.callCount).to.equal(1);
    expect(res.on.args[0][0]).to.equal('finish');
    const listenerCallback = res.on.args[0][1];
    listenerCallback();
  };

  it('does nothing if not limited', async () => {
    rateLimitService.isLimited.resolves(false);
    res.statusCode = 200;
    await middleware(req, res, next);
    expect(next.callCount).to.equal(1);
    expect(rateLimitService.consume.callCount).to.equal(0);
    expect(rateLimitService.isLimited.callCount).to.equal(1);
    expect(rateLimitService.isLimited.args[0][0]).to.deep.equal(expectedKeys);
    expect(rateLimitService.consume.callCount).to.equal(0);
    finish();
    expect(rateLimitService.consume.callCount).to.equal(0);
  });

  it('rejects if limited', async () => {
    rateLimitService.isLimited.resolves(true);
    res.statusCode = 200;
    await middleware(req, res, next);
    expect(next.callCount).to.equal(0);
    expect(rateLimitService.consume.callCount).to.equal(0);
    expect(serverUtils.rateLimited.callCount).to.equal(1);
  });

  it('consumes on 401', async () => {
    rateLimitService.isLimited.resolves(false);
    res.statusCode = 401;
    await middleware(req, res, next);
    expect(next.callCount).to.equal(1);
    expect(rateLimitService.consume.callCount).to.equal(0);
    finish();
    expect(rateLimitService.consume.callCount).to.equal(1);
    expect(rateLimitService.consume.args[0][0]).to.deep.equal(expectedKeys);
  });

  it('consumes on 429', async () => {
    rateLimitService.isLimited.resolves(false);
    res.statusCode = 429;
    await middleware(req, res, next);
    expect(next.callCount).to.equal(1);
    expect(rateLimitService.consume.callCount).to.equal(0);
    finish();
    expect(rateLimitService.consume.callCount).to.equal(1);
    expect(rateLimitService.consume.args[0][0]).to.deep.equal(expectedKeys);
  });

});
