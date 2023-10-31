const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

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
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('isLimited', () => {

    it('returns false when no keys given', async () => {
      const actual = await service.isLimited();
      chai.expect(actual).to.be.false;
    });

    it('returns false when empty array given', async () => {
      const actual = await service.isLimited([]);
      chai.expect(actual).to.be.false;
    });
    
    it('returns false when undefined keys given', async () => {
      const actual = await service.isLimited([ undefined ]);
      chai.expect(actual).to.be.false;
    });

    it('returns false when key not known', async () => {
      rateLimit.get.withArgs('quay').resolves();
      const actual = await service.isLimited([ 'quay' ]);
      chai.expect(actual).to.be.false;
    });

    it('returns false when limit not reached', async () => {
      rateLimit.get.withArgs('quay').resolves({ remainingPoints: 1 });
      const actual = await service.isLimited([ 'quay' ]);
      chai.expect(actual).to.be.false;
    });

    it('returns true when limit reached', async () => {
      rateLimit.get.withArgs('quay').resolves({ remainingPoints: 0 });
      const actual = await service.isLimited([ 'quay' ]);
      chai.expect(actual).to.be.true;
    });

    it('returns true when any limit reached', async () => {
      rateLimit.get.withArgs('quay').resolves();
      rateLimit.get.withArgs('key').resolves({ remainingPoints: 1 });
      rateLimit.get.withArgs('kee').resolves({ remainingPoints: 0 });
      const actual = await service.isLimited([ 'quay', 'key', 'kee' ]);
      chai.expect(actual).to.be.true;
    });

  });

  describe('consume', () => {

    it('handles no keys given', async () => {
      await service.consume();
      chai.expect(rateLimit.consume.callCount).to.equal(0);
    });

    it('handles empty array given', async () => {
      await service.consume([]);
      chai.expect(rateLimit.consume.callCount).to.equal(0);
    });
    
    it('handles undefined keys given', async () => {
      await service.consume([ undefined ]);
      chai.expect(rateLimit.consume.callCount).to.equal(0);
    });
    
    it('consumes all keys', async () => {
      rateLimit.consume.withArgs('quay').resolves();
      rateLimit.consume.withArgs('key').resolves();
      await service.consume([ 'quay', 'key' ]);
      chai.expect(rateLimit.consume.callCount).to.equal(2);
    });

    it('ignores rejections', async () => {
      rateLimit.consume.withArgs('quay').rejects(); // rate limit exceeded
      rateLimit.consume.withArgs('key').resolves();
      await service.consume([ 'quay', 'key' ]);
      chai.expect(rateLimit.consume.callCount).to.equal(2);
    });

  });

});
