const rewire = require('rewire');
const chai = require('chai');
const sinon = require('sinon');
const request = require('@medic/couch-request');

const environment = require('@medic/environment');
const rateLimit = require('../../../src/services/rate-limit');
const db = require('../../../src/db');
const privacyPolicy = require('../../../src/services/privacy-policy');
const config = require('../../../src/config');
const dataContext = require('../../../src/services/data-context');
const { tokenLogin, roles, users } = require('@medic/user-management')(config, db, dataContext);
const template = require('../../../src/services/template');
const serverUtils = require('../../../src/server-utils');
const secureSettings = require('@medic/settings');
const settingsService = require('../../../src/services/settings');
const client = require('openid-client');

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
      headers: {cookie: ''}
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
    sinon.stub(secureSettings, 'getCredentials').returns('secret');
    sinon.stub(settingsService, 'get').returns({
      oidc_provider: {
        discovery_url: 'http://discovery.url',
        client_id: 'client_id',
        clientSecret: 'client-secret'
      }
    });

    sinon.stub(client, 'discovery').resolves({
      issuer: 'http://discovery.url',
      authorization_endpoint: 'http://discovery.url/authorize',
      token_endpoint: 'http://discovery.url/token',
      userinfo_endpoint: 'http://discovery.url/userinfo',
      jwks_uri: 'http://discovery.url/jwks',
      client_id: 'client_id',
      client_secret: 'client-secret'
    });
    sinon.stub(client.Client.prototype, 'authorizationUrl').returns('http://discovery.url/authorize?code_challenge=challenge&code_challenge_method=S256&state=state');
  });

  afterEach(() => {
    sinon.restore();
  });


  describe('init', () => {
    it('should set pathPrefix', async () => {
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
        chai.expect(err).to.equal("No OIDC client secret 'foo' configured.");
      }
    });

    it('should return the secret if found', async () => {
      const secret = 'secret';
      sinon.stub(secureSettings, 'getCredentials').resolves(secret);
      const result = await controller.__get__('getOidcClientSecret')('foo');
      chai.expect(result).to.equal(secret);
    });
  });
  // describe('getCurrentUrl', () => {
  //   it('should return the current URL', () => {
  //     const url = controller.__get__('getCurrentUrl')(req);
  //     chai.expect(url.href).to.equal('http://xx.app.medicmobile.org/');
  //   });
  // });
  // describe('getSsoBaseUrl', () => {
  //   it('should return the base URL for SSO', () => {
  //     const url = controller.__get__('getSsoBaseUrl')(req);
  //     chai.expect(url.href).to.equal('http://xx.app.medicmobile.org/');
  //   });
  // });

  // describe('getAuthorizeUrl', () => {
  //   it('should return the authorization URL', async () => {
  //     const url = await controller.getAuthorizationUrl(req);
  //     chai.expect(url).to.equal('http://test.com:1234/oidc/authorize');
  //   });
  // });

});
