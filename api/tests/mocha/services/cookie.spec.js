const chai = require('chai');
const sinon = require('sinon');
const rewire = require('rewire');

let res;
let service;
const oneYear = 31536000000;

describe('cookie service', () => {
  beforeEach(() => {
    sinon.stub(process, 'env').value({});
    service = rewire('../../../src/services/cookie');
    res = {
      cookie: sinon.stub(),
    };
  });

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

  describe('setUserCtx', () => {
    it('should set cookie with correct options when not in production env', () => {
      sinon.stub(process, 'env').value({});
      const content = 'the content';
      service.setUserCtx(res, content);
      chai.expect(res.cookie.callCount).to.equal(1);
      chai.expect(res.cookie.args[0]).to.deep.equal([
        'userCtx',
        content,
        {
          sameSite: 'lax',
          secure: false,
          maxAge: oneYear,
        },
      ]);
    });

    it('should set cookie with correct options when in production env', () => {
      sinon.stub(process, 'env').value({ NODE_ENV: 'production' });
      service = rewire('../../../src/services/cookie');

      const content = { anything: 'can go here' };
      service.setUserCtx(res, content);
      chai.expect(res.cookie.callCount).to.equal(1);
      chai.expect(res.cookie.args[0]).to.deep.equal([
        'userCtx',
        content,
        {
          sameSite: 'lax',
          secure: true,
          maxAge: oneYear,
        },
      ]);
    });
  });

  describe('setLocale', () => {
    it('should set cookie with correct options when not in production env', () => {
      sinon.stub(process, 'env').value({});
      const locale = 'this is the locale';
      service.setLocale(res, locale);
      chai.expect(res.cookie.callCount).to.equal(1);
      chai.expect(res.cookie.args[0]).to.deep.equal([
        'locale',
        locale,
        {
          sameSite: 'lax',
          secure: false,
          maxAge: oneYear,
        },
      ]);
    });

    it('should set cookie with correct options when in production env', () => {
      sinon.stub(process, 'env').value({ NODE_ENV: 'production' });
      service = rewire('../../../src/services/cookie');

      const locale = { the: 'locale' };
      service.setLocale(res, locale);
      chai.expect(res.cookie.callCount).to.equal(1);
      chai.expect(res.cookie.args[0]).to.deep.equal([
        'locale',
        locale,
        {
          sameSite: 'lax',
          secure: true,
          maxAge: oneYear,
        },
      ]);
    });
  });

  describe('setSession', () => {
    it('should work with simple cookie', () => {
      const cookieString = 'AuthSession=sessionID';
      service.setSession(res, cookieString);
      chai.expect(res.cookie.callCount).to.equal(1);
      chai.expect(res.cookie.args[0]).to.deep.equal([
        'AuthSession',
        'sessionID',
        {
          sameSite: 'lax',
          secure: false,
          httpOnly: true,
        },
      ]);
    });

    it('should copy max-age attribute', () => {
      const cookieString = 'AuthSession=sessionID; Max-Age=200';
      service.setSession(res, cookieString);
      chai.expect(res.cookie.callCount).to.equal(1);
      chai.expect(res.cookie.args[0]).to.deep.equal([
        'AuthSession',
        'sessionID',
        {
          sameSite: 'lax',
          secure: false,
          httpOnly: true,
          maxAge: 200000,
        },
      ]);
    });

    it('should copy max-age attribute when multiple attributes are present', () => {
      const cookieString = 'AuthSession=sessionID; Expires=10-10-2020; Path=/; Max-Age=1500; Domain=medic; HttpOnly';
      service.setSession(res, cookieString);
      chai.expect(res.cookie.callCount).to.equal(1);
      chai.expect(res.cookie.args[0]).to.deep.equal([
        'AuthSession',
        'sessionID',
        {
          sameSite: 'lax',
          secure: false,
          httpOnly: true,
          maxAge: 1500000,
        },
      ]);
    });

    it('should normalize attribute names and values', () => {
      const cookie = 'AuthSession=sessionID; expires=10-10-2020; path=/;  maxAge  =  6000  ; domain=medic; httpOnly';
      service.setSession(res, cookie);
      chai.expect(res.cookie.callCount).to.equal(1);
      chai.expect(res.cookie.args[0]).to.deep.equal([
        'AuthSession',
        'sessionID',
        {
          sameSite: 'lax',
          secure: false,
          httpOnly: true,
          maxAge: 6000000,
        },
      ]);
    });

    it('should create a secure cookie when in production', () => {
      sinon.stub(process, 'env').value({ NODE_ENV: 'production' });
      service = rewire('../../../src/services/cookie');

      const cookieString = 'AuthSession=sessionID; Path=/; Max-Age=454545; Domain=medic; Expires=01-01-2022; HttpOnly';
      service.setSession(res, cookieString);
      chai.expect(res.cookie.callCount).to.equal(1);
      chai.expect(res.cookie.args[0]).to.deep.equal([
        'AuthSession',
        'sessionID',
        {
          sameSite: 'lax',
          secure: true,
          httpOnly: true,
          maxAge: 454545000,
        },
      ]);
    });
  });

  describe('setForceLogin', () => {
    it('should set cookie with correct value and options when not in production environment', () => {
      service.setForceLogin(res);

      chai.expect(res.cookie.callCount).to.equal(1);
      chai.expect(res.cookie.args[0]).to.deep.equal([
        'login',
        'force',
        { sameSite: 'lax', secure: false },
      ]);
    });

    it('should set cookie with correct value and options when in production environment', () => {
      sinon.stub(process, 'env').value({ NODE_ENV: 'production' });
      service = rewire('../../../src/services/cookie'); // Rewire to pick stub in process.env.

      service.setForceLogin(res);

      chai.expect(res.cookie.callCount).to.equal(1);
      chai.expect(res.cookie.args[0]).to.deep.equal([
        'login',
        'force',
        { sameSite: 'lax', secure: true },
      ]);
    });
  });
});
