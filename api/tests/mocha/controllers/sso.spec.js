const rewire = require('rewire');
const chai = require('chai');
const sinon = require('sinon');
const db = require('../../../src/db');
const config = require('../../../src/config');
const dataContext = require('../../../src/services/data-context');
const { users } = require('@medic/user-management')(config, db, dataContext);
const template = require('../../../src/services/template');
const secureSettings = require('@medic/settings');
const settingsService = require('../../../src/services/settings');

const client = require('../../../src/openid-client-wrapper');

let controller;

let req;
let res;

describe('sso controller', () => {

  beforeEach(() => {
    template.clear();
    controller = rewire('../../../src/controllers/sso');

    req = {
      query: {},
      body: {},
      hostname: 'xx.app.medicmobile.org',
      protocol: 'http',
      headers: {cookie: ''},
      get: function () {
        return this.hostname;
      }
    };
    res = {
      redirect: () => 'https://fake-url.com',
      send: () => {},
      status: () => ({json: () => {}}),
      json: () => {},
      cookie: () => {},
      clearCookie: () => {},
      setHeader: () => {}
    };
    
    sinon.stub(settingsService, 'get').returns({
      oidc_provider: {
        discovery_url: 'http://discovery.url',
        client_id: 'client_id',
        clientSecret: 'client-secret'
      }
    });

    sinon.stub(client, 'discovery').resolves({
      serverMetadata: () => ({
        supportsPKCE: () => true,
      })
    });
    sinon.stub(client, 'randomPKCECodeVerifier').returns('verifier123');
    sinon.stub(client, 'calculatePKCECodeChallenge').resolves('challenge123');
    sinon.stub(client, 'buildAuthorizationUrl').returns('https://fake-url.com');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('init', () => {
    it('should set pathPrefix', async () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('secret');
      const pathPrefix = '/foo';
      await controller.init(pathPrefix);
      const actualPathPrefix = controller.__get__('pathPrefix');
      chai.expect(actualPathPrefix).to.equal(pathPrefix);
    });
  });
  
  describe('getOidcClientSecret', () => {
    it('should throw an error if no secret is found', async () => {
      sinon.stub(secureSettings, 'getCredentials').resolves(null);
      try {
        await controller.__get__('getOidcClientSecret')('foo');
        chai.expect.fail('Expected error to be thrown');
      } catch (err) {
        chai.expect(err).to.equal('No OIDC client secret \'foo\' configured.');
      }
    });

    it('should return the secret if found', async () => {
      const secret = 'secret';
      sinon.stub(secureSettings, 'getCredentials').resolves(secret);
      const result = await controller.__get__('getOidcClientSecret')('foo');
      chai.expect(result).to.equal(secret);
    });
  });

  describe('getSsoBaseUrl', () => {
    it('should return the base URL for SSO', async () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('secret');
      const pathPrefix = '/foo';
      await controller.init(pathPrefix);
      const url = controller.__get__('getSsoBaseUrl')(req);
      chai.expect(url.href).to.equal(`http://xx.app.medicmobile.org${pathPrefix}`);
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should return the authorization URL', async () => {
      sinon.stub(secureSettings, 'getCredentials').resolves('secret');
      const pathPrefix = '/foo';
      await controller.init(pathPrefix);
      const url = await controller.__get__('getAuthorizationUrl')(req);
      chai.expect(url).to.equal('https://fake-url.com');
    });
  });

  describe('getToken', async () => {
    const pathPrefix = '/foo';
    await controller.init(pathPrefix);
    it('should return a token', async () => {
      req.query.code = 'code123';
      req.query.state = 'state123';
      req.cookies = { verifier: 'verifier123' };
      sinon.stub(client, 'authorizationCodeGrant').resolves({ access_token: 'token123' });
      const token = await controller.__get__('getIdToken')(req, res);
      chai.expect(token).to.equal('token123');
    });

    it('should handle errors', async () => {
      req.query.code = 'code123';
      req.query.state = 'state123';
      req.cookies = { verifier: 'verifier123' };
      sinon.stub(client, 'authorizationCodeGrant').rejects(new Error('Error'));
      try {
        await controller.__get__('getIdToken')(req, res);
        chai.expect.fail('Expected error to be thrown');
      } catch (err) {
        chai.expect(err.message).to.equal('Error');
      }
    });
  });

  describe('getUserPassword', () => {
    it('should return user and password', async () => {
      const username = 'user123';
      const user = { id: 'user123', username: 'user123' };
      sinon.stub(users, 'getUser').returns(user);
      sinon.stub(users, 'resetPassword').resolves('password123');
      const result = await controller.__get__('getUserPassword')(username);
      chai.expect(result).to.deep.equal({ user: 'user123', password: 'password123' });
    });

    it('should throw an error if user is not found', async () => {
      const username = 'invalidUser';
      sinon.stub(users, 'getUser').returns(null);
      try {
        await controller.__get__('getUserPassword')(username);
        chai.expect.fail('Expected error to be thrown');
      } catch (err) {
        chai.expect(err).to.deep.equal({ status: 401, error: `Invalid. Could not login ${username} using SSO.` });
      }
    });
  });
});
