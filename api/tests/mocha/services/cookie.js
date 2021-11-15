const chai = require('chai');
const sinon = require('sinon');
const service = require('../../../src/services/cookie');

describe('cookie service', () => {

  afterEach(() => {
    sinon.restore();
  });

  describe('get', () => {

    it('returns undefined when no headers', () => {
      const req = {};
      const actual = service.get(req, 'abc');
      chai.expect(actual).to.equal(undefined);
    });

    it('returns undefined when no cookies', () => {
      const req = { headers: {} };
      const actual = service.get(req, 'abc');
      chai.expect(actual).to.equal(undefined);
    });

    it('returns undefined when no cookie match', () => {
      const cookies = 'xyz=no';
      const req = { headers: { cookie: cookies } };
      const actual = service.get(req, 'abc');
      chai.expect(actual).to.equal(undefined);
    });

    it('returns undefined when near match', () => {
      const cookies = 'xyz=no;abcd=no';
      const req = { headers: { cookie: cookies } };
      const actual = service.get(req, 'abc');
      chai.expect(actual).to.equal(undefined);
    });

    it('returns value when match', () => {
      const cookies = 'xyz=no;abc=yes;abcd=no';
      const req = { headers: { cookie: cookies } };
      const actual = service.get(req, 'abc');
      chai.expect(actual).to.equal('yes');
    });

  });

});
