const rewire = require('rewire');
const _ = require('lodash');
const fs = require('fs');
const chai = require('chai');
const sinon = require('sinon');
const request = require('@medic/couch-request');

const environment = require('@medic/environment');
const auth = require('../../../src/auth');
const cookie = require('../../../src/services/cookie');
const branding = require('../../../src/services/branding');
const rateLimit = require('../../../src/services/rate-limit');
const db = require('../../../src/db');
const translations = require('../../../src/translations');
const privacyPolicy = require('../../../src/services/privacy-policy');
const config = require('../../../src/config');
const dataContext = require('../../../src/services/data-context');
const { ssoLogin, tokenLogin, roles, users } = require('@medic/user-management')(config, db, dataContext);
const template = require('../../../src/services/template');
const serverUtils = require('../../../src/server-utils');
const sso = require('../../../src/services/sso-login');
const logger = require('@medic/logger');

let controller;

let req;
let res;

const DEFAULT_BRANDING = {
  logo: 'xyz',
  name: 'CHT',
  icon: 'icon.png',
};

const DEFAULT_COOKIE_OPTIONS = {
  sameSite: 'lax',
  secure: false,
  maxAge: 31536000000
};

describe('login controller', () => {

  beforeEach(() => {
    template.clear();
    controller = rewire('../../../src/controllers/login');

    req = {
      query: {},
      body: {},
      hostname: 'xx.app.medicmobile.org',
      protocol: 'http',
      headers: { cookie: '' },
      get: sinon.stub().withArgs('host').returns('xx.app.medicmobile.org')
    };
    res = {
      redirect: () => {},
      send: () => {},
      status: () => {},
      json: () => {},
      cookie: () => {},
      clearCookie: () => {},
      setHeader: () => {}
    };

    sinon.stub(environment, 'serverUrlNoAuth').get(() => 'http://test.com:1234');
    sinon.stub(environment, 'isTesting').get(() => false);

    sinon.stub(roles, 'isOnlineOnly').returns(false);
    sinon.stub(privacyPolicy, 'exists').resolves(false);

    sinon.stub(rateLimit, 'isLimited').returns(false);
    sinon.stub(serverUtils, 'rateLimited').resolves();
    sinon.stub(db.medic, 'get');
    sinon.stub(db.users, 'get');
    sinon.stub(ssoLogin, 'isSsoLoginEnabled').resolves(false);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('safePath', () => {

    [
      {
        given: '',
        expected: '/'
      },
      {
        given: null,
        expected: '/'
      },
      {
        given: 'http://example.com',
        expected: '/'
      },
      {
        given: '%22%3E%3Cscript%3Ealert%28%27hello%27%29%3C/script%3E',
        expected: '/%22%3E%3Cscript%3Ealert%28%27hello%27%29%3C/script%3E'
      },
      {
        given: 'https://app.medicmobile.org/right/path',
        expected: '/right/path'
      },
      {
        given: 'http://app.medicmobile.org/lg/_design/medic/_rewrite',
        expected: '/lg/_design/medic/_rewrite'
      },
      {
        given: '/lg/_design/medic/_rewrite/../../../../../.htpasswd',
        expected: '/.htpasswd'
      },
      {
        given: 'https://demo-cht.dev.medicmobile.org//MYFAKESITE.com/phishing-example/login/',
        expected: '/'
      },
      {
        given: 'https://demo-cht.dev.medicmobile.org/%2F%61%6C%78%6E%64%72%73%6E%2E%67%69%74%68%75%62%2E%69%6F%2F%70%68%69%73%68%69%6E%67%2D%65%78%61%6D%70%6C%65%2F%6C%6F%67%69%6E%26%75%73%65%72%6E%61%6D%65%3D%67%61%72%65%74%68',
        expected: '/'
      },
    ].forEach(({given, expected}) => {
      it(`Bad URL "${given}" should redirect to root`, () => {
        chai.expect(controller.__get__('getRedirectUrl')({}, given)).to.equal(expected);
      });
    });

    [
      '/lg/_design/medic/_rewrite',
      '/lg/_design/medic/_rewrite/',
      '/lg/_design/medic/_rewrite#fragment',
      '/lg/_design/medic/_rewrite#path/fragment',
      '/lg/_design/medic/_rewrite/long/path',
    ].forEach(requested => {
      it(`Good URL "${requested}" should redirect unchanged`, () => {
        chai.expect(controller.__get__('getRedirectUrl')({}, requested)).to.equal(requested);
      });
    });

    [
      {
        given: 'http://test.com:1234/lg/_design/medic/_rewrite',
        expected: '/lg/_design/medic/_rewrite'
      },
      {
        given: 'http://test.com:1234/lg/_design/medic/_rewrite#fragment',
        expected: '/lg/_design/medic/_rewrite#fragment'
      },
      {
        given: 'http://wrong.com:666/lg/_design/medic/_rewrite#path/fragment',
        expected: '/lg/_design/medic/_rewrite#path/fragment'
      },
      {
        given: 'http://wrong.com:666/lg/_design/medic/_rewrite/long/path',
        expected: '/lg/_design/medic/_rewrite/long/path'
      },
    ].forEach(({ given, expected }) => {
      it(`Absolute URL "${given}" should redirect as a relative url`, () => {
        chai.expect(controller.__get__('getRedirectUrl')({}, given)).to.equal(expected);
      });
    });

  });

  describe('get', () => {
    it('send login page', () => {
      sinon.stub(translations, 'getEnabledLocales').resolves([]);
      const linkResources = '</login/style.css>; rel=preload; as=style, '
          + '</login/script.js>; rel=preload; as=script, '
          + '</login/auth-utils.js>; rel=preload; as=script, '
          + '</login/lib-bowser.js>; rel=preload; as=script';
      const brandingGet = sinon.stub(branding, 'get').resolves(DEFAULT_BRANDING);
      const send = sinon.stub(res, 'send');
      const setHeader = sinon.stub(res, 'setHeader');
      sinon.stub(fs.promises, 'readFile').resolves('LOGIN PAGE GOES HERE. {{ translations }}');
      sinon.stub(config, 'getTranslations').returns({ en: { login: 'English' } });
      return controller.get(req, res).then(() => {
        chai.expect(brandingGet.callCount).to.equal(1);
        chai.expect(send.callCount).to.equal(1);
        chai.expect(send.args[0][0])
          .to.equal('LOGIN PAGE GOES HERE. %7B%22en%22%3A%7B%22login%22%3A%22English%22%7D%7D');
        chai.expect(setHeader.callCount).to.equal(1);
        chai.expect(setHeader.args[0][0]).to.equal('Link');
        chai.expect(setHeader.args[0][1]).to.equal(linkResources);
        chai.expect(fs.promises.readFile.callCount).to.equal(1);
        chai.expect(translations.getEnabledLocales.callCount).to.equal(1);
        chai.expect(ssoLogin.isSsoLoginEnabled.calledOnceWithExactly()).to.be.true;
      });
    });

    it('when branding doc missing send login page', () => {
      const linkResources = '</login/style.css>; rel=preload; as=style, '
          + '</login/script.js>; rel=preload; as=script, '
          + '</login/auth-utils.js>; rel=preload; as=script, '
          + '</login/lib-bowser.js>; rel=preload; as=script';
      const brandingGet = sinon.stub(branding, 'get').resolves(DEFAULT_BRANDING);
      sinon.stub(translations, 'getEnabledLocales').resolves([]);
      const send = sinon.stub(res, 'send');
      const setHeader = sinon.stub(res, 'setHeader');
      sinon.stub(template, 'getTemplate').resolves(() => 'LOGIN PAGE GOES HERE.');
      sinon.stub(config, 'getTranslations').returns({});
      return controller.get(req, res).then(() => {
        chai.expect(brandingGet.callCount).to.equal(1);
        chai.expect(send.callCount).to.equal(1);
        chai.expect(send.args[0][0]).to.equal('LOGIN PAGE GOES HERE.');
        chai.expect(setHeader.callCount).to.equal(1);
        chai.expect(setHeader.args[0][0]).to.equal('Link');
        chai.expect(setHeader.args[0][1]).to.equal(linkResources);
        chai.expect(ssoLogin.isSsoLoginEnabled.calledOnceWithExactly()).to.be.true;
      });
    });

    it('caches the login page template for performance', () => {
      sinon.stub(res, 'send');
      sinon.stub(res, 'setHeader');
      sinon.stub(translations, 'getEnabledLocales').resolves([]);
      sinon.stub(res, 'cookie').returns(res);
      const readFile = sinon.stub(fs.promises, 'readFile').resolves('file content');
      sinon.stub(config, 'translate').returns('TRANSLATED VALUE.');
      sinon.stub(users, 'getUserDoc').resolves();
      const template = sinon.stub(_, 'template').returns(sinon.stub());
      sinon.stub(branding, 'get').resolves(DEFAULT_BRANDING);
      return controller.get(req, res) // first request
        .then(() => {
          chai.expect(readFile.callCount).to.equal(1);
          chai.expect(template.callCount).to.equal(1);
          chai.expect(ssoLogin.isSsoLoginEnabled.calledOnceWithExactly()).to.be.true;
        })
        .then(() => controller.get(req, res)) // second request
        .then(() => {
          // should be cached
          chai.expect(readFile.callCount).to.equal(1);
          chai.expect(template.callCount).to.equal(1);
          chai.expect(ssoLogin.isSsoLoginEnabled.calledTwice).to.be.true;
        });
    });

    it('hides locale selector when there is only one option', () => {
      const linkResources = '</login/style.css>; rel=preload; as=style, '
          + '</login/script.js>; rel=preload; as=script, '
          + '</login/auth-utils.js>; rel=preload; as=script, '
          + '</login/lib-bowser.js>; rel=preload; as=script';
      const setHeader = sinon.stub(res, 'setHeader');
      sinon.stub(translations, 'getEnabledLocales').resolves([{ code: 'en', name: 'English' }]);
      sinon.stub(branding, 'get').resolves(DEFAULT_BRANDING);
      const send = sinon.stub(res, 'send');
      sinon.stub(fs.promises, 'readFile').resolves('LOGIN PAGE GOES HERE. {{ locales.length }}');
      sinon.stub(users, 'getUserDoc').resolves();
      sinon.stub(config, 'translate').returns('TRANSLATED VALUE.');
      sinon.stub(cookie, 'get').returns('en');
      return controller.get(req, res).then(() => {
        chai.expect(send.args[0][0]).to.equal('LOGIN PAGE GOES HERE. 0'); // one locale is dropped
        chai.expect(setHeader.callCount).to.equal(1);
        chai.expect(setHeader.args[0][0]).to.equal('Link');
        chai.expect(setHeader.args[0][1]).to.equal(linkResources);
        chai.expect(ssoLogin.isSsoLoginEnabled.calledOnceWithExactly()).to.be.true;
      });
    });

    it('uses application default locale if accept-language header is undefined', () => {
      req.headers = { 'accept-language': undefined };
      sinon.stub(translations, 'getEnabledLocales').resolves([{ code: 'fr', name: 'French' }]);
      sinon.stub(branding, 'get').resolves(DEFAULT_BRANDING);
      const send = sinon.stub(res, 'send');
      sinon.stub(fs.promises, 'readFile').resolves('LOGIN PAGE GOES HERE. {{ defaultLocale }}');
      sinon.stub(config, 'get').withArgs('locale').returns('de');

      return controller.get(req, res).then(() => {
        chai.expect(send.args[0][0]).to.equal('LOGIN PAGE GOES HERE. de');
        chai.expect(ssoLogin.isSsoLoginEnabled.calledOnceWithExactly()).to.be.true;
      });
    });

    it('uses application default locale if none of the accept-language headers match', () => {
      req.headers = { 'accept-language': 'en' };
      sinon.stub(translations, 'getEnabledLocales').resolves([]);
      sinon.stub(branding, 'get').resolves(DEFAULT_BRANDING);
      const send = sinon.stub(res, 'send');
      sinon.stub(fs.promises, 'readFile').resolves('LOGIN PAGE GOES HERE. {{ defaultLocale }}');
      sinon.stub(config, 'get').withArgs('locale').returns('de');

      return controller.get(req, res).then(() => {
        chai.expect(send.args[0][0]).to.equal('LOGIN PAGE GOES HERE. de');
        chai.expect(ssoLogin.isSsoLoginEnabled.calledOnceWithExactly()).to.be.true;
      });
    });

    it('uses best request header locale available', () => {
      req.locale = 'fr_CA, en';
      sinon.stub(translations, 'getEnabledLocales').resolves([
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'French' },
      ]);
      sinon.stub(branding, 'get').resolves(DEFAULT_BRANDING);
      const send = sinon.stub(res, 'send');
      sinon.stub(fs.promises, 'readFile').resolves('LOGIN PAGE GOES HERE. {{ defaultLocale }}');

      return controller.get(req, res).then(() => {
        chai.expect(send.args[0][0]).to.equal('LOGIN PAGE GOES HERE. fr');
        chai.expect(ssoLogin.isSsoLoginEnabled.calledOnceWithExactly()).to.be.true;
      });
    });
  });

  describe('passwordReset', () => {
    it('getPasswordReset should render password reset page', () => {
      sinon.stub(translations, 'getEnabledLocales').resolves([]);
      const linkResources = '</login/style.css>; rel=preload; as=style, '
        + '</login/auth-utils.js>; rel=preload; as=script, '
        + '</login/password-reset.js>; rel=preload; as=script';
      const brandingGet = sinon.stub(branding, 'get').resolves(DEFAULT_BRANDING);
      const send = sinon.stub(res, 'send');
      const setHeader = sinon.stub(res, 'setHeader');
      sinon.stub(fs.promises, 'readFile').resolves('PASSWORD RESET PAGE GOES HERE. {{ translations }}');
      sinon.stub(config, 'getTranslations').returns({ en: { password: 'Password' } });
      return controller.getPasswordReset(req, res).then(() => {
        chai.expect(brandingGet.callCount).to.equal(1);
        chai.expect(send.callCount).to.equal(1);
        chai.expect(send.args[0][0])
          .to.equal('PASSWORD RESET PAGE GOES HERE. %7B%22en%22%3A%7B%22password%22%3A%22Password%22%7D%7D');
        chai.expect(setHeader.callCount).to.equal(1);
        chai.expect(setHeader.args[0][0]).to.equal('Link');
        chai.expect(setHeader.args[0][1]).to.equal(linkResources);
        chai.expect(fs.promises.readFile.callCount).to.equal(1);
        chai.expect(translations.getEnabledLocales.callCount).to.equal(1);
      });
    });

    it('should return 429 when rate limited', () => {
      rateLimit.isLimited.returns(true);
      return controller.resetPassword(req, res).then(() => {
        chai.expect(rateLimit.isLimited.callCount).to.equal(1);
        chai.expect(rateLimit.isLimited.args[0][0]).to.equal(req);
        chai.expect(serverUtils.rateLimited.callCount).to.equal(1);
      });
    });

    it('should return 400 if new password is invalid', () => {
      req.body = {
        username: 'user1',
        currentPassword: 'current',
        password: 'weak',
        locale: 'en'
      };

      const status = sinon.stub(res, 'status').returns(res);
      const json = sinon.stub(res, 'json').returns(res);

      return controller.resetPassword(req, res).then(() => {
        chai.expect(status.callCount).to.equal(1);
        chai.expect(status.args[0][0]).to.equal(400);
        chai.expect(json.callCount).to.equal(1);
        chai.expect(json.args[0][0]).to.deep.equal({
          error: 'password-short',
          params: { minimum: 8 }
        });
      });
    });

    it('should reset password when it is valid', () => {
      req.body = {
        username: 'sharon',
        currentPassword: 'oldPass',
        password: 'newPass123',
        locale: 'en'
      };

      const postResponse = {
        status: 200,
        headers: { getSetCookie: () => [ 'AuthSession=abc;' ] }
      };
      const post = sinon.stub(request, 'post').resolves(postResponse);
      const send = sinon.stub(res, 'send');
      const status = sinon.stub(res, 'status').returns(res);
      const cookie = sinon.stub(res, 'cookie').returns(res);

      const userCtx = { name: 'sharon', roles: [ 'project-stuff' ] };
      const getUserCtx = sinon.stub(auth, 'getUserCtx').resolves(userCtx);

      const userDoc = {
        name: 'sharon',
        type: 'user',
        password: 'oldPass'
      };
      sinon.stub(users, 'getUserDoc').resolves(userDoc);
      sinon.stub(users, 'updateUser').resolves({
        user: { id: 'org.couchdb.user:sharon' },
        'user-settings': { id: 'org.couchdb.user:sharon' }
      });
      sinon.stub(request, 'get').resolves({
        status: 200,
        body: { userCtx: { name: 'sharon' } }
      });

      return controller.resetPassword(req, res).then(() => {
        chai.expect(status.callCount).to.equal(1);
        chai.expect(status.args[0][0]).to.equal(302);
        chai.expect(send.args[0][0]).to.equal('/');
        chai.expect(post.callCount).to.equal(1);
        chai.expect(post.args[0][0].url).to.equal('http://test.com:1234/_session');
        chai.expect(post.args[0][0].body.name).to.equal('sharon');
        chai.expect(post.args[0][0].body.password).to.equal('newPass123');
        chai.expect(getUserCtx.callCount).to.equal(1);
        chai.expect(getUserCtx.args[0][0].headers.Cookie).to.equal('AuthSession=abc;');
        chai.expect(cookie.callCount).to.equal(3);
        chai.expect(cookie.args[0][0]).to.equal('AuthSession');
        chai.expect(cookie.args[0][1]).to.equal('abc');
        chai.expect(cookie.args[1][0]).to.equal('userCtx');
        chai.expect(cookie.args[1][1]).to.equal(JSON.stringify(userCtx));
        chai.expect(cookie.args[2][0]).to.equal('locale');
        chai.expect(cookie.args[2][1]).to.equal('en');
        chai.expect(users.updateUser.callCount).to.equal(1);
        chai.expect(users.updateUser.args[0]).to.deep.equal([
          'sharon',
          {
            password: 'newPass123',
            password_change_required: false
          },
          true
        ]);
      });
    });

    it('should return 400 if is SSO User', async () => {
      req.body = {
        username: 'sharon',
        currentPassword: 'oldPass',
        password: 'newPass123',
        locale: 'en'
      };
      const status = sinon.stub(res, 'status').returns(res);
      const userDoc = {
        name: 'sharon',
        type: 'user',
        password: 'oldPass',
        oidc_username: 'oidc-username',
      };
      sinon.stub(users, 'getUserDoc').resolves(userDoc);
      sinon.stub(request, 'get').resolves({
        status: 200,
        body: { userCtx: { name: 'sharon' } }
      });
      ssoLogin.isSsoLoginEnabled.resolves(true);
      const json = sinon.stub(res, 'json').returns(res);

      await controller.resetPassword(req, res);

      chai.expect(status.calledOnceWithExactly(400)).to.be.true;
      chai.expect(json.calledOnceWithExactly({
        error: 'Password Reset Not Permitted For SSO Users',
      })).to.be.true;
    });
  });

  describe('get login/token', () => {
    it('should render the token login page', () => {
      sinon.stub(translations, 'getEnabledLocales').resolves([]);
      sinon.stub(branding, 'get').resolves(DEFAULT_BRANDING);
      sinon.stub(res, 'send');
      sinon.stub(fs.promises, 'readFile').resolves('TOKEN PAGE GOES HERE. {{ translations }}');
      sinon.stub(config, 'getTranslations').returns({ en: { login: 'English' } });
      req.params = { token: 'my_token', hash: 'my_hash' };
      return controller.tokenGet(req, res).then(() => {
        chai.expect(branding.get.callCount).to.equal(1);
        chai.expect(res.send.callCount).to.equal(1);
        chai.expect(res.send.args[0][0])
          .to.equal('TOKEN PAGE GOES HERE. %7B%22en%22%3A%7B%22login%22%3A%22English%22%7D%7D');
        chai.expect(fs.promises.readFile.callCount).to.equal(1);
        chai.expect(translations.getEnabledLocales.callCount).to.equal(1);
      });
    });
  });

  describe('POST login/token', () => {
    it('should redirect the user directly if they have a valid session', () => {
      sinon.stub(auth, 'getUserCtx').resolves({ name: 'user' });
      sinon.stub(tokenLogin, 'isTokenLoginEnabled').returns(true);
      sinon.stub(res, 'send').returns(res);
      sinon.stub(res, 'status').returns(res);
      return controller.tokenPost(req, res).then(() => {
        chai.expect(auth.getUserCtx.callCount).to.equal(1);
        chai.expect(auth.getUserCtx.args[0]).to.deep.equal([req]);
        chai.expect(tokenLogin.isTokenLoginEnabled.callCount).to.equal(0);
      });
    });

    it('should reject token login for SSO users', () => {
      sinon.stub(auth, 'getUserCtx').rejects({ code: 401});
      sinon.stub(tokenLogin, 'isTokenLoginEnabled').returns(true);
      sinon.stub(tokenLogin, 'getUserByToken').rejects({
        status: 401,
        message: 'Token login not allowed for SSO users'
      });
      sinon.stub(users, 'getUserDoc').resolves({ _id: 'sso-user-id', oidc_username: 'some-provider'});
      sinon.stub(res, 'status').returns(res);
      sinon.stub(res, 'json').returns(res);
      sinon.spy(tokenLogin, 'resetPassword');
      req.params = { token: 'any-token' };
      return controller.tokenPost(req, res).then(() => {
        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0][0]).to.equal(401);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0][0]).to.deep.equal({
          error: 'Token login not allowed for SSO users'
        });
        chai.expect(tokenLogin.resetPassword.callCount).to.equal(0);
      });
    });

    it('should fail early when token login not enabled', () => {
      sinon.stub(auth, 'getUserCtx').rejects({ code: 401 });
      sinon.stub(tokenLogin, 'isTokenLoginEnabled').returns(false);
      sinon.stub(res, 'json').returns(res);
      sinon.stub(res, 'status').returns(res);
      return controller.tokenPost(req, res).then(() => {
        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0]).to.deep.equal([400]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([{ error: 'disabled', reason: 'Token login disabled' }]);
      });
    });

    it('should fail early with no params', () => {
      sinon.stub(auth, 'getUserCtx').rejects({ code: 401 });
      sinon.stub(tokenLogin, 'isTokenLoginEnabled').returns(true);
      sinon.stub(res, 'json').returns(res);
      sinon.stub(res, 'status').returns(res);
      req.params = {};
      return controller.tokenPost(req, res).then(() => {
        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0]).to.deep.equal([400]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([{ error: 'missing', reason: 'Missing required param' }]);
      });
    });

    it('should send 401 when token incorrect', () => {
      sinon.stub(auth, 'getUserCtx').rejects({ code: 401 });
      sinon.stub(tokenLogin, 'isTokenLoginEnabled').returns(true);
      sinon.stub(tokenLogin, 'getUserByToken').resolves(false);
      sinon.stub(res, 'json').returns(res);
      sinon.stub(res, 'status').returns(res);
      req.params = { token: 'my_token' };
      return controller.tokenPost(req, res).then(() => {
        chai.expect(tokenLogin.getUserByToken.callCount).to.equal(1);
        chai.expect(tokenLogin.getUserByToken.args[0]).to.deep.equal( [ 'my_token' ]);
        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0]).to.deep.equal([401]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([{ error: 'invalid' }]);
      });
    });

    it('should send 429 when rate limited', () => {
      rateLimit.isLimited.returns(true);
      sinon.stub(auth, 'getUserCtx');
      return controller.tokenPost(req, res).then(() => {
        chai.expect(rateLimit.isLimited.callCount).to.equal(1);
        chai.expect(rateLimit.isLimited.args[0][0]).to.equal(req);
        chai.expect(serverUtils.rateLimited.callCount).to.equal(1);
        chai.expect(auth.getUserCtx.callCount).to.equal(0);
      });
    });

    it('should send error when error thrown while validating token', () => {
      sinon.stub(auth, 'getUserCtx').rejects({ code: 401 });
      sinon.stub(tokenLogin, 'isTokenLoginEnabled').returns(true);
      sinon.stub(tokenLogin, 'getUserByToken').rejects({ some: 'err' });
      sinon.stub(res, 'json').returns(res);
      sinon.stub(res, 'status').returns(res);
      req.params = { token: 'a' };
      return controller.tokenPost(req, res).then(() => {
        chai.expect(tokenLogin.getUserByToken.callCount).to.equal(1);
        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0]).to.deep.equal([400]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([{ error: 'Unexpected error logging in' }]);
      });
    });

    it('should login the user when token is valid', () => {
      sinon.stub(tokenLogin, 'isTokenLoginEnabled').returns(true);
      sinon.stub(tokenLogin, 'getUserByToken').resolves('userId');
      sinon.stub(tokenLogin, 'resetPassword').resolves({ user: 'user_name', password: 'secret' });
      sinon.stub(tokenLogin, 'deactivateTokenLogin').resolves();
      sinon.stub(request, 'post')
        .resolves({ status: 200, headers: new Headers({ 'set-cookie': [ 'AuthSession=abc;' ] }) });
      sinon.stub(res, 'status').returns(res);
      sinon.stub(res, 'send').returns(res);
      sinon.stub(res, 'cookie');
      sinon.stub(auth, 'getUserSettings').resolves({});
      sinon.stub(users, 'getUserDoc').resolves();
      const userCtx = { name: 'user_name', roles: [ 'project-stuff' ] };
      sinon.stub(auth, 'getUserCtx')
        .onCall(0).rejects({ code: 401 })
        .onCall(1).resolves(userCtx);
      req.params = { token: 'a', userId: 'b' };
      req.body = { locale: 'es' };
      return controller.tokenPost(req, res).then(() => {
        chai.expect(auth.getUserCtx.callCount).to.equal(2);
        chai.expect(auth.getUserCtx.args[0]).to.deep.equal([req]);
        chai.expect(auth.getUserCtx.args[1]).to.deep.equal([{ headers: { 'Cookie': 'AuthSession=abc;' } }]);
        chai.expect(tokenLogin.getUserByToken.callCount).to.equal(1);
        chai.expect(tokenLogin.resetPassword.callCount).to.equal(1);
        chai.expect(tokenLogin.resetPassword.args[0]).to.deep.equal(['userId']);
        chai.expect(tokenLogin.deactivateTokenLogin.callCount).to.equal(1);
        chai.expect(tokenLogin.deactivateTokenLogin.args[0]).to.deep.equal(['userId']);
        chai.expect(res.cookie.callCount).to.equal(3);
        chai.expect(res.cookie.args[0].slice(0, 2)).to.deep.equal(['AuthSession', 'abc']);
        chai.expect(res.cookie.args[1].slice(0, 2)).to.deep.equal(['userCtx', JSON.stringify(userCtx) ]);
        chai.expect(res.cookie.args[2].slice(0, 2)).to.deep.equal(['locale', 'es']);
        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0]).to.deep.equal([302]);
        chai.expect(res.send.callCount).to.equal(1);
        chai.expect(res.send.args[0]).to.deep.equal(['/']);
      });
    });

    it('should retry logging in when login fails', () => {
      sinon.stub(tokenLogin, 'isTokenLoginEnabled').returns(true);
      sinon.stub(tokenLogin, 'getUserByToken').resolves('userId');
      sinon.stub(tokenLogin, 'resetPassword').resolves({ user: 'user_name', password: 'secret' });
      sinon.stub(tokenLogin, 'deactivateTokenLogin').resolves();
      sinon.stub(request, 'post')
        .onCall(0).resolves({ status: 401 })
        .onCall(1).resolves({ status: 401 })
        .onCall(2).resolves({ status: 401 })
        .onCall(3).resolves({ status: 401 })
        .resolves({ status: 200, headers: new Headers({ 'set-cookie': [ 'AuthSession=cde;' ] }) });

      sinon.stub(res, 'status').returns(res);
      sinon.stub(res, 'cookie');
      sinon.stub(res, 'send');
      sinon.stub(users, 'getUserDoc').resolves();
      sinon.stub(auth, 'getUserSettings').resolves({});
      const userCtx = { name: 'user_name', roles: [ 'roles' ] };
      sinon.stub(auth, 'getUserCtx')
        .onCall(0).rejects({ code: 401 })
        .onCall(1).resolves(userCtx);
      req.params = { token: 'a', userId: 'b' };
      req.body = { locale: 'hi' };
      return controller.tokenPost(req, res).then(() => {
        chai.expect(tokenLogin.getUserByToken.callCount).to.equal(1);
        chai.expect(tokenLogin.resetPassword.callCount).to.equal(1);
        chai.expect(tokenLogin.resetPassword.args[0]).to.deep.equal(['userId']);
        chai.expect(tokenLogin.deactivateTokenLogin.callCount).to.equal(1);
        chai.expect(tokenLogin.deactivateTokenLogin.args[0]).to.deep.equal(['userId']);
        chai.expect(request.post.callCount).to.equal(5);
        chai.expect(res.cookie.callCount).to.equal(3);
        chai.expect(res.cookie.args[0].slice(0, 2)).to.deep.equal(['AuthSession', 'cde']);
        chai.expect(res.cookie.args[1].slice(0, 2)).to.deep.equal(['userCtx', JSON.stringify(userCtx) ]);
        chai.expect(res.cookie.args[2].slice(0, 2)).to.deep.equal(['locale', 'hi']);
        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0]).to.deep.equal([302]);
        chai.expect(res.send.callCount).to.equal(1);
        chai.expect(res.send.args[0]).to.deep.equal(['/']);
      });
    });

    it('should abandon logging in after retrying 11 times', () => {
      sinon.stub(auth, 'getUserCtx').rejects({ code: 401 });
      sinon.stub(tokenLogin, 'isTokenLoginEnabled').returns(true);
      sinon.stub(tokenLogin, 'getUserByToken').resolves('userId');
      sinon.stub(users, 'getUserDoc').resolves();
      sinon.stub(tokenLogin, 'resetPassword').resolves({ user: 'user_name', password: 'secret' });
      sinon.stub(tokenLogin, 'deactivateTokenLogin');
      sinon.stub(res, 'status').returns(res);
      sinon.stub(res, 'json');
      sinon.stub(request, 'post').resolves({ statusCode: 401 });
      req.params = { token: 'a', userId: 'b' };
      return controller.tokenPost(req, res).then(() => {
        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0]).to.deep.equal([408]);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0]).to.deep.equal([{ error: 'Login failed after 10 retries' }]);
        chai.expect(tokenLogin.getUserByToken.callCount).to.equal(1);
        chai.expect(tokenLogin.resetPassword.callCount).to.equal(1);
        chai.expect(tokenLogin.resetPassword.args[0]).to.deep.equal(['userId']);
        chai.expect(tokenLogin.deactivateTokenLogin.callCount).to.equal(0);
        chai.expect(request.post.callCount).to.equal(11);
      });
    });
  });

  describe('post', () => {

    it('returns errors from session create', () => {
      req.body = { user: 'sharon', password: 'p4ss' };
      const post = sinon.stub(request, 'post').rejects('boom');
      const status = sinon.stub(res, 'status').returns(res);
      const json = sinon.stub(res, 'json').returns(res);
      const getUserDoc = sinon.stub(users, 'getUserDoc').resolves({});
      return controller.post(req, res).then(() => {
        chai.expect(getUserDoc.callCount).to.equal(0);
        chai.expect(post.callCount).to.equal(1);
        chai.expect(status.callCount).to.equal(1);
        chai.expect(status.args[0][0]).to.equal(500);
        chai.expect(json.callCount).to.equal(1);
        chai.expect(json.args[0][0]).to.deep.equal({ error: 'Unexpected error logging in' });
      });
    });

    it('returns invalid credentials', () => {
      sinon.stub(users, 'getUserDoc').resolves();
      req.body = { user: 'sharon', password: 'p4ss' };
      const post = sinon.stub(request, 'post').rejects({
        status: 401,
        error: 'Not logged in'
      });
      const status = sinon.stub(res, 'status').returns(res);
      const json = sinon.stub(res, 'json').returns(res);
      return controller.post(req, res).then(() => {
        chai.expect(request.post.callCount).to.equal(1);
        chai.expect(post.callCount).to.equal(1);
        chai.expect(status.callCount).to.equal(1);
        chai.expect(status.args[0][0]).to.equal(401);
        chai.expect(json.callCount).to.equal(1);
        chai.expect(json.args[0][0]).to.deep.equal({ error: 'Not logged in' });
      });
    });

    it('returns 429 when rate limited', () => {
      const post = sinon.stub(request, 'post');
      rateLimit.isLimited.returns(true);
      return controller.post(req, res).then(() => {
        chai.expect(rateLimit.isLimited.callCount).to.equal(1);
        chai.expect(rateLimit.isLimited.args[0][0]).to.equal(req);
        chai.expect(serverUtils.rateLimited.callCount).to.equal(1);
        chai.expect(post.callCount).to.equal(0);
      });
    });

    it('should retry getting userCtx 10 times', async () => {
      req.body = { user: 'sharon', password: 'p4ss', locale: 'fr' };
      const postResponse = {
        status: 200,
        headers: new Headers({ 'set-cookie': [ 'AuthSession=abc;' ] }),
      };
      sinon.stub(request, 'post').resolves(postResponse);
      sinon.stub(res, 'status').returns(res);
      sinon.stub(res, 'send').returns(res);
      sinon.stub(res, 'cookie');
      sinon.stub(users, 'getUserDoc').resolves({});
      sinon.stub(auth, 'getUserCtx').rejects({ code: 401 });
      auth.getUserCtx.onCall(9).resolves({ name: 'shazza', roles: [ 'project-stuff' ] });

      await controller.post(req, res);

      chai.expect(request.post.callCount).to.equal(1);
      chai.expect(request.post.args[0][0].url).to.equal('http://test.com:1234/_session');
      chai.expect(request.post.args[0][0].body.name).to.equal('sharon');
      chai.expect(request.post.args[0][0].body.password).to.equal('p4ss');
      chai.expect(request.post.args[0][0].auth.username).to.equal('sharon');
      chai.expect(request.post.args[0][0].auth.password).to.equal('p4ss');
      chai.expect(auth.getUserCtx.callCount).to.equal(10);
      chai.expect(auth.getUserCtx.args[0][0].headers.Cookie).to.equal('AuthSession=abc;');
      chai.expect(res.status.callCount).to.equal(1);
      chai.expect(res.status.args).to.deep.equal([[302]]);
      chai.expect(res.send.args).to.deep.equal([['/']]);
      chai.expect(res.cookie.callCount).to.equal(3);
      chai.expect(res.cookie.args[0][0]).to.equal('AuthSession');
      chai.expect(res.cookie.args[0][1]).to.equal('abc');
      chai.expect(res.cookie.args[0][2]).to.deep.equal({ sameSite: 'lax', secure: false, httpOnly: true });
      chai.expect(res.cookie.args[1][0]).to.equal('userCtx');
      chai.expect(res.cookie.args[1][1]).to.equal(JSON.stringify({ name: 'shazza', roles: [ 'project-stuff' ] }));
      chai.expect(res.cookie.args[1][2]).to.deep.equal(DEFAULT_COOKIE_OPTIONS);
      chai.expect(res.cookie.args[2][0]).to.equal('locale');
      chai.expect(res.cookie.args[2][1]).to.equal('fr');
      chai.expect(res.cookie.args[2][2]).to.deep.equal(DEFAULT_COOKIE_OPTIONS);
    });

    it('returns errors from auth after 10 retries', () => {
      req.body = { user: 'sharon', password: 'p4ss' };
      const postResponse = {
        status: 200,
        headers: new Headers({ 'set-cookie': [ 'AuthSession=abc;' ] })
      };
      const post = sinon.stub(request, 'post').resolves(postResponse);
      const status = sinon.stub(res, 'status').returns(res);
      const json = sinon.stub(res, 'json').returns(res);
      const getUserCtx = sinon.stub(auth, 'getUserCtx').rejects({ code: 401 });
      return controller.post(req, res).then(() => {
        chai.expect(post.callCount).to.equal(1);
        chai.expect(getUserCtx.callCount).to.equal(11);
        chai.expect(status.callCount).to.equal(1);
        chai.expect(status.args[0][0]).to.equal(401);
        chai.expect(json.callCount).to.equal(1);
        chai.expect(json.args[0][0]).to.deep.equal({ error: 'Error getting authCtx' });
      });
    });

    it('returns errors immediately from auth if code is not 401', () => {
      req.body = { user: 'sharon', password: 'p4ss' };
      const postResponse = {
        status: 200,
        headers: new Headers({ 'set-cookie': [ 'AuthSession=abc;' ] })
      };
      const post = sinon.stub(request, 'post').resolves(postResponse);
      const status = sinon.stub(res, 'status').returns(res);
      const json = sinon.stub(res, 'json').returns(res);
      const getUserCtx = sinon.stub(auth, 'getUserCtx').rejects('boom');
      return controller.post(req, res).then(() => {
        chai.expect(post.callCount).to.equal(1);
        chai.expect(getUserCtx.callCount).to.equal(1);
        chai.expect(status.callCount).to.equal(1);
        chai.expect(status.args[0][0]).to.equal(401);
        chai.expect(json.callCount).to.equal(1);
        chai.expect(json.args[0][0]).to.deep.equal({ error: 'Error getting authCtx' });
      });
    });

    it('logs in successfully', () => {
      req.body = { user: 'sharon', password: 'p4ss', locale: 'es' };
      const postResponse = {
        status: 200,
        headers: new Headers({ 'set-cookie': [ 'AuthSession=abc;' ] })
      };
      const post = sinon.stub(request, 'post').resolves(postResponse);
      const send = sinon.stub(res, 'send');
      const status = sinon.stub(res, 'status').returns(res);
      const cookie = sinon.stub(res, 'cookie').returns(res);
      const clearCookie = sinon.stub(res, 'clearCookie').returns(res);
      const userCtx = { name: 'shazza', roles: [ 'project-stuff' ] };
      const getUserCtx = sinon.stub(auth, 'getUserCtx').resolves(userCtx);
      sinon.stub(auth, 'getUserSettings').resolves({});
      sinon.stub(users, 'getUserDoc').resolves({
        name: 'sharon',
        type: 'user',
        password_change_required: false
      });
      return controller.post(req, res).then(() => {
        chai.expect(post.callCount).to.equal(1);
        chai.expect(post.args[0][0].url).to.equal('http://test.com:1234/_session');
        chai.expect(post.args[0][0].body.name).to.equal('sharon');
        chai.expect(post.args[0][0].body.password).to.equal('p4ss');
        chai.expect(post.args[0][0].auth.username).to.equal('sharon');
        chai.expect(post.args[0][0].auth.password).to.equal('p4ss');
        chai.expect(getUserCtx.callCount).to.equal(1);
        chai.expect(getUserCtx.args[0][0].headers.Cookie).to.equal('AuthSession=abc;');
        chai.expect(status.callCount).to.equal(1);
        chai.expect(status.args[0][0]).to.equal(302);
        chai.expect(send.args[0][0]).to.deep.equal('/');
        chai.expect(cookie.callCount).to.equal(3);
        chai.expect(cookie.args[0][0]).to.equal('AuthSession');
        chai.expect(cookie.args[0][1]).to.equal('abc');
        chai.expect(cookie.args[0][2]).to.deep.equal({ sameSite: 'lax', secure: false, httpOnly: true });
        chai.expect(cookie.args[1][0]).to.equal('userCtx');
        chai.expect(cookie.args[1][1]).to.equal(JSON.stringify(userCtx));
        chai.expect(cookie.args[1][2]).to.deep.equal(DEFAULT_COOKIE_OPTIONS);
        chai.expect(cookie.args[2][0]).to.equal('locale');
        chai.expect(cookie.args[2][1]).to.equal('es');
        chai.expect(cookie.args[2][2]).to.deep.equal(DEFAULT_COOKIE_OPTIONS);
        chai.expect(clearCookie.callCount).to.equal(1);
        chai.expect(clearCookie.args[0][0]).to.equal('login');
      });
    });

    it('logs in successfully and redirects to password-reset for new users', () => {
      req.body = { user: 'sharon', password: 'p4ss', locale: 'es' };
      const postResponse = {
        status: 200,
        headers: { getSetCookie: () => [ 'AuthSession=abc;' ] }
      };
      const post = sinon.stub(request, 'post').resolves(postResponse);
      const send = sinon.stub(res, 'send');
      const status = sinon.stub(res, 'status').returns(res);
      const cookie = sinon.stub(res, 'cookie').returns(res);
      const userCtx = { name: 'shazza', roles: [ 'project-stuff' ] };
      const getUserCtx = sinon.stub(auth, 'getUserCtx').resolves(userCtx);
      sinon.stub(users, 'getUserDoc').resolves({
        name: 'sharon',
        type: 'user',
        password_change_required: true
      });
      sinon.stub(auth, 'getUserSettings').resolves({});
      return controller.post(req, res).then(() => {
        chai.expect(post.callCount).to.equal(1);
        chai.expect(post.args[0][0].url).to.equal('http://test.com:1234/_session');
        chai.expect(post.args[0][0].body.name).to.equal('sharon');
        chai.expect(post.args[0][0].body.password).to.equal('p4ss');
        chai.expect(getUserCtx.callCount).to.equal(1);
        chai.expect(getUserCtx.args[0][0].headers.Cookie).to.equal('AuthSession=abc;');
        chai.expect(status.callCount).to.equal(1);
        chai.expect(status.args[0][0]).to.equal(302);
        chai.expect(send.args[0][0]).to.deep.equal('/medic/password-reset');
        chai.expect(cookie.callCount).to.equal(2);
        chai.expect(cookie.args[0][0]).to.equal('userCtx');
        chai.expect(cookie.args[0][1]).to.equal(JSON.stringify(userCtx));
        chai.expect(cookie.args[0][2]).to.deep.equal(DEFAULT_COOKIE_OPTIONS);
        chai.expect(cookie.args[1][0]).to.equal('locale');
        chai.expect(cookie.args[1][1]).to.equal('es');
        chai.expect(cookie.args[1][2]).to.deep.equal(DEFAULT_COOKIE_OPTIONS);
      });
    });

    it('sets user settings and cookie to default when no locale selected', () => {
      req.body = { user: 'sharon', password: 'p4ss' };
      const postResponse = {
        status: 200,
        headers: new Headers({ 'set-cookie': [ 'AuthSession=abc;' ] }),
      };
      sinon.stub(request, 'post').resolves(postResponse);
      sinon.stub(res, 'send');
      sinon.stub(res, 'status').returns(res);
      const cookie = sinon.stub(res, 'cookie').returns(res);
      sinon.stub(users, 'getUserDoc').resolves({});
      sinon.stub(auth, 'getUserCtx').resolves({ name: 'shazza', roles: [ 'project-stuff' ] });
      sinon.stub(auth, 'hasAllPermissions').returns(false);
      sinon.stub(auth, 'getUserSettings').resolves({ });
      sinon.stub(config, 'get').returns('fr');
      const update = sinon.stub(users, 'updateUser');
      return controller.post(req, res).then(() => {
        chai.expect(cookie.callCount).to.equal(3);
        chai.expect(cookie.args[0][0]).to.equal('AuthSession');
        chai.expect(cookie.args[1][0]).to.equal('userCtx');
        chai.expect(cookie.args[2][0]).to.equal('locale');
        chai.expect(cookie.args[2][1]).to.equal('fr');
        chai.expect(update.callCount).to.equal(0);
      });
    });

    it('does not set locale when not changed', () => {
      req.body = { user: 'sharon', password: 'p4ss' };
      const postResponse = {
        status: 200,
        headers: new Headers({ 'set-cookie': [ 'AuthSession=abc;' ] })
      };
      sinon.stub(request, 'post').resolves(postResponse);
      sinon.stub(res, 'send');
      sinon.stub(res, 'status').returns(res);
      const cookie = sinon.stub(res, 'cookie').returns(res);
      sinon.stub(users, 'getUserDoc').resolves({});
      sinon.stub(auth, 'getUserCtx').resolves({ name: 'shazza', roles: [ 'project-stuff' ] });
      sinon.stub(auth, 'hasAllPermissions').returns(false);
      sinon.stub(auth, 'getUserSettings').resolves({ language: 'fr' });
      sinon.stub(config, 'get').returns('fr');
      const update = sinon.stub(users, 'updateUser').resolves();
      return controller.post(req, res).then(() => {
        chai.expect(cookie.callCount).to.equal(3);
        chai.expect(cookie.args[0][0]).to.equal('AuthSession');
        chai.expect(cookie.args[1][0]).to.equal('userCtx');
        chai.expect(cookie.args[2][0]).to.equal('locale');
        chai.expect(cookie.args[2][1]).to.equal('fr');
        chai.expect(update.callCount).to.equal(0);
      });
    });

    // probably an invalid config but we should handle it gracefully
    it('redirect offline admin user to webapp after successful login - #5785', () => {
      req.body = { user: 'sharon', password: 'p4ss' };
      const postResponse = {
        status: 200,
        headers: new Headers({ 'set-cookie': [ 'AuthSession=abc;' ] })
      };
      const post = sinon.stub(request, 'post').resolves(postResponse);
      const send = sinon.stub(res, 'send');
      const status = sinon.stub(res, 'status').returns(res);
      const userCtx = { name: 'shazza', roles: [ 'project-stuff' ] };
      const getUserCtx = sinon.stub(auth, 'getUserCtx').resolves(userCtx);
      const hasAllPermissions = sinon.stub(auth, 'hasAllPermissions').returns(true);
      sinon.stub(users, 'getUserDoc').resolves({});
      sinon.stub(auth, 'getUserSettings').resolves({ language: 'es' });
      return controller.post(req, res).then(() => {
        chai.expect(post.callCount).to.equal(1);
        chai.expect(getUserCtx.callCount).to.equal(1);
        chai.expect(getUserCtx.args[0][0].headers.Cookie).to.equal('AuthSession=abc;');
        chai.expect(hasAllPermissions.callCount).to.equal(0);
        chai.expect(status.callCount).to.equal(1);
        chai.expect(status.args[0][0]).to.equal(302);
        chai.expect(send.args[0][0]).to.equal('/');
      });
    });

    it('redirect admin users to admin app after successful login', () => {
      req.body = { user: 'sharon', password: 'p4ss' };
      const postResponse = {
        status: 200,
        headers: new Headers({ 'set-cookie': [ 'AuthSession=abc;' ] })
      };
      const post = sinon.stub(request, 'post').resolves(postResponse);
      const send = sinon.stub(res, 'send');
      const status = sinon.stub(res, 'status').returns(res);
      const userCtx = { name: 'shazza', roles: [ 'project-stuff' ] };
      const cookie = sinon.stub(res, 'cookie').returns(res);
      const getUserCtx = sinon.stub(auth, 'getUserCtx').resolves(userCtx);
      roles.isOnlineOnly.returns(true);
      sinon.stub(auth, 'hasAllPermissions').returns(true);
      sinon.stub(users, 'getUserDoc').resolves({});
      sinon.stub(auth, 'getUserSettings').resolves({ language: 'es' });
      return controller.post(req, res).then(() => {
        chai.expect(post.callCount).to.equal(1);
        chai.expect(getUserCtx.callCount).to.equal(1);
        chai.expect(getUserCtx.args[0][0].headers.Cookie).to.equal('AuthSession=abc;');
        chai.expect(status.callCount).to.equal(1);
        chai.expect(status.args[0][0]).to.equal(302);
        chai.expect(send.args[0][0]).to.equal('/admin/');
        chai.expect(cookie.callCount).to.equal(3);
        chai.expect(cookie.args[1][0]).to.equal('userCtx');
        chai.expect(cookie.args[1][1]).to.equal(JSON.stringify({
          name: 'shazza',
          roles: [ 'project-stuff' ],
          home: '/admin/'
        }));
      });
    });

    it('should not return a 401 when an admin without user-settings logs in', () => {
      req.body = { user: 'shazza', password: 'p4ss' };
      const postResponse = {
        status: 200,
        headers: new Headers({ 'set-cookie': [ 'AuthSession=abc;' ] })
      };
      sinon.stub(request, 'post').resolves(postResponse);
      sinon.stub(res, 'send');
      sinon.stub(res, 'status').returns(res);
      sinon.stub(users, 'createAdmin').resolves();
      const userCtx = { name: 'shazza', roles: [ '_admin' ] };
      sinon.stub(users, 'getUserDoc').resolves({});
      sinon.stub(auth, 'getUserCtx').resolves(userCtx);
      roles.isOnlineOnly.returns(true);
      sinon.stub(roles, 'isDbAdmin').returns(true);
      sinon.stub(auth, 'hasAllPermissions').returns(true);
      sinon.stub(auth, 'getUserSettings');
      return controller.post(req, res).then(() => {
        chai.expect(request.post.callCount).to.equal(1);
        chai.expect(auth.getUserCtx.callCount).to.equal(1);
        chai.expect(auth.getUserCtx.args[0][0].headers.Cookie).to.equal('AuthSession=abc;');
        chai.expect(roles.isDbAdmin.callCount).to.equal(1);
        chai.expect(roles.isDbAdmin.args[0]).to.deep.equal([userCtx]);
        chai.expect(users.createAdmin.callCount).to.equal(1);
        chai.expect(users.createAdmin.args[0]).to.deep.equal([userCtx]);
        chai.expect(auth.getUserSettings.callCount).to.equal(0);
        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0][0]).to.equal(302);
        chai.expect(res.send.args[0][0]).to.equal('/admin/');
      });
    });

    it('returns 401 when SSO user attempts password login and SSO is enabled', () => {
      req.body = { user: 'shazza', password: 'p4ss' };
      const postResponse = {
        status: 200,
        headers: new Headers({ 'set-cookie': [ 'AuthSession=abc;' ] })
      };
      sinon.stub(request, 'post').resolves(postResponse);
      sinon.stub(res, 'send');
      sinon.stub(res, 'status').returns(res);
      sinon.stub(res, 'json').returns(res);
      sinon.stub(users, 'createAdmin').resolves();
      const userCtx = { name: 'shazza', roles: [ '_admin' ] };
      sinon.stub(users, 'getUserDoc').resolves({ oidc_username: 'true' });
      sinon.stub(auth, 'getUserCtx').resolves(userCtx);
      roles.isOnlineOnly.returns(true);
      sinon.stub(roles, 'isDbAdmin').returns(false);
      sinon.stub(auth, 'hasAllPermissions').returns(true);
      sinon.stub(auth, 'getUserSettings');
      ssoLogin.isSsoLoginEnabled.returns(true);
      return controller.post(req, res).then(() => {
        chai.expect(request.post.callCount).to.equal(1);
        chai.expect(auth.getUserCtx.callCount).to.equal(1);
        chai.expect(auth.getUserCtx.args[0][0].headers.Cookie).to.equal('AuthSession=abc;');
        chai.expect(roles.isDbAdmin.callCount).to.equal(1);
        chai.expect(roles.isDbAdmin.args[0]).to.deep.equal([userCtx]);
        chai.expect(users.createAdmin.notCalled).to.be.true;
        chai.expect(auth.getUserSettings.callCount).to.equal(0);
        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0][0]).to.equal(401);
        chai.expect(res.json.callCount).to.equal(1);
        chai.expect(res.json.args[0][0]).to.deep.equal({ error: 'Password Login Not Permitted For SSO Users' });
      });
    });
  });

  describe('getIdentity', () => {

    it('refreshes user cookie on valid identity call', () => {
      res.type = sinon.stub();
      const userCtx = { name: 'alpha', roles: [ 'omega' ] };
      const getUserCtx = sinon.stub(auth, 'getUserCtx').resolves(userCtx);
      const cookie = sinon.stub(res, 'cookie').returns(res);
      const send = sinon.stub(res, 'send');

      return controller.getIdentity(req, res).then(() => {
        chai.expect(cookie.callCount).to.equal(1);
        chai.expect(cookie.args[0][0]).to.equal('userCtx');
        chai.expect(cookie.args[0][1]).to.equal(JSON.stringify(userCtx));
        chai.expect(cookie.args[0][2]).to.deep.equal(DEFAULT_COOKIE_OPTIONS);
        chai.expect(res.type.args[0][0]).to.equal('application/json');
        chai.expect(getUserCtx.callCount).to.equal(1);
        chai.expect(send.callCount).to.equal(1);
        chai.expect(send.args[0][0]).to.deep.equal({ success: true });
      });
    });

    it('does not set cookie on invalid identity call', () => {
      res.type = sinon.stub();
      res.status = sinon.stub();
      const getUserCtx = sinon.stub(auth, 'getUserCtx').returns(Promise.reject(true));
      const cookie = sinon.stub(res, 'cookie').returns(res);
      const send = sinon.stub(res, 'send');

      return controller.getIdentity(req, res).then(() => {
        chai.expect(cookie.callCount).to.equal(0);
        chai.expect(getUserCtx.callCount).to.equal(1);
        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0][0]).to.equal(401);
        chai.expect(send.callCount).to.equal(1);
      });
    });

  });

  describe('renderLogin', () => {
    it('should get branding and render the login page', () => {
      sinon.stub(translations, 'getEnabledLocales').resolves([]);
      sinon.stub(branding, 'get').resolves({
        name: 'something',
        logo: 'data:zes;base64,xsd'
      });
      sinon.stub(fs.promises, 'readFile')
        .resolves('LOGIN PAGE GOES HERE. {{ translations }} {{ branding.logo }} {{ branding.name }}');
      sinon.stub(config, 'getTranslations').returns({ en: { login: 'English' } });

      return controller.renderLogin(req).then((loginPage) => {
        chai.expect(loginPage).to.equal(
          'LOGIN PAGE GOES HERE. %7B%22en%22%3A%7B%22login%22%3A%22English%22%7D%7D data:zes;base64,xsd something'
        );
        chai.expect(branding.get.callCount).to.equal(1);
        chai.expect(fs.promises.readFile.callCount).to.equal(1);
        chai.expect(translations.getEnabledLocales.callCount).to.equal(1);
        chai.expect(ssoLogin.isSsoLoginEnabled.calledOnceWithExactly()).to.be.true;
      });
    });

    it('should nullcheck the request param', () => {
      sinon.stub(translations, 'getEnabledLocales').resolves([]);
      sinon.stub(branding, 'get').resolves(DEFAULT_BRANDING);
      sinon.stub(fs.promises, 'readFile')
        .resolves('LOGIN PAGE GOES HERE. {{ translations }} {{ branding.logo }} {{ branding.name }}');
      sinon.stub(config, 'getTranslations').returns({ en: { login: 'English' } });

      return controller.renderLogin().then((loginPage) => {
        chai.expect(loginPage).to.equal(
          'LOGIN PAGE GOES HERE. %7B%22en%22%3A%7B%22login%22%3A%22English%22%7D%7D xyz CHT'
        );
        chai.expect(translations.getEnabledLocales.callCount).to.equal(1);
        chai.expect(ssoLogin.isSsoLoginEnabled.calledOnceWithExactly()).to.be.true;
      });
    });
  });

  describe('oidcLogin', async () => {
    beforeEach(() => {
      req.originalUrl = `/${environment.db}/login/oidc/get_token`;
      sinon.stub(sso, 'getIdToken');
      sinon.stub(sso, 'getCookie');
      sinon.stub(auth, 'getUserCtx');
      sinon.stub(users, 'getUserDoc');
      sinon.stub(res, 'cookie');
      sinon.stub(logger, 'error');
      sinon.stub(res, 'redirect');
      sinon.stub(res, 'status').returns(res);
    });

    it('gets id token and redirects to homepage with session cookie', async () => {
      const idToken = { username: 'lil', locale: 'en' };
      sso.getIdToken.resolves(idToken);
      const sessionCookie = 'my-session-cookie';
      sso.getCookie.resolves(`AuthSession=${sessionCookie}`);
      const userContext = { name: 'lil' };
      auth.getUserCtx.resolves(userContext);

      await controller.oidcLogin(req, res);

      chai.expect(rateLimit.isLimited.calledOnceWithExactly(req)).to.be.true;
      chai.expect(serverUtils.rateLimited.notCalled).to.be.true;
      chai.expect(sso.getIdToken.calledOnceWithExactly(
        new URL(`http://xx.app.medicmobile.org/${environment.db}/login/oidc/get_token`)
      )).to.be.true;
      chai.expect(sso.getCookie.calledOnceWithExactly(idToken.username)).to.be.true;
      chai.expect(auth.getUserCtx.calledOnceWithExactly({
        headers: { Cookie: `AuthSession=${sessionCookie}` }
      })).to.be.true;
      chai.expect(res.cookie.args).to.deep.equal([
        ['AuthSession', sessionCookie, { httpOnly: true, sameSite: 'lax', secure: false }],
        ['userCtx', JSON.stringify(userContext), DEFAULT_COOKIE_OPTIONS],
        ['locale', idToken.locale, DEFAULT_COOKIE_OPTIONS]
      ]);
      chai.expect(logger.error.notCalled).to.be.true;
      chai.expect(res.status.calledOnceWithExactly(302)).to.be.true;
      chai.expect(res.redirect.calledOnceWithExactly('/')).to.be.true;
    });

    it('redirects to login page with sso user error when failing to find valid CHT user', async () => {
      const idToken = { username: 'lil', locale: 'en' };
      sso.getIdToken.resolves(idToken);
      const userNotFoundError = new Error('User not found');
      userNotFoundError.status = 401;
      sso.getCookie.rejects(userNotFoundError);

      await controller.oidcLogin(req, res);

      chai.expect(rateLimit.isLimited.calledOnceWithExactly(req)).to.be.true;
      chai.expect(serverUtils.rateLimited.notCalled).to.be.true;
      chai.expect(sso.getIdToken.calledOnceWithExactly(
        new URL(`http://xx.app.medicmobile.org/${environment.db}/login/oidc/get_token`)
      )).to.be.true;
      chai.expect(sso.getCookie.calledOnceWithExactly(idToken.username)).to.be.true;
      chai.expect(auth.getUserCtx.notCalled).to.be.true;
      chai.expect(users.getUserDoc.notCalled).to.be.true;
      chai.expect(res.cookie.notCalled).to.be.true;
      chai.expect(logger.error.calledOnceWithExactly('Error logging in via SSO: %o', userNotFoundError)).to.be.true;
      chai.expect(res.status.calledOnceWithExactly(302)).to.be.true;
      chai.expect(res.redirect.calledOnceWithExactly(`/${environment.db}/login?sso_error=ssouserinvalid`)).to.be.true;
    });

    it('redirects to login page with login error when unexpected error occurs', async () => {
      const invalidTokenError = new Error('Invalid token');
      sso.getIdToken.rejects(invalidTokenError);

      await controller.oidcLogin(req, res);

      chai.expect(rateLimit.isLimited.calledOnceWithExactly(req)).to.be.true;
      chai.expect(serverUtils.rateLimited.notCalled).to.be.true;
      chai.expect(sso.getIdToken.calledOnceWithExactly(
        new URL(`http://xx.app.medicmobile.org/${environment.db}/login/oidc/get_token`)
      )).to.be.true;
      chai.expect(sso.getCookie.notCalled).to.be.true;
      chai.expect(auth.getUserCtx.notCalled).to.be.true;
      chai.expect(users.getUserDoc.notCalled).to.be.true;
      chai.expect(res.cookie.notCalled).to.be.true;
      chai.expect(logger.error.calledOnceWithExactly('Error logging in via SSO: %o', invalidTokenError)).to.be.true;
      chai.expect(res.status.calledOnceWithExactly(302)).to.be.true;
      chai.expect(res.redirect.calledOnceWithExactly(`/${environment.db}/login?sso_error=loginerror`)).to.be.true;
    });

    it('does nothing when rate limited', async () => {
      rateLimit.isLimited.returns(true);

      await controller.oidcLogin(req, res);

      chai.expect(rateLimit.isLimited.calledOnceWithExactly(req)).to.be.true;
      chai.expect(serverUtils.rateLimited.calledOnceWithExactly(req, res)).to.be.true;
      chai.expect(sso.getIdToken.notCalled).to.be.true;
      chai.expect(sso.getCookie.notCalled).to.be.true;
      chai.expect(auth.getUserCtx.notCalled).to.be.true;
      chai.expect(users.getUserDoc.notCalled).to.be.true;
      chai.expect(res.cookie.notCalled).to.be.true;
      chai.expect(logger.error.notCalled).to.be.true;
      chai.expect(res.status.notCalled).to.be.true;
      chai.expect(res.redirect.notCalled).to.be.true;
      chai.expect(logger.error.notCalled).to.be.true;
    });
  });

  describe('oidcAuthorize', async() => {
    beforeEach(() => {
      sinon.stub(sso, 'getAuthorizationUrl');
      sinon.stub(logger, 'error');
      sinon.stub(res, 'send');
      sinon.stub(res, 'status').returns(res);
    });

    it('redirects to oidc provider', async () => {
      const oidcUrl = 'https://oidc.server/';
      sso.getAuthorizationUrl.returns(new URL(oidcUrl));

      await controller.oidcAuthorize(req, res);

      chai.expect(rateLimit.isLimited.calledOnceWithExactly(req)).to.be.true;
      chai.expect(serverUtils.rateLimited.notCalled).to.be.true;
      chai.expect(sso.getAuthorizationUrl.calledWith(`http://xx.app.medicmobile.org/${environment.db}/login/oidc`)).to.be.true;
      chai.expect(res.status.calledOnceWithExactly(302)).to.be.true;
      chai.expect(res.send.calledWith(oidcUrl)).to.be.true;
      chai.expect(logger.error.notCalled).to.be.true;
    });

    it('returns login error when failing to get authorization URL', async () => {
      const e = new Error('Error');
      sso.getAuthorizationUrl.throws(e);
      sinon.stub(serverUtils, 'error');

      await controller.oidcAuthorize(req, res);

      chai.expect(rateLimit.isLimited.calledOnceWithExactly(req)).to.be.true;
      chai.expect(serverUtils.rateLimited.notCalled).to.be.true;
      chai.expect(sso.getAuthorizationUrl.calledWith(`http://xx.app.medicmobile.org/${environment.db}/login/oidc`)).to.be.true;
      chai.expect(res.status.notCalled).to.be.true;
      chai.expect(res.send.notCalled).to.be.true;
      chai.expect(logger.error.calledOnceWithExactly(
        'Error getting authorization redirect url for SSO: %o', e
      )).to.be.true;
      chai.expect(serverUtils.error.calledOnceWithExactly(e, req, res)).to.be.true;
    });

    it('does nothing when rate limited', async () => {
      rateLimit.isLimited.returns(true);

      await controller.oidcAuthorize(req, res);

      chai.expect(rateLimit.isLimited.calledOnceWithExactly(req)).to.be.true;
      chai.expect(serverUtils.rateLimited.calledOnceWithExactly(req, res)).to.be.true;
      chai.expect(sso.getAuthorizationUrl.notCalled).to.be.true;
      chai.expect(res.status.notCalled).to.be.true;
      chai.expect(res.send.notCalled).to.be.true;
      chai.expect(logger.error.notCalled).to.be.true;
    });
  });
});
