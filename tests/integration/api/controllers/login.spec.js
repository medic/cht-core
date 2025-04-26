const chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));
const utils = require('@utils');
const express = require('express');
const bodyParser = require('body-parser');

let user;
const password = 'passwordSUP3RS3CR37!';
const parentPlace = {
  _id: 'PARENT_PLACE',
  type: 'district_hospital',
  name: 'Big Parent Hostpital'
};

const randomIp = () => {
  const section = () => (Math.floor(Math.random() * 255) + 1);
  return `${section()}.${section()}.${section()}.${section()}`;
};


const loginWithData = data => {
  const opts = {
    path: '/medic/login?aaa=aaa',
    method: 'POST',
    resolveWithFullResponse: true,
    noAuth: true,
    body: data,
    redirect: 'manual',
    headers: { 'X-Forwarded-For': randomIp() },
  };
  return utils.request(opts);
};

const loginWithTokenLink = (token = '') => {
  const opts = {
    path: `/medic/login/token/${token}`,
    method: 'POST',
    resolveWithFullResponse: true,
    noAuth: true,
    redirect: 'manual',
    body: {},
    headers: { 'X-Forwarded-For': randomIp() },
  };
  return utils.request(opts);
};

const expectLoginToWork = (response) => {
  chai.expect(response).to.include({ status: 302 });
  chai.expect(response.headers.getSetCookie()).to.be.an('array');
  chai.expect(response.headers.getSetCookie().find(cookie => cookie.startsWith('AuthSession'))).to.be.ok;
  chai.expect(response.headers.getSetCookie().find(cookie => cookie.startsWith('userCtx'))).to.be.ok;
  chai.expect(response.body).to.equal('/');
};

const expectRedirectToPasswordReset = (response) => {
  chai.expect(response).to.include({ status: 302 });
  chai.expect(response.headers.getSetCookie()).to.be.an('array');
  chai.expect(response.headers.getSetCookie().find(cookie => cookie.startsWith('userCtx'))).to.be.ok;
  chai.expect(response.body).to.equal('/medic/password-reset');
};

const expectLoginToFail = (response) => {
  chai.expect(response.headers.getSetCookie()).to.deep.equal([]);
  chai.expect(response.status).to.equal(401);
};

const getUser = (user) => {
  const getUserId = n => `org.couchdb.user:${n}`;
  const opts = { path: `/_users/${getUserId(user.username)}` };
  return utils.request(opts);
};

const setupTokenLoginSettings = (configureAppUrl = false, configureOidc = false) => {
  const settings = { token_login: { translation_key: 'login_sms', enabled: true } };
  if (configureAppUrl) {
    settings.app_url = utils.getOrigin();
  }
  if (configureOidc) {
    settings.oidc_provider = { client_id: 'test-client-id' };
  }
  return utils
    .updateSettings(settings, { ignoreReload: true })
    .then(() => utils.addTranslations('en', { login_sms: 'Instructions sms' }));
};

