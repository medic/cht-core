const chai = require('chai');
chai.use(require('chai-shallow-deep-equal'));
const utils = require('@utils');
const mockIdProvider = require('../../../utils/mock-oidc-provider');
const path = require('path');

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
    const authorizeSso = () => {
      const opts = {
        path: `/medic/login/oidc`,
        method: 'GET',
        json: false,
        resolveWithFullResponse: true,
        noAuth: true,
        redirect: 'manual',
        headers: { 'X-Forwarded-For': randomIp() },
      };
      return utils.request(opts);
    };

    const idTokenLogin = () => {
      const opts = {
        path: `/medic/login/oidc/get_token?code=random`,
        method: 'GET',
        json: false,
        resolveWithFullResponse: true,
        redirect: 'manual',
        headers: { 'X-Forwarded-For': randomIp() },
      };
      return utils.request(opts);
    };

    const setupOidcSettings = (oidcBaseUrl) => {
      const settings = {
        oidc_provider: {
          discovery_url: path.join(oidcBaseUrl, '.well-known/openid-configuration'),
          client_id: 'cht',
          allow_insecure_requests: true
        }
      };

      return utils.updateSettings(settings, { ignoreReload: true });
    };

    const setClientSecret = () => {
      return utils.saveCredentials('oidc:client-secret', 'client-secret');
    };

    const createUser = (user) => {
      delete user.password;
      user.oidc = true;

      const createOpts = {
        path: '/api/v1/users',
        method: 'POST',
        body: user
      };
      return utils.request(createOpts);
    };

    const expectLoginToFailWithServerError = (response) => {
      chai.expect(response.headers.getSetCookie()).to.deep.equal([]);
      chai.expect(response.status).to.equal(500);
      chai.expect(response.body.error).to.equal('Unexpected error logging in');
    };

    let server;

    const startMockApp = () => {
      return new Promise(resolve => {
        server = mockIdProvider.startOidcServer(resolve);
      });
    };

    const stopMockApp = () => {
      mockIdProvider.stopOidcServer(server);
    };

    beforeEach(() => startMockApp());

    afterEach(() => {
      stopMockApp();
      utils.deleteUsers([user]);
    });

    it('should fail with server error if oidc provider settings missing', () => {
      return idTokenLogin()
        .then(response => expectLoginToFailWithServerError(response));
    });

    it('should fail with server error if discovery url is not provided', () => {
      return utils.updateSettings({}, { ignoreReload: true })
        .then(() => idTokenLogin())
        .then(response => expectLoginToFailWithServerError(response));
    });

    it('should fail with server error if OIDC client secret is not set', () => {
      return setupOidcSettings(mockIdProvider.oidcBaseUrl)
        .then(() => idTokenLogin())
        .then(response => expectLoginToFailWithServerError(response));
    });

    it('should fail with server error if the wrong discovery url is provided', () => {
      return utils.updateSettings(
        {
          discovery_url: 'http://random-xveersd/.well-known/openid-configuration',
          client_id: 'cht'
        },
        {
          ignoreReload: true
        }
      )
        .then(() => idTokenLogin())
        .then(response => expectLoginToFailWithServerError(response));
    });

    it('should fail log in if user does not exist in CHT', () => {
      return setupOidcSettings(mockIdProvider.oidcBaseUrl)
        .then(() => setClientSecret())
        .then(() => idTokenLogin())
        .then(response => expectLoginToFail(response));
    });

    it('should redirect to oidc provide authorize endpoint', () => {
      return setupOidcSettings(mockIdProvider.oidcBaseUrl)
        .then(() => setClientSecret())
        .then(() => createUser(user))
        .then(() => authorizeSso())
        .then(response => {
          chai.expect(response).to.include({ status: 302 });
          const appUrl = `${mockIdProvider.appTokenUrl}&scope=openid&client_id=cht&response_type=code`;
          const redirectLocation = `${mockIdProvider.oidcBaseUrl}connect/authorize?redirect_uri=${appUrl}`;
          chai.expect(decodeURIComponent(response.body)).to.equal(redirectLocation);
        });
    });

    it('should log in successfully', () => {
      return setupOidcSettings(mockIdProvider.oidcBaseUrl)
        .then(() => setClientSecret())
        .then(() => createUser(user))
        .then(() => idTokenLogin())
        .then(response => expectLoginToWork(response));
    });
  });
});
