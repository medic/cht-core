const chai = require('chai');
const errors = require('../../src/errors');

describe('errors', () => {
  describe('PublicError', () => {
    it('exposes the publicMessage as both Error.message and publicMessage', () => {
      const err = new errors.PublicError('something safe to show');
      chai.expect(err).to.be.an.instanceOf(Error);
      chai.expect(err.message).to.equal('something safe to show');
      chai.expect(err.publicMessage).to.equal('something safe to show');
    });
  });

  describe('NotFoundError', () => {
    it('carries both status and statusCode set to 404', () => {
      const err = new errors.NotFoundError('missing');
      chai.expect(err).to.be.an.instanceOf(Error);
      chai.expect(err.message).to.equal('missing');
      chai.expect(err.status).to.equal(404);
      chai.expect(err.statusCode).to.equal(404);
    });
  });

  describe('PermissionError', () => {
    it('carries code 403', () => {
      const err = new errors.PermissionError('no');
      chai.expect(err).to.be.an.instanceOf(Error);
      chai.expect(err.message).to.equal('no');
      chai.expect(err.code).to.equal(403);
    });
  });

  describe('AuthenticationError', () => {
    it('carries code 401', () => {
      const err = new errors.AuthenticationError('who?');
      chai.expect(err).to.be.an.instanceOf(Error);
      chai.expect(err.message).to.equal('who?');
      chai.expect(err.code).to.equal(401);
    });
  });

  describe('ContentTypeError', () => {
    it('carries code 415', () => {
      const err = new errors.ContentTypeError('bad type');
      chai.expect(err).to.be.an.instanceOf(Error);
      chai.expect(err.message).to.equal('bad type');
      chai.expect(err.code).to.equal(415);
    });
  });

  describe('BadRequestError', () => {
    it('carries code 400', () => {
      const err = new errors.BadRequestError('bad');
      chai.expect(err).to.be.an.instanceOf(Error);
      chai.expect(err.message).to.equal('bad');
      chai.expect(err.code).to.equal(400);
    });
  });

  describe('PayloadTooLargeError', () => {
    it('carries code 413', () => {
      const err = new errors.PayloadTooLargeError('too big');
      chai.expect(err).to.be.an.instanceOf(Error);
      chai.expect(err.message).to.equal('too big');
      chai.expect(err.code).to.equal(413);
    });
  });

  it('every exported class is a distinct constructor', () => {
    const ctors = [
      errors.PublicError,
      errors.NotFoundError,
      errors.PermissionError,
      errors.AuthenticationError,
      errors.ContentTypeError,
      errors.BadRequestError,
      errors.PayloadTooLargeError,
    ];
    const unique = new Set(ctors);
    chai.expect(unique.size).to.equal(ctors.length);
    for (const Ctor of ctors) {
      chai.expect(new Ctor('x')).to.be.an.instanceOf(Error);
    }
  });
});