describe('login', () => {
  before(() => utils.saveDoc(parentPlace));
  after(() => utils.revertDb([], true));

  beforeEach(() => {
    user = {
      username: 'testuser',
      password,
      roles: ['district_admin'],
      place: {
        _id: 'fixture:test',
        type: 'health_center',
        name: 'TestVille',
        parent: 'PARENT_PLACE'
      },
      contact: {
        _id: 'fixture:user:testuser',
        name: 'Bob'
      },
    };
  });
  afterEach(() => utils.deleteUsers([user]).then(() => utils.revertDb(['PARENT_PLACE'], true)));

  describe('default login', () => {
    it('should fail with no data', () => {
      return loginWithData({ user: '', password: '' })
        .then(response => expectLoginToFail(response));
    });

    it('should fail with random credentials', () => {
      return loginWithData({ user: 'random', password: 'random' })
        .then(response => expectLoginToFail(response));
    });

    it('should fail with wrong credentials', () => {
      const opts = {
        path: '/api/v1/users',
        method: 'POST',
        body: user
      };
      return utils
        .request(opts)
        .then(() => loginWithData({ user: user.username, password: 'random' }))
        .then(response => expectLoginToFail(response));
    });

    it('should succeed with right credentials without redirecting to password-reset', () => {
      const opts = {
        path: '/api/v1/users',
        method: 'POST',
        body: user
      };
      return utils
        .request(opts)
        .then(() => getUser(user))
        .then(userDoc => {
          // Overriding password_change_required for new user
          userDoc.password_change_required = false;
          return utils.request({
            path: `/_users/${userDoc._id}`,
            method: 'PUT',
            body: userDoc
          });
        })
        .then(() => loginWithData({ user: user.username, password }))
        .then(response => expectLoginToWork(response));
    });

    it('should succeed with right credentials and redirect to password-reset for new users', () => {
      const opts = {
        path: '/api/v1/users',
        method: 'POST',
        body: user
      };
      return utils
        .request(opts)
        .then(() => loginWithData({ user: user.username, password }))
        .then(response => expectRedirectToPasswordReset(response));
    });
  });

  describe('token login', () => {
    it('should fail with invalid url', () => {
      return setupTokenLoginSettings()
        .then(() => loginWithTokenLink())
        .then(response => chai.expect(response).to.deep.include({ status: 401 }));
    });

    it('should fail with invalid data', () => {
      return setupTokenLoginSettings()
        .then(() => loginWithTokenLink('token'))
        .then(response => expectLoginToFail(response));
    });

    it('should fail with mismatched data', () => {
      user.phone = '+40755565656';
      user.token_login = true;
      const opts = {
        path: '/api/v1/users',
        method: 'POST',
        body: user
      };
      const optsEdit = {
        path: `/api/v1/users/${user.username}`,
        method: 'POST',
        body: { token_login: true },
      };
      let firstToken;
      return setupTokenLoginSettings()
        .then(() => utils.request(opts))
        .then(() => loginWithData({ user: user.username, password }))
        .then(response => expectLoginToFail(response))
        .then(() => getUser(user))
        .then(user => firstToken = user.token_login.token)
        .then(() => utils.request(optsEdit)) // generate a new token
        .then(() => loginWithTokenLink(firstToken))
        .then(response => expectLoginToFail(response));
    });

    it('should fail with expired data', () => {
      user.phone = '+40755565656';
      user.token_login = true;
      const opts = {
        path: '/api/v1/users',
        method: 'POST',
        body: user
      };
      let tokenLogin;
      return setupTokenLoginSettings()
        .then(() => utils.request(opts))
        .then(() => getUser(user))
        .then(user => {
          // cheat and set the expiration date in the past
          user.token_login.expiration_date = 0;
          tokenLogin = user.token_login;
          return utils.request({ method: 'PUT', path: `/_users/${user._id}`, body: user });
        })
        .then(() => loginWithTokenLink(tokenLogin.token))
        .then(response => expectLoginToFail(response));
    });

    it('should succeed with correct data', () => {
      user.phone = '+40755565656';
      user.token_login = true;
      const opts = {
        path: '/api/v1/users',
        method: 'POST',
        body: user
      };
      let tokenLogin;
      return setupTokenLoginSettings()
        .then(() => utils.request(opts))
        .then(() => getUser(user))
        .then(user => tokenLogin = user.token_login)
        .then(() => loginWithTokenLink(tokenLogin.token))
        .then(response => expectLoginToWork(response))
        .then(() => loginWithTokenLink(tokenLogin.token))
        .then(response => expectLoginToFail(response)); // fails after being activated the 1st time
    });

    it('should succeed with correct data and configured app_url', () => {
      user.phone = '+40755565656';
      user.token_login = true;
      const opts = {
        path: '/api/v1/users',
        method: 'POST',
        body: user,
        headers: { 'Host': 'definitely-not-our-host.com' },
      };
      let tokenLogin;
      return setupTokenLoginSettings(true)
        .then(() => utils.request(opts))
        .then(() => getUser(user))
        .then(user => tokenLogin = user.token_login)
        .then(() => loginWithTokenLink(tokenLogin.token))
        .then(response => expectLoginToWork(response))
        .then(() => loginWithTokenLink(tokenLogin.token))
        .then(response => expectLoginToFail(response)); // fails after being activated the 1st time
    });

    it('should reject token login for SSO users', () => {
      user.phone = '+40755565656';
      user.token_login = true;
      const createOpts = {
        path: '/api/v1/users',
        method: 'POST',
        body: user
      };
      return setupTokenLoginSettings(false, true)
        .then(() => utils.request(createOpts))
        .then(() => getUser(user))
        .then(userDoc => {
          // grab the token and mark as SSO user
          const token = userDoc.token_login.token;
          userDoc.oidc = 'some-provider';
          return utils.usersDb
            .put(userDoc)
            .then(() => token);
        })
        .then(token => loginWithTokenLink(token))
        .then(response => {
          chai.expect(response.headers.getSetCookie()).to.deep.equal([]);
          // status 401 with SSO-specific message
          chai.expect(response.status).to.equal(401);
          chai.expect(response.body).to.deep.equal({
            error: 'Token login not allowed for SSO users'
          });
        });
    });
  });

  describe('SSO login', () => {
    const loginWithSso = () => {
      const opts = {
        path: `/medic/login/oidc`,
        method: 'GET',
        resolveWithFullResponse: false,
        noAuth: true,
        redirect: 'manual',
        headers: { 'X-Forwarded-For': randomIp() },
      };
      return utils.request(opts);
    };

    const setupOidcSettings = () => {
      const settings = {
        oidc_provider: {
          discovery_url: `${oidcBaseUrl}/.well_known/openid-configuration`,
          client_id: 'test-client-id'
        }
      };

      return utils.updateSettings(settings, { ignoreReload: true });
    };

    let server;

    const oidcBaseUrl = 'http://localhost:3000';

    const mockApp = express();

    mockApp.use(bodyParser.json());

    mockApp.get('.well_known/openid-configuration', (req, res) => {
      res.json({
        issuer: `${oidcBaseUrl}`,
        authorization_endpoint: `${oidcBaseUrl}/connect/authorize`,
        token_endpoint: `${oidcBaseUrl}/connect/token`,
        token_endpoint_auth_methods_supported: ['client_secret_basic', 'private_key_jwt'],
        token_endpoint_auth_signing_alg_values_supported: ['RS256', 'ES256'],
        userinfo_endpoint: `${oidcBaseUrl}/connect/userinfo`,
        check_session_iframe: `${oidcBaseUrl}connect/check_session`,
        end_session_endpoint: `${oidcBaseUrl}/connect/end_session`,
        jwks_uri: `${oidcBaseUrl}/jwks.json`,
        registration_endpoint: `${oidcBaseUrl}/connect/register`,
        scopes_supported: ['openid', 'profile', 'email'],
        response_types_supported: ['code', 'code id_token', 'id_token', 'id_token token'],
        acr_values_supported: ['urn:mace:incommon:iap:silver', 'urn:mace:incommon:iap:bronze'],
        subject_types_supported: ['public', 'pairwise'],
        userinfo_signing_alg_values_supported: ['RS256', 'ES256', 'HS256'],
        userinfo_encryption_alg_values_supported: ['RSA-OAEP-256', 'A128KW'],
        userinfo_encryption_enc_values_supported: ['A128CBC-HS256', 'A128GCM'],
        id_token_signing_alg_values_supported: ['RS256', 'ES256', 'HS256'],
        id_token_encryption_alg_values_supported: ['RSA-OAEP-256', 'A128KW'],
        id_token_encryption_enc_values_supported: ['A128CBC-HS256', 'A128GCM'],
        request_object_signing_alg_values_supported: ['none', 'RS256', 'ES256'],
        display_values_supported: ['page', 'popup'],
        claim_types_supported: ['normal', 'distributed'],
        claims_supported: [
          'sub', 'iss', 'auth_time', 'acr',
          'name', 'given_name', 'family_name', 'nickname',
          'profile', 'picture', 'website',
          'email', 'email_verified', 'locale', 'zoneinfo',
          'http://example.info/claims/groups'
        ],
        claims_parameter_supported: true,
        service_documentation: 'http://server.example.com/connect/service_documentation.html',
        ui_locales_supported: ['en-US']
      });
    });

    mockApp.get('/oidc/discovery', (req, res) => {
      const conf = {
        clientMetadata: () => {},
        serverMetadata: () => ({
          issuer: `${oidcBaseUrl}/issuer`,
          authorization_endpoint: `${oidcBaseUrl}/connect/authorize`,
          token_endpoint: `${oidcBaseUrl}/connect/token`,
        })
      };
      res.json(conf);
    });

    mockApp.get('/oidc/authorize', (req, res) => {
      res.redirect(`${utils.hostURL}/medic/login/oidc/get_token?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj`);
    });

    mockApp.get('/oidc/token', (req, res) => {
      res.json({
        access_token: 'SlAV32hkKG',
        token_type: 'Bearer',
        refresh_token: '8xLOxBtZp8',
        expires_in: 3600,
        id_token: `eyJhbGciOiJSUzI1NiIsImtpZCI6IjFlOWdkazcifQ.ewogImlzc
          yI6ICJodHRwOi8vc2VydmVyLmV4YW1wbGUuY29tIiwKICJzdWIiOiAiMjQ4Mjg5
          NzYxMDAxIiwKICJhdWQiOiAiczZCaGRSa3F0MyIsCiAibm9uY2UiOiAibi0wUzZ
          fV3pBMk1qIiwKICJleHAiOiAxMzExMjgxOTcwLAogImlhdCI6IDEzMTEyODA5Nz
          AKfQ.ggW8hZ1EuVLuxNuuIJKX_V8a_OMXzR0EHR9R6jgdqrOOF4daGU96Sr_P6q
          Jp6IcmD3HP99Obi1PRs-cwh3LO-p146waJ8IhehcwL7F09JdijmBqkvPeB2T9CJ
          NqeGpe-gccMg4vfKjkM8FcGvnzZUN4_KSP0aAp1tOJ1zZwgjxqGByKHiOtX7Tpd
          QyHE5lcMiKPXfEIQILVq0pc_E2DzL7emopWoaoZTF_m0_N0YzFC6g6EJbOEoRoS
          K5hoDalrcvRYLSrQAZZKflyuVCyixEoV9GfNQC3_osjzw2PAithfubEEBLuVVk4
          XUVrWOLrLl0nx7RkKU8NXNHq-rvKMzqg`
      });
    });

    const startMockApp = () => {
      return new Promise(resolve => {
        server = mockApp.listen(resolve);
      });
    };

    const stopMockApp = () => {
      server && server.close();
    };

    beforeEach(() => startMockApp());

    afterEach(() => stopMockApp());

    it('should log in successfully', () => {
      delete user.password;
      user.oidc = true;

      const createOpts = {
        path: '/api/v1/users',
        method: 'POST',
        body: user
      };

      return setupOidcSettings()
        .then(() => utils.request(createOpts))
        .then(() => loginWithSso())
        .then(response => {
          //console.log(response);
          expectLoginToWork(response);
        });
    });
  });
});
