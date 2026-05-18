const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

const auth = require('../../../src/auth');

let service;
let rateLimit;

describe('rate-limit service', () => {
  
  beforeEach(() => {
    service = rewire('../../../src/services/rate-limit');

    rateLimit = {
      get: sinon.stub(),
      consume: sinon.stub()
    };
    service.__set__('failedLoginLimit', rateLimit);

    sinon.stub(auth, 'basicAuthCredentials').returns(false);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('isLimited', () => {

    it('returns false when key not known', async () => {
      const req = { ip: 'quay' };
      rateLimit.get.withArgs('quay').resolves();
      const actual = await service.isLimited(req);
      chai.expect(actual).to.be.false;
      chai.expect(rateLimit.get.callCount).to.equal(1);
    });

    it('returns false when limit not reached', async () => {
      const req = { ip: 'quay' };
      rateLimit.get.withArgs('quay').resolves({ remainingPoints: 1 });
      const actual = await service.isLimited(req);
      chai.expect(actual).to.be.false;
      chai.expect(rateLimit.get.callCount).to.equal(1);
    });

    it('returns true when limit reached', async () => {
      const req = { ip: 'quay' };
      rateLimit.get.withArgs('quay').resolves({ remainingPoints: 0 });
      const actual = await service.isLimited(req);
      chai.expect(actual).to.be.true;
      chai.expect(rateLimit.get.callCount).to.equal(1);
    });

    it('returns false when no limit reached', async () => {
      const req = {
        ip: 'quay',
        body: { user: 'key', password: 'kee' }
      };
      auth.basicAuthCredentials.returns({ username: 'basicuser', password: 'basicpass' });
      rateLimit.get.withArgs('quay').resolves();
      rateLimit.get.withArgs('key').resolves({ remainingPoints: 1 });
      rateLimit.get.withArgs('basicuser').resolves({ remainingPoints: 1 });
      const actual = await service.isLimited(req);
      chai.expect(actual).to.be.false;
      chai.expect(rateLimit.get.callCount).to.equal(3);
    });

    it('returns true when any limit reached', async () => {
      const req = {
        ip: 'quay',
        body: { user: 'key', password: 'kee' }
      };
      auth.basicAuthCredentials.returns({ username: 'basicuser', password: 'basicpass' });
      rateLimit.get.withArgs('quay').resolves();
      rateLimit.get.withArgs('key').resolves({ remainingPoints: 0 });
      rateLimit.get.withArgs('basicuser').resolves({ remainingPoints: 1 });
      const actual = await service.isLimited(req);
      chai.expect(actual).to.be.true;
      chai.expect(rateLimit.get.callCount).to.equal(2);
    });

  });

  describe('consume', () => {

    it('consumes all keys', async () => {
      const req = {
        ip: 'quay',
        body: { user: 'key', password: 'kee' }
      };
      auth.basicAuthCredentials.returns({ username: 'basicuser', password: 'basicpass' });
      rateLimit.consume.resolves();
      await service.consume(req);
      chai.expect(rateLimit.consume.callCount).to.equal(3);
      chai.expect(rateLimit.consume.args[0][0]).to.equal('quay');
      chai.expect(rateLimit.consume.args[1][0]).to.equal('key');
      chai.expect(rateLimit.consume.args[2][0]).to.equal('basicuser');
    });

    it('ignores rejections', async () => {
      const req = {
        ip: 'quay',
        body: { user: 'key', password: 'kee' }
      };
      rateLimit.consume.withArgs('quay').rejects(); // rate limit exceeded
      rateLimit.consume.withArgs('key').resolves();
      await service.consume(req);
      chai.expect(rateLimit.consume.callCount).to.equal(2);
    });

  });

});
