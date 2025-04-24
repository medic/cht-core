const rewire = require('rewire');
const chai = require('chai');
const sinon = require('sinon');
const db = require('../../../src/db');
const config = require('../../../src/config');
const dataContext = require('../../../src/services/data-context');
const { users } = require('@medic/user-management')(config, db, dataContext);
const secureSettings = require('@medic/settings');
const settingsService = require('../../../src/services/settings');
const request = require('@medic/couch-request');

const client = require('../../../src/openid-client-wrapper.js');
let service;

describe('SSO login', () => {
  let clock;
  const settings =  {
    oidc_provider: {
      discovery_url: 'http://discovery.url',
      client_id: 'client_id'
    }
  };

  const ASConfig = {
    serverMetadata: () => ({
      supportsPKCE: () => true,
    }),
    clientMetadata: () => ({client_id: 'id'})
  };

  const id_token = 'token123';
  const name = 'ari';
  const preferred_username = 'ari';
  const email = 'ari@test';

  const claims = () => {
    return { name, preferred_username, email };
  };

  beforeEach(async () => {
    clock = sinon.useFakeTimers(1743782507000); // 'Fri Apr 04 2025 19:01:47 GMT+0300 (East Africa Time)'
    service = rewire('../../../src/services/sso-login');
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  describe('oidcServerSConfig', () => {
    it('should return authorization server config object', async () => {
      sinon.stub(settingsService, 'get').returns(settings);
      sinon.stub(secureSettings, 'getCredentials').resolves('secret');
      sinon.stub(client, 'discovery').resolves(ASConfig);
      const config = await service.__get__('oidcServerSConfig')();
      chai.expect(client.discovery.calledWith(
        new URL(settings.oidc_provider.discovery_url),
        settings.oidc_provider.client_id,
        'secret'
      )).to.be.true;
      chai.expect(config).to.be.deep.equal(ASConfig);
    });

    it('should throw an error if oidc_provider config is not set', async () => {
      sinon.stub(settingsService, 'get').returns({});
      sinon.stub(secureSettings, 'getCredentials').resolves('secret');
      try {
        await service.__get__('oidcServerSConfig')();
        chai.expect.fail('Expected error to be thrown');
      } catch (err) {
        chai.expect(err.message).to.equal('oidc_provider config is missing in settings.');
      }
    });

    it('should throw an error if oidc_provider.discovery_url config is not set', async () => {
      sinon.stub(settingsService, 'get').returns({
        oidc_provider: {
          client_id: 'client_id'
        }
      });
      sinon.stub(secureSettings, 'getCredentials').resolves('secret');
      try {
        await service.__get__('oidcServerSConfig')();
        chai.expect.fail('Expected error to be thrown');
      } catch (err) {
        chai.expect(err.message).to.equal(
          'Either or both discovery_url and client_id is not set in oidc_provider config.'
        );
      }
    });

    it('should throw an error if oidc_provider.client_id config is not set', async () => {
      sinon.stub(settingsService, 'get').returns({
        oidc_provider: {
          discovery_url: 'http://discovery.url'
        }
      });
      sinon.stub(secureSettings, 'getCredentials').resolves('secret');
      try {
        await service.__get__('oidcServerSConfig')();
        chai.expect.fail('Expected error to be thrown');
      } catch (err) {
        chai.expect(err.message).to.equal(
          'Either or both discovery_url and client_id is not set in oidc_provider config.'
        );
      }
    });

    it('should throw an error if no secret is found', async () => {
      sinon.stub(settingsService, 'get').returns(settings);
      sinon.stub(secureSettings, 'getCredentials').resolves(null);
      try {
        await service.__get__('oidcServerSConfig')();
        chai.expect.fail('Expected error to be thrown');
      } catch (err) {
        chai.expect(err.message).to.equal('No OIDC client secret \'oidc:client-secret\' configured.');
      }
    });

    it('should retry call to oidc provider 3 times', async () => {
      sinon.stub(settingsService, 'get').returns(settings);
      sinon.stub(secureSettings, 'getCredentials').resolves('secret');
      const fn = sinon.stub(client, 'discovery').throws('Error');
      try {
        await service.__get__('oidcServerSConfig')();
        chai.expect.fail('Error');
      } catch (err) {
        chai.expect(fn.calledThrice).to.be.true;
      }
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should return the authorization URL', async () => {
      sinon.stub(client, 'buildAuthorizationUrl').returns('https://fake-url.com');
      service.__set__('oidcServerSConfig', () => ASConfig);
      const url = await service.getAuthorizationUrl('http://localhost/medic/oidc/get_token');
      chai.expect(url).to.equal('https://fake-url.com');
    });

    it('should throw and error if oidc provider is unavailable', async () => {
      service.__set__('oidcServerSConfig', sinon.fake.throws('Error'));
      try {
        await service.getAuthorizationUrl('http://localhost/medic/oidc/get_token');
        chai.expect.fail('Error');
      } catch (err) {
        chai.expect(err).to.be.equal(service.__get__('SERVER_ERROR'));
      }
    });
  });

  describe('getToken', async () => {
    it('should return a token', async () => {
      service.__set__('oidcServerSConfig', () => ASConfig);
      sinon.stub(client, 'authorizationCodeGrant').resolves({ id_token, claims });
      const token = await service.getIdToken('http://current_url/');
      chai.expect(token).to.deep.equal({
        id_token,
        user: {
          name,
          username: preferred_username,
          email
        }
      });
    });

    it('should throw and error if oidc provider is unavailable', async () => {
      service.__set__('oidcServerSConfig', sinon.fake.throws('Error'));

      try {
        await service.getIdToken('http://current_url/');
        chai.expect.fail('Error');
      } catch (err) {
        chai.expect(err).to.be.equal(service.__get__('SERVER_ERROR'));
      }
    });
  });

  describe('make cookie', () => {
    it('should generate a valid cookie', () => {
      const username = 'odin';
      const salt = '19cba3729c50c92d894edeea0fb9c1c4';
      const secret = 'c0673d7e-0310-44bc-a919-9e6330904f80';
      const authTimeout = 30;

      const cookie = service.__get__('makeCookie')(username, salt, secret, authTimeout);
      chai.expect(cookie).to.be.equal('b2Rpbjo2N0YwMDI4OTrzYR70nsFmwmMSkvPju5RW1OCbew');
    });
  });

  describe('get cookie', () => {
    it('should generate a cookie header value', async () => {
      const username = 'odin';
      const user = { id: 'user123', username: 'user123', salt: 'salt' };
      sinon.stub(users, 'getUserDoc').returns(user);
      sinon.stub(request, 'get').returns('value');
      service.__set__('makeCookie', sinon.fake.returns('cookie'));

      const cookie = await service.getCookie(username);
      chai.expect(cookie).to.be.equal(`AuthSession=cookie`);
    });

    it('should throw an error if user is not found', async () => {
      sinon.stub(users, 'getUserDoc').throws(`Failed to find user with name [odin] in the [test] database.`);

      try {
        await service.getCookie('odin');
        chai.expect.fail('Expected test to fail.');
      } catch (err) {
        chai.expect(err).to.be.equal(service.__get__('USER_UNAUTHORIZED'));
      }
    });

    it('should throw an error if user salt is missing', async () => {
      const user = { id: 'user123', username: 'user123'};
      sinon.stub(users, 'getUserDoc').returns(user);

      try {
        await service.getCookie('odin');
        chai.expect.fail('Expected test to fail.');
      } catch (err) {
        chai.expect(err).to.be.equal(service.__get__('USER_UNAUTHORIZED'));
      }
    });

    it('should throw and error if secret or auth timeout is not set', async () => {
      service.__set__('oidcServerSConfig', ASConfig);
      const user = { id: 'user123', username: 'user123', salt: 'salt' };
      sinon.stub(users, 'getUserDoc').returns(user);
      sinon.stub(request, 'get').throws(new Error('error'));
      try {
        await service.getCookie('odin');
        chai.expect.fail('Error');
      } catch (err) {
        chai.expect(err).to.be.equal(service.__get__('SERVER_ERROR'));
      }
    });
  });
});
