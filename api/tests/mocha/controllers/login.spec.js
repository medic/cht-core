const _ = require('lodash');
const controller = require('../../../src/controllers/login');
const chai = require('chai');
const environment = require('../../../src/environment');
const auth = require('../../../src/auth');
const cookie = require('../../../src/services/cookie');
const users = require('../../../src/services/users');
const db = require('../../../src/db').medic;
const sinon = require('sinon');
const config = require('../../../src/config');
const request = require('request-promise-native');
const fs = require('fs');
const DB_NAME = 'lg';
const DDOC_NAME = 'medic';

let req;
let res;
let originalEnvironment;

describe('login controller', () => {

  beforeEach(() => {
    req = {
      query: {},
      body: {},
      hostname: 'xx.app.medicmobile.org',
      headers: {cookie: ''}
    };
    res = {
      redirect: () => {},
      send: () => {},
      status: () => {},
      json: () => {},
      cookie: () => {},
      clearCookie: () => {}
    };
    originalEnvironment = Object.assign(environment);

    environment.db = DB_NAME;
    environment.ddoc = DDOC_NAME;
    environment.protocol = 'http';
    environment.host = 'test.com';
    environment.port = 1234;
    environment.pathname = 'sesh';

    sinon.stub(auth, 'isOnlineOnly').returns(false);
  });

  afterEach(() => {
    environment.db = originalEnvironment.db;
    environment.ddoc = originalEnvironment.ddoc;
    environment.protocol = originalEnvironment.protocol;
    environment.host = originalEnvironment.host;
    environment.port = originalEnvironment.port;
    environment.pathname = originalEnvironment.pathname;

    controller._reset();

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
    ].forEach(({given, expected}) => {
      it(`Bad URL "${given}" should redirect to root`, () => {
        chai.expect(controller._safePath({}, given)).to.equal(expected);
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
        chai.expect(controller._safePath({}, requested)).to.equal(requested);
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
        chai.expect(controller._safePath({}, given)).to.equal(expected);
      });
    });

  });

  describe('get', () => {

    it('send login page', () => {
      const query = sinon.stub(db, 'query').resolves({ rows: [] });
      const getDoc = sinon.stub(db, 'get').resolves({
        _id: 'branding',
        resources: {
          logo: 'xyz'
        },
        _attachments: {
          xyz: {
            content_type: 'zes',
            data: 'xsd'
          }
        }
      });
      const send = sinon.stub(res, 'send');
      const readFile = sinon.stub(fs, 'readFile')
        .callsArgWith(2, null, 'LOGIN PAGE GOES HERE. {{ translations }}');
      sinon.stub(config, 'getTranslationValues').returns({ en: { login: 'English' } });
      return controller.get(req, res).then(() => {
        chai.expect(getDoc.callCount).to.equal(1);
        chai.expect(send.callCount).to.equal(1);
        chai.expect(send.args[0][0])
          .to.equal('LOGIN PAGE GOES HERE. %7B%22en%22%3A%7B%22login%22%3A%22English%22%7D%7D');
        chai.expect(readFile.callCount).to.equal(1);
        chai.expect(query.callCount).to.equal(1);
      });
    });

    it('when branding doc missing send login page', () => {
      const getDoc = sinon.stub(db, 'get').rejects({ error: 'not_found', docId: 'branding'});
      sinon.stub(db, 'query').resolves({ rows: [] });
      const send = sinon.stub(res, 'send');
      sinon.stub(fs, 'readFile').callsArgWith(2, null, 'LOGIN PAGE GOES HERE.');
      sinon.stub(config, 'getTranslationValues').returns({});
      return controller.get(req, res).then(() => {
        chai.expect(getDoc.callCount).to.equal(1);
        chai.expect(send.callCount).to.equal(1);
        chai.expect(send.args[0][0]).to.equal('LOGIN PAGE GOES HERE.');
      });
    });

    it('caches the login page template for performance', () => {
      sinon.stub(res, 'send');
      sinon.stub(db, 'query').resolves({ rows: [] });
      sinon.stub(res, 'cookie').returns(res);
      const readFile = sinon.stub(fs, 'readFile').callsArgWith(2, null, 'file content');
      sinon.stub(config, 'translate').returns('TRANSLATED VALUE.');
      const template = sinon.stub(_, 'template').returns(sinon.stub());
      sinon.stub(db, 'get').resolves({
        _id: 'branding',
        resources: {
          logo: 'xyz'
        },
        _attachments: {
          xyz: {
            content_type: 'zes',
            data: 'xsd'
          }
        }
      });
      return controller.get(req, res) // first request
        .then(() => {
          chai.expect(readFile.callCount).to.equal(1);
          chai.expect(template.callCount).to.equal(1);
        })
        .then(() => controller.get(req, res)) // second request
        .then(() => {
          // should be cached
          chai.expect(readFile.callCount).to.equal(1);
          chai.expect(template.callCount).to.equal(1);
        });
    });

    it('hides locale selector when there is only one option', () => {
      sinon.stub(db, 'query').resolves({ rows: [ { doc: { code: 'en', name: 'English' } } ] });
      sinon.stub(db, 'get').rejects({ error: 'not_found', docId: 'branding'});
      const send = sinon.stub(res, 'send');
      sinon.stub(fs, 'readFile').callsArgWith(2, null, 'LOGIN PAGE GOES HERE. {{ locales.length }}');
      sinon.stub(config, 'translate').returns('TRANSLATED VALUE.');
      sinon.stub(cookie, 'get').returns('en');
      return controller.get(req, res).then(() => {
        chai.expect(send.args[0][0]).to.equal('LOGIN PAGE GOES HERE. 0'); // one locale is dropped
      });
    });

    it('matches the request header locale to the supported locales', () => {
      req.headers = { 'accept-language': 'xx, fr' }; // xx as fake locale
      const send = sinon.stub(res, 'send');
      sinon.stub(fs, 'readFile').callsArgWith(2, null, 'LOGIN PAGE GOES HERE. {{ browserLocale }}');
      sinon.stub(config, 'translate').returns('TRANSLATED VALUE.');

      return controller.get(req, res).then(() => {
        chai.expect(send.args[0][0]).to.equal('LOGIN PAGE GOES HERE. fr');
      });
    });
  });

  describe('post', () => {

    it('returns errors from session create', () => {
      req.body = { user: 'sharon', password: 'p4ss' };
      const post = sinon.stub(request, 'post').rejects('boom');
      const status = sinon.stub(res, 'status').returns(res);
      const json = sinon.stub(res, 'json').returns(res);
      return controller.post(req, res).then(() => {
        chai.expect(post.callCount).to.equal(1);
        chai.expect(status.callCount).to.equal(1);
        chai.expect(status.args[0][0]).to.equal(500);
        chai.expect(json.callCount).to.equal(1);
        chai.expect(json.args[0][0]).to.deep.equal({ error: 'Unexpected error logging in' });
      });
    });

    it('returns invalid credentials', () => {
      req.body = { user: 'sharon', password: 'p4ss' };
      const post = sinon.stub(request, 'post').resolves({ statusCode: 401 });
      const status = sinon.stub(res, 'status').returns(res);
      const json = sinon.stub(res, 'json').returns(res);
      return controller.post(req, res).then(() => {
        chai.expect(post.callCount).to.equal(1);
        chai.expect(status.callCount).to.equal(1);
        chai.expect(status.args[0][0]).to.equal(401);
        chai.expect(json.callCount).to.equal(1);
        chai.expect(json.args[0][0]).to.deep.equal({ error: 'Not logged in' });
      });
    });

    it('returns errors from auth', () => {
      req.body = { user: 'sharon', password: 'p4ss' };
      const postResponse = {
        statusCode: 200,
        headers: { 'set-cookie': [ 'AuthSession=abc;' ] }
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
      req.body = { user: 'sharon', password: 'p4ss' };
      const postResponse = {
        statusCode: 200,
        headers: { 'set-cookie': [ 'AuthSession=abc;' ] }
      };
      const post = sinon.stub(request, 'post').resolves(postResponse);
      const send = sinon.stub(res, 'send');
      const status = sinon.stub(res, 'status').returns(res);
      const cookie = sinon.stub(res, 'cookie').returns(res);
      const clearCookie = sinon.stub(res, 'clearCookie').returns(res);
      const userCtx = { name: 'shazza', roles: [ 'project-stuff' ] };
      const getUserCtx = sinon.stub(auth, 'getUserCtx').resolves(userCtx);
      sinon.stub(auth, 'getUserSettings').resolves({ language: 'es' });
      return controller.post(req, res).then(() => {
        chai.expect(post.callCount).to.equal(1);
        chai.expect(post.args[0][0].url).to.equal('http://test.com:1234/_session');
        chai.expect(post.args[0][0].body.name).to.equal('sharon');
        chai.expect(post.args[0][0].body.password).to.equal('p4ss');
        chai.expect(post.args[0][0].auth.user).to.equal('sharon');
        chai.expect(post.args[0][0].auth.pass).to.equal('p4ss');
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
        chai.expect(cookie.args[1][2]).to.deep.equal({ sameSite: 'lax', secure: false, maxAge: 31536000000 });
        chai.expect(cookie.args[2][0]).to.equal('locale');
        chai.expect(cookie.args[2][1]).to.equal('es');
        chai.expect(cookie.args[2][2]).to.deep.equal({ sameSite: 'lax', secure: false, maxAge: 31536000000 });
        chai.expect(clearCookie.callCount).to.equal(1);
        chai.expect(clearCookie.args[0][0]).to.equal('login');
      });
    });

    it('sets user settings and cookie to default when no locale selected', () => {
      req.body = { user: 'sharon', password: 'p4ss' };
      const postResponse = {
        statusCode: 200,
        headers: { 'set-cookie': [ 'AuthSession=abc;' ] }
      };
      sinon.stub(request, 'post').resolves(postResponse);
      sinon.stub(res, 'send');
      sinon.stub(res, 'status').returns(res);
      const cookie = sinon.stub(res, 'cookie').returns(res);
      sinon.stub(auth, 'getUserCtx').resolves({ name: 'shazza', roles: [ 'project-stuff' ] });
      sinon.stub(auth, 'hasAllPermissions').returns(false);
      sinon.stub(auth, 'getUserSettings').resolves({ });
      sinon.stub(config, 'get').returns('fr');
      const update = sinon.stub(users, 'updateUser').resolves();
      return controller.post(req, res).then(() => {
        chai.expect(cookie.callCount).to.equal(3);
        chai.expect(cookie.args[0][0]).to.equal('AuthSession');
        chai.expect(cookie.args[1][0]).to.equal('userCtx');
        chai.expect(cookie.args[2][0]).to.equal('locale');
        chai.expect(cookie.args[2][1]).to.equal('fr');
        chai.expect(update.callCount).to.equal(1);
        chai.expect(update.args[0][0]).to.equal('sharon');
        chai.expect(update.args[0][1].language).to.equal('fr');
      });
    });

    it('does not set locale when not changed', () => {
      req.body = { user: 'sharon', password: 'p4ss' };
      const postResponse = {
        statusCode: 200,
        headers: { 'set-cookie': [ 'AuthSession=abc;' ] }
      };
      sinon.stub(request, 'post').resolves(postResponse);
      sinon.stub(res, 'send');
      sinon.stub(res, 'status').returns(res);
      const cookie = sinon.stub(res, 'cookie').returns(res);
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
        statusCode: 200,
        headers: { 'set-cookie': [ 'AuthSession=abc;' ] }
      };
      const post = sinon.stub(request, 'post').resolves(postResponse);
      const send = sinon.stub(res, 'send');
      const status = sinon.stub(res, 'status').returns(res);
      const userCtx = { name: 'shazza', roles: [ 'project-stuff' ] };
      const getUserCtx = sinon.stub(auth, 'getUserCtx').resolves(userCtx);
      const hasAllPermissions = sinon.stub(auth, 'hasAllPermissions').returns(true);
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
        statusCode: 200,
        headers: { 'set-cookie': [ 'AuthSession=abc;' ] }
      };
      const post = sinon.stub(request, 'post').resolves(postResponse);
      const send = sinon.stub(res, 'send');
      const status = sinon.stub(res, 'status').returns(res);
      const userCtx = { name: 'shazza', roles: [ 'project-stuff' ] };
      const cookie = sinon.stub(res, 'cookie').returns(res);
      const getUserCtx = sinon.stub(auth, 'getUserCtx').resolves(userCtx);
      auth.isOnlineOnly.returns(true);
      sinon.stub(auth, 'hasAllPermissions').returns(true);
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
        statusCode: 200,
        headers: { 'set-cookie': [ 'AuthSession=abc;' ] }
      };
      sinon.stub(request, 'post').resolves(postResponse);
      sinon.stub(res, 'send');
      sinon.stub(res, 'status').returns(res);
      sinon.stub(users, 'createAdmin').resolves();
      const userCtx = { name: 'shazza', roles: [ '_admin' ] };
      sinon.stub(auth, 'getUserCtx').resolves(userCtx);
      auth.isOnlineOnly.returns(true);
      sinon.stub(auth, 'isDbAdmin').returns(true);
      sinon.stub(auth, 'hasAllPermissions').returns(true);
      sinon.stub(auth, 'getUserSettings')
        .onCall(0).rejects({ status: 404 })
        .onCall(1).resolves({ });
      return controller.post(req, res).then(() => {
        chai.expect(request.post.callCount).to.equal(1);
        chai.expect(auth.getUserCtx.callCount).to.equal(1);
        chai.expect(auth.getUserCtx.args[0][0].headers.Cookie).to.equal('AuthSession=abc;');
        chai.expect(auth.isDbAdmin.callCount).to.equal(1);
        chai.expect(auth.isDbAdmin.args[0]).to.deep.equal([userCtx]);
        chai.expect(users.createAdmin.callCount).to.equal(1);
        chai.expect(users.createAdmin.args[0]).to.deep.equal([userCtx]);
        chai.expect(auth.getUserSettings.callCount).to.equal(2);
        chai.expect(auth.getUserSettings.args).to.deep.equal([[userCtx], [userCtx]]);
        chai.expect(res.status.callCount).to.equal(1);
        chai.expect(res.status.args[0][0]).to.equal(302);
        chai.expect(res.send.args[0][0]).to.equal('/admin/');
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
        chai.expect(cookie.args[0][2]).to.deep.equal({ sameSite: 'lax', secure: false, maxAge: 31536000000 });
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

});
