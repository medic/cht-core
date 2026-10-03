const sinon = require('sinon');
const { expect } = require('chai');

const {
  RetryableError, retryable, isRetryableStatus, isConflict
} = require('../../../../src/lib/bulk-operations/errors');

describe('bulk-operations errors', () => {
  afterEach(() => sinon.restore());

  describe('retryable', () => {
    it('returns the result when the call succeeds', async () => {
      expect(await retryable('reading', () => Promise.resolve('ok'))).to.equal('ok');
    });

    [ 408, 409, 500, 502, 503 ].forEach(status => {
      it(`turns a ${status} into a RetryableError, so the batch is tried again`, async () => {
        const err = Object.assign(new Error('couch said no'), { status });

        const thrown = await retryable('reading', () => Promise.reject(err)).catch(e => e);

        expect(thrown).to.be.an.instanceOf(RetryableError);
        expect(thrown.message).to.equal('reading: couch said no');
        expect(thrown.cause).to.equal(err);
      });
    });

    it('reads the status off a request error too', async () => {
      const err = Object.assign(new Error('timed out'), { statusCode: 408 });

      await expect(retryable('reading', () => Promise.reject(err))).to.be.rejectedWith(RetryableError);
    });

    [ 400, 401, 403, 404, undefined ].forEach(status => {
      it(`lets a ${status} through untouched, since trying again will not help`, async () => {
        const err = Object.assign(new Error('nope'), { status });

        const thrown = await retryable('reading', () => Promise.reject(err)).catch(e => e);

        expect(thrown).to.equal(err);
        expect(thrown).to.not.be.an.instanceOf(RetryableError);
      });
    });
  });

  describe('isRetryableStatus', () => {
    it('is false when there is no status at all', () => {
      expect(isRetryableStatus(new Error('boom'))).to.equal(false);
      expect(isRetryableStatus(undefined)).to.equal(false);
    });

    it('is false for a 6xx, which is not a server error', () => {
      expect(isRetryableStatus({ status: 600 })).to.equal(false);
    });
  });

  describe('isConflict', () => {
    it('recognises only a conflict row', () => {
      expect(isConflict({ error: 'conflict' })).to.equal(true);
      expect(isConflict({ error: 'forbidden' })).to.equal(false);
      expect(isConflict({ ok: true })).to.equal(false);
    });
  });
});
