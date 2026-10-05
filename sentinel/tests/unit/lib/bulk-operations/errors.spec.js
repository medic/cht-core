const sinon = require('sinon');
const { expect } = require('chai');

const {
  RetryableError, isRetryable, statusOf, isConflict
} = require('../../../../src/lib/bulk-operations/errors');

describe('bulk-operations errors', () => {
  afterEach(() => sinon.restore());

  describe('isRetryable', () => {
    it('is true for a failure the handler raised itself', () => {
      expect(isRetryable(new RetryableError('lost to a concurrent edit'))).to.equal(true);
    });

    [ 408, 409, 500, 502, 503 ].forEach(status => {
      it(`is true for a ${status}, which says nothing about the operation itself`, () => {
        expect(isRetryable(Object.assign(new Error('couch said no'), { status }))).to.equal(true);
      });
    });

    it('reads the status off a request error too', () => {
      expect(isRetryable(Object.assign(new Error('timed out'), { statusCode: 408 }))).to.equal(true);
    });

    [ 400, 401, 403, 404 ].forEach(status => {
      it(`is false for a ${status}, since running it again will not help`, () => {
        expect(isRetryable(Object.assign(new Error('nope'), { status }))).to.equal(false);
      });
    });

    it('is false when there is no status at all', () => {
      expect(isRetryable(new Error('boom'))).to.equal(false);
      expect(isRetryable(undefined)).to.equal(false);
    });

    it('is false for a 6xx, which is not a server error', () => {
      expect(isRetryable({ status: 600 })).to.equal(false);
    });
  });

  describe('statusOf', () => {
    it('reads either name, and nothing when there is neither', () => {
      expect(statusOf({ status: 503 })).to.equal(503);
      expect(statusOf({ statusCode: 408 })).to.equal(408);
      expect(statusOf(new Error('boom'))).to.equal(undefined);
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
