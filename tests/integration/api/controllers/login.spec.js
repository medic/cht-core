const chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));
const utils = require('@utils');
const mockIdProvider = require('../../../utils/mock-oidc-provider');
const { DB_NAME } = require('@constants');

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

const setupTokenLoginSettings = (configureAppUrl = true, configureOidc = false) => {
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

const setupOidcLoginSettings = async (clientId) => {
  const settings = { oidc_provider: { client_id: clientId } };
  return await utils.updateSettings(settings, { ignoreReload: true });
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

    it('should fail if sso user', async () => {
      await setupOidcLoginSettings('clientId');
      await utils.request({ path: '/api/v2/users', method: 'POST', body: user });
      // Manually update user to be OIDC so we also know the password
      const userDoc = await getUser(user);
      await utils.usersDb.put({ ...userDoc, oidc_username: 'true' });

      const response = await loginWithData({ user: user.username, password });

      expect(response.status).to.equal(401);
      expect(response.body.error).to.equal('Password Login Not Permitted For SSO Users');
    });
  });

  describe('token login', () => {
    it('should fail with invalid url', () => {
      return setupTokenLoginSettings(false)
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
      return setupTokenLoginSettings()
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
      return setupTokenLoginSettings(true, true)
        .then(() => utils.request(createOpts))
        .then(() => getUser(user))
        .then(userDoc => {
          // grab the token and mark as SSO user
          const token = userDoc.token_login.token;
          userDoc.oidc_username = 'true';
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
    const oidcAuthorize = () => {
      const opts = {
        path: `/medic/login/oidc/authorize`,
        method: 'GET',
        noAuth: true,
        json: false,
        resolveWithFullResponse: true,
        redirect: 'manual',
      };
      return utils.request(opts);
    };

    const oidcLogin = (code = 'random') => {
      const opts = {
        path: `/medic/login/oidc?code=${code}`,
        method: 'GET',
        noAuth: true,
        json: false,
        resolveWithFullResponse: true,
        redirect: 'manual',
      };
      return utils.request(opts);
    };

    const setupOidcSettings = () => {
      const settings = {
        oidc_provider: {
          discovery_url: mockIdProvider.getDiscoveryUrl(),
          client_id: 'cht',
          allow_insecure_requests: true
        },
        app_url: utils.getOrigin()
      };

      return utils.updateSettings(settings, { ignoreReload: true });
    };

    const setClientSecret = () => utils.saveCredentials('oidc:client-secret', 'client-secret');

    const expectRedirectToLoginWithError = (ssoError, response) => {
      chai.expect(response.status).to.equal(302);
      chai.expect(response.headers.getSetCookie()).to.deep.equal([]);
      chai.expect(response.body).to.equal(`Found. Redirecting to /${DB_NAME}/login?sso_error=${ssoError}`);
    };

    const expectServerError = (response) => {
      chai.expect(response.status).to.equal(500);
      chai.expect(response.headers.getSetCookie()).to.deep.equal([]);
      chai.expect(response.body).to.equal('Server error');
    };

    before(async () => {
      await mockIdProvider.startOidcServer();
    });

    afterEach(async () => {
      await utils.revertSettings(true);
    });

    after(() => mockIdProvider.stopOidcServer());

    [
      ['login/oidc', oidcLogin, response => expectRedirectToLoginWithError('loginerror', response)],
      ['login/oidc/authorize', oidcAuthorize, expectServerError]
    ].forEach(([endpoint, oidcFn, assertFn]) => {
      it(`should fail ${endpoint} when OIDC not configured`, async () => {
        const response  = await oidcFn();
        assertFn(response);
      });

      it(`should fail ${endpoint} when OIDC client secret is not set`, async () => {
        await setupOidcSettings();
        const response =  await oidcFn();
        assertFn(response);
      });

      it(`should fail ${endpoint} when invalid discovery url is provided`, async () => {
        await utils.updateSettings(
          {
            discovery_url: 'http://random-xveersd/.well-known/openid-configuration',
            client_id: 'cht'
          },
          { ignoreReload: true }
        );
        const response = await oidcFn();
        assertFn(response);
      });
    });

    it('should redirect back to login when user does not exist in CHT', async () => {
      await setupOidcSettings();
      await setClientSecret();
      const response = await oidcLogin();

      expectRedirectToLoginWithError('ssouserinvalid', response);
    });

    it('should redirect to oidc provide authorize endpoint', async () => {
      await setupOidcSettings();
      await setClientSecret();
      const response  = await oidcAuthorize();

      chai.expect(response).to.include({ status: 302 });
      const appUrl = `${mockIdProvider.appTokenUrl}&scope=openid+email&client_id=cht&response_type=code`;
      const redirectLocation = `${mockIdProvider.getOidcBaseUrl()}connect/authorize?redirect_uri=${appUrl}`;
      chai.expect(decodeURIComponent(response.body)).to.equal(redirectLocation);
    });

    ['', 'invalid'].forEach(code => {
      it(`should redirect back to login when authentication code is [${code}]`, async () => {
        await setupOidcSettings();
        await setClientSecret();
        await utils.createUsers([{
          ...user,
          password: undefined,
          oidc_username: 'true',
        }]);
        const response = await oidcLogin(code);

        expectRedirectToLoginWithError('loginerror', response);
      });
    });

    it('should log in successfully', async () => {
      await setupOidcSettings();
      await setClientSecret();
      await utils.createUsers([{
        ...user,
        password: undefined,
        oidc_username: mockIdProvider.EMAIL,
      }]);
      const response = await oidcLogin();
      chai.expect(response).to.include({ status: 302 });
      chai.expect(response.headers.getSetCookie()).to.be.an('array');
      chai.expect(response.headers.getSetCookie().find(cookie => cookie.startsWith('AuthSession'))).to.be.ok;
      chai.expect(response.headers.getSetCookie().find(cookie => cookie.startsWith('userCtx'))).to.be.ok;
      chai.expect(response.body).to.equal('Found. Redirecting to /');
    });
  });
});
