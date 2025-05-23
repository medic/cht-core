const { expect } = require('chai');
const sinon = require('sinon');
const db = require('../../../src/db');
const config = require('../../../src/config');
const dataContext = require('../../../src/services/data-context');
const { ssoLogin } = require('@medic/user-management')(config, db, dataContext);
const secureSettings = require('@medic/settings');
const settingsService = require('../../../src/services/settings');
const translations = require('../../../src/translations');
const logger = require('@medic/logger');
const client = require('../../../src/services/openid-client');
const service = require('../../../src/services/sso-login');

const CLIENT_SECRET = 'secret';
const SERVER_METADATA = {
  issuer: 'http://oidc-provider.com',
  authorization_endpoint: 'http://oidc-provider.com/authorize',
  token_endpoint: 'http://oidc-provider.com/token',
  grant_types_supported: ['authorization_code'],
  response_types_supported: ['code'],
  claims_supported: ['sub', 'name', 'email'],
  scopes_supported: ['openid', 'profile', 'email'],
};
const SETTINGS =  {
  oidc_provider: {
    discovery_url: 'http://discovery.url',
    client_id: 'client_id'
  }
};

describe('SSO login', () => {
  const expectedDiscoveryParams = [
    new URL(SETTINGS.oidc_provider.discovery_url),
    SETTINGS.oidc_provider.client_id,
    CLIENT_SECRET,
    null,
    { execute: [] }
  ];

  let idServerConfig;

  beforeEach(async () => {
    idServerConfig = {
      serverMetadata: sinon.stub().returns(SERVER_METADATA),
    };
    sinon.stub(logger, 'debug');
    sinon.stub(settingsService, 'get');
    sinon.stub(secureSettings, 'getCredentials');
    sinon.stub(client, 'discovery');
  });

  afterEach(() => sinon.restore());

  const expectOidcServerConfigRetrieved = () => {
    expect(settingsService.get.calledOnceWithExactly()).to.be.true;
    expect(secureSettings.getCredentials.calledOnceWithExactly('oidc:client-secret')).to.be.true;
    expect(client.discovery.calledOnceWithExactly(...expectedDiscoveryParams)).to.be.true;
    expect(idServerConfig.serverMetadata.calledOnceWithExactly()).to.be.true;
  };

  describe('getAuthorizationUrl', () => {
    const AUTH_URL = 'https://fake-url.com';
    const REDIRECT_URL = 'http://localhost/medic/oidc';

    beforeEach(() => sinon.stub(client, 'buildAuthorizationUrl').returns(AUTH_URL));

    it('throws error when oidc_provider is not configured', async () => {
      settingsService.get.resolves({});

      await expect(service.getAuthorizationUrl(REDIRECT_URL)).to.be.rejectedWith(
        'oidc_provider config is missing in settings.'
      );

      expect(settingsService.get.calledOnceWithExactly()).to.be.true;
      expect(secureSettings.getCredentials.notCalled).to.be.true;
      expect(client.discovery.notCalled).to.be.true;
      expect(idServerConfig.serverMetadata.notCalled).to.be.true;
      expect(logger.debug.notCalled).to.be.true;
      expect(client.buildAuthorizationUrl.notCalled).to.be.true;
    });

    [
      ['discovery_url', { client_id: SETTINGS.oidc_provider.client_id }],
      ['client_id', { discovery_url: SETTINGS.oidc_provider.discovery_url }]
    ].forEach(([missingProp, oidc_provider]) => {
      it(`throws error when ${missingProp} is not provided in oidc_provider settings`, async () => {
        settingsService.get.resolves({ oidc_provider });

        await expect(service.getAuthorizationUrl(REDIRECT_URL)).to.be.rejectedWith(
          `The discovery_url and client_id must be provided in the oidc_provider config.`
        );

        expect(settingsService.get.calledOnceWithExactly()).to.be.true;
        expect(secureSettings.getCredentials.notCalled).to.be.true;
        expect(client.discovery.notCalled).to.be.true;
        expect(idServerConfig.serverMetadata.notCalled).to.be.true;
        expect(logger.debug.notCalled).to.be.true;
        expect(client.buildAuthorizationUrl.notCalled).to.be.true;
      });
    });

    it('throws error when OIDC client secret is not configured', async () => {
      settingsService.get.resolves(SETTINGS);
      secureSettings.getCredentials.resolves('');

      await expect(service.getAuthorizationUrl(REDIRECT_URL)).to.be.rejectedWith(
        `No OIDC client secret 'oidc:client-secret' configured.`
      );

      expect(settingsService.get.calledOnceWithExactly()).to.be.true;
      expect(secureSettings.getCredentials.calledOnceWithExactly('oidc:client-secret')).to.be.true;
      expect(client.discovery.notCalled).to.be.true;
      expect(idServerConfig.serverMetadata.notCalled).to.be.true;
      expect(logger.debug.notCalled).to.be.true;
      expect(client.buildAuthorizationUrl.notCalled).to.be.true;
    });

    it('returns the authorization URL', async () => {
      settingsService.get.resolves(SETTINGS);
      secureSettings.getCredentials.resolves(CLIENT_SECRET);
      client.discovery.resolves(idServerConfig);

      const url = await service.getAuthorizationUrl(REDIRECT_URL);

      expect(url).to.equal(AUTH_URL);
      expectOidcServerConfigRetrieved();
      expect(logger.debug.calledOnceWithExactly(
        `Authorization server config loaded: ${JSON.stringify(SERVER_METADATA)}`
      )).to.be.true;
      expect(client.buildAuthorizationUrl.calledOnceWithExactly(
        idServerConfig,
        {
          redirect_uri: REDIRECT_URL,
          scope: 'openid email'
        }
      )).to.be.true;
    });

    it('returns the authorization URL when allow_insecure_requests is configured', async () => {
      settingsService.get.resolves({ oidc_provider: {
        ...SETTINGS.oidc_provider,
        allow_insecure_requests: true
      } });
      secureSettings.getCredentials.resolves(CLIENT_SECRET);
      client.discovery.resolves(idServerConfig);

      const url = await service.getAuthorizationUrl(REDIRECT_URL);

      expect(url).to.equal(AUTH_URL);
      expect(settingsService.get.calledOnceWithExactly()).to.be.true;
      expect(secureSettings.getCredentials.calledOnceWithExactly('oidc:client-secret')).to.be.true;
      expect(client.discovery.calledOnceWithExactly(
        new URL(SETTINGS.oidc_provider.discovery_url),
        SETTINGS.oidc_provider.client_id,
        CLIENT_SECRET,
        null,
        { execute: [client.allowInsecureRequests] }
      )).to.be.true;
      expect(idServerConfig.serverMetadata.calledOnceWithExactly()).to.be.true;
      expect(logger.debug.calledOnceWithExactly(
        `Authorization server config loaded: ${JSON.stringify(SERVER_METADATA)}`
      )).to.be.true;
      expect(client.buildAuthorizationUrl.calledOnceWithExactly(
        idServerConfig,
        {
          redirect_uri: REDIRECT_URL,
          scope: 'openid email'
        }
      )).to.be.true;
    });

    it('returns the authorization URL after retrying request three times', async () => {
      settingsService.get.resolves(SETTINGS);
      secureSettings.getCredentials.resolves(CLIENT_SECRET);
      client.discovery.onFirstCall().rejects(new Error());
      client.discovery.onSecondCall().rejects(new Error());
      client.discovery.onThirdCall().resolves(idServerConfig);

      const url = await service.getAuthorizationUrl(REDIRECT_URL);

      expect(url).to.equal(AUTH_URL);
      expect(settingsService.get.calledOnceWithExactly()).to.be.true;
      expect(secureSettings.getCredentials.calledOnceWithExactly('oidc:client-secret')).to.be.true;
      expect(client.discovery.args).to.deep.equal([
        expectedDiscoveryParams, expectedDiscoveryParams, expectedDiscoveryParams
      ]);
      expect(idServerConfig.serverMetadata.calledOnceWithExactly()).to.be.true;
      expect(logger.debug.args).to.deep.equal([
        ['Retrying OIDC request: discovery.'],
        ['Retrying OIDC request: discovery.'],
        [`Authorization server config loaded: ${JSON.stringify(SERVER_METADATA)}`]
      ]);
      expect(client.buildAuthorizationUrl.calledOnceWithExactly(
        idServerConfig,
        {
          redirect_uri: REDIRECT_URL,
          scope: 'openid email'
        }
      )).to.be.true;
    });

    it('throws error after request fails three times', async () => {
      settingsService.get.resolves(SETTINGS);
      secureSettings.getCredentials.resolves(CLIENT_SECRET);
      const expectedError = new Error('Could not complete request');
      client.discovery.rejects(expectedError);

      await expect(service.getAuthorizationUrl(REDIRECT_URL)).to.be.rejectedWith(expectedError);

      expect(settingsService.get.calledOnceWithExactly()).to.be.true;
      expect(secureSettings.getCredentials.calledOnceWithExactly('oidc:client-secret')).to.be.true;
      expect(client.discovery.args).to.deep.equal([
        expectedDiscoveryParams, expectedDiscoveryParams, expectedDiscoveryParams
      ]);
      expect(idServerConfig.serverMetadata.notCalled).to.be.true;
      expect(logger.debug.args).to.deep.equal([
        ['Retrying OIDC request: discovery.'],
        ['Retrying OIDC request: discovery.']
      ]);
      expect(client.buildAuthorizationUrl.notCalled).to.be.true;
    });

    it('throws error after request fails with 40x status code', async () => {
      settingsService.get.resolves(SETTINGS);
      secureSettings.getCredentials.resolves(CLIENT_SECRET);
      const expectedError = new Error('Could not complete request');
      expectedError.status = 400;
      client.discovery.rejects(expectedError);

      await expect(service.getAuthorizationUrl(REDIRECT_URL)).to.be.rejectedWith(expectedError);

      expect(settingsService.get.calledOnceWithExactly()).to.be.true;
      expect(secureSettings.getCredentials.calledOnceWithExactly('oidc:client-secret')).to.be.true;
      expect(client.discovery.calledOnceWithExactly(...expectedDiscoveryParams)).to.be.true;
      expect(idServerConfig.serverMetadata.notCalled).to.be.true;
      expect(logger.debug.notCalled).to.be.true;
      expect(client.buildAuthorizationUrl.notCalled).to.be.true;
    });
  });

  describe('getIdToken', async () => {
    const REDIRECT_URL = 'http://localhost/medic/oidc?code=123';
    let expectedAuthCodeGrantParams;
    let claims;

    beforeEach(() => {
      settingsService.get.resolves(SETTINGS);
      secureSettings.getCredentials.resolves(CLIENT_SECRET);
      client.discovery.resolves(idServerConfig);
      claims = sinon.stub();
      sinon.stub(client, 'authorizationCodeGrant');
      sinon.stub(translations, 'getEnabledLocales').resolves([{ code: 'en' }, { code: 'es' }]);
      expectedAuthCodeGrantParams = [
        idServerConfig,
        REDIRECT_URL,
        { idTokenExpected: true }
      ];
    });

    [
      undefined,
      null,
      ''
    ].forEach((email) => {
      it('throws error if email claim not returned', async () => {
        const expectedClaims = {
          preferred_username: 'test',
          locale: 'en',
          email
        };
        claims.returns(expectedClaims);
        client.authorizationCodeGrant.resolves({ claims });

        await expect(service.getIdToken(REDIRECT_URL)).to.be.rejectedWith('Email claim is missing in the id token.');

        expectOidcServerConfigRetrieved();
        expect(logger.debug.calledOnceWithExactly(
          `Authorization server config loaded: ${JSON.stringify(SERVER_METADATA)}`
        )).to.be.true;
        expect(client.authorizationCodeGrant.calledOnceWithExactly(...expectedAuthCodeGrantParams)).to.be.true;
        expect(translations.getEnabledLocales.notCalled).to.be.true;
      });
    });

    it('returns the id token data', async () => {
      const expectedClaims = {
        preferred_username: 'test',
        locale: 'en',
        email: 'test@email.com'
      };
      claims.returns(expectedClaims);
      client.authorizationCodeGrant.resolves({ claims });

      const idTokenClaims = await service.getIdToken(REDIRECT_URL);

      expect(idTokenClaims).to.deep.equal({
        locale: 'en',
        username: 'test@email.com'
      });
      expectOidcServerConfigRetrieved();
      expect(logger.debug.calledOnceWithExactly(
        `Authorization server config loaded: ${JSON.stringify(SERVER_METADATA)}`
      )).to.be.true;
      expect(client.authorizationCodeGrant.calledOnceWithExactly(...expectedAuthCodeGrantParams)).to.be.true;
      expect(translations.getEnabledLocales.calledOnceWithExactly()).to.be.true;
    });

    [undefined, 'sw'].forEach((locale) => {
      it('returns the id token data with the default locale', async () => {
        const expectedClaims = {
          preferred_username: 'test',
          locale,
          email: 'test@email.com'
        };
        claims.returns(expectedClaims);
        client.authorizationCodeGrant.resolves({ claims });

        const idTokenClaims = await service.getIdToken(REDIRECT_URL);

        expect(idTokenClaims).to.deep.equal({ username: 'test@email.com', locale: 'en' });
        expectOidcServerConfigRetrieved();
        expect(logger.debug.args).to.deep.equal([
          [`Authorization server config loaded: ${JSON.stringify(SERVER_METADATA)}`],
          [`Invalid local for user [${locale}]. Using default locale.`]
        ]);
        expect(client.authorizationCodeGrant.calledOnceWithExactly(...expectedAuthCodeGrantParams)).to.be.true;
        expect(translations.getEnabledLocales.calledOnceWithExactly()).to.be.true;
      });
    });

    it('returns the id token data after retrying three times', async () => {
      const expectedClaims = {
        preferred_username: 'test',
        locale: 'en',
        email: 'test@email.com'
      };
      claims.returns(expectedClaims);
      client.authorizationCodeGrant.onFirstCall().rejects(new Error());
      client.authorizationCodeGrant.onSecondCall().rejects(new Error());
      client.authorizationCodeGrant.onThirdCall().resolves({ claims });

      const idTokenClaims = await service.getIdToken(REDIRECT_URL);

      expect(idTokenClaims).to.deep.equal({
        locale: 'en',
        username: 'test@email.com'
      });
      expectOidcServerConfigRetrieved();
      expect(logger.debug.args).to.deep.equal([
        [`Authorization server config loaded: ${JSON.stringify(SERVER_METADATA)}`],
        ['Retrying OIDC request: authorizationCodeGrant.'],
        ['Retrying OIDC request: authorizationCodeGrant.'],
      ]);
      expect(client.authorizationCodeGrant.args).to.deep.equal([
        expectedAuthCodeGrantParams, expectedAuthCodeGrantParams, expectedAuthCodeGrantParams
      ]);
      expect(translations.getEnabledLocales.calledOnceWithExactly()).to.be.true;
    });

    it('throws error after request fails three times', async () => {
      const expectedClaims = {
        preferred_username: 'test',
        locale: 'en',
        email: 'test@email.com'
      };
      claims.returns(expectedClaims);
      const expectedError = new Error('Could not complete request');
      client.authorizationCodeGrant.rejects(expectedError);

      await expect(service.getIdToken(REDIRECT_URL)).to.be.rejectedWith(expectedError);

      expectOidcServerConfigRetrieved();
      expect(logger.debug.args).to.deep.equal([
        [`Authorization server config loaded: ${JSON.stringify(SERVER_METADATA)}`],
        ['Retrying OIDC request: authorizationCodeGrant.'],
        ['Retrying OIDC request: authorizationCodeGrant.'],
      ]);
      expect(client.authorizationCodeGrant.args).to.deep.equal([
        expectedAuthCodeGrantParams, expectedAuthCodeGrantParams, expectedAuthCodeGrantParams
      ]);
      expect(translations.getEnabledLocales.notCalled).to.be.true;
    });
  });

  describe('getCookie', () => {
    const username = 'odin@email.com';
    let clock;

    beforeEach(() => {
      clock = sinon.useFakeTimers(1743782507000); // 'Fri Apr 04 2025 19:01:47 GMT+0300 (East Africa Time)'
      sinon.stub(ssoLogin, 'getUsersByOidcUsername');
      sinon.stub(secureSettings, 'getCouchConfig');
    });

    afterEach(() => {
      clock.restore();
    });

    it('should generate a cookie header value', async () => {
      const user = { name: 'odin', salt: 'salt', oidc_username: username };
      ssoLogin.getUsersByOidcUsername.resolves([user]);
      const couchSecret = 'couch-secret';
      const couchAuthTimeout = '12345';
      secureSettings.getCouchConfig.withArgs('couch_httpd_auth/secret').resolves(couchSecret);
      secureSettings.getCouchConfig.withArgs('couch_httpd_auth/timeout').resolves(couchAuthTimeout);

      const cookie = await service.getCookie(username);

      expect(cookie).to.be.equal(`AuthSession=b2Rpbjo2N0YwMzJBNDpcE8TPUoK-7JE6nPPaVTaF5hAe-Q`);
      expect(ssoLogin.getUsersByOidcUsername.calledOnceWithExactly(username)).to.be.true;
      expect(secureSettings.getCouchConfig.args).to.deep.equal(
        [['couch_httpd_auth/secret'], ['couch_httpd_auth/timeout']]
      );
    });

    it('throws error if user is not found', async () => {
      ssoLogin.getUsersByOidcUsername.resolves([]);

      await expect(service.getCookie(username))
        .to.be.rejectedWith(`CHT user not found for oidc_username [${username}].`)
        .to.eventually.have.property('status', 401);

      expect(ssoLogin.getUsersByOidcUsername.calledOnceWithExactly(username)).to.be.true;
      expect(secureSettings.getCouchConfig.notCalled).to.be.true;
    });

    it('throws error if problem retrieving user', async () => {
      const error = new Error('DB Timeout');
      error.status = 500;
      ssoLogin.getUsersByOidcUsername.rejects(error);

      await expect(service.getCookie(username))
        .to.be.rejectedWith(error);

      expect(ssoLogin.getUsersByOidcUsername.calledOnceWithExactly(username)).to.be.true;
      expect(secureSettings.getCouchConfig.notCalled).to.be.true;
    });

    it('throws error if multiple users are found for oidc_username', async () => {
      const user = { name: 'odin', salt: 'salt', oidc_username: username };
      ssoLogin.getUsersByOidcUsername.resolves([user, user]);

      await expect(service.getCookie(username))
        .to.be.rejectedWith(`Multiple CHT users found for oidc_username [${username}].`);

      expect(ssoLogin.getUsersByOidcUsername.calledOnceWithExactly(username)).to.be.true;
      expect(secureSettings.getCouchConfig.notCalled).to.be.true;
    });

    it('throws error if user salt is missing', async () => {
      const user = { name: 'odin', oidc_username: username };
      ssoLogin.getUsersByOidcUsername.resolves([user]);

      await expect(service.getCookie(username))
        .to.be.rejectedWith(`The user doc for ${user.name} does not have a password salt.`)
        .to.eventually.have.property('status', 401);

      expect(ssoLogin.getUsersByOidcUsername.calledOnceWithExactly(username)).to.be.true;
      expect(secureSettings.getCouchConfig.notCalled).to.be.true;
    });
  });
});
