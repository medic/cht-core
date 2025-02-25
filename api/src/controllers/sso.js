const session = require('express-session');
const Keycloak = require('keycloak-connect');
const serverUtils = require('../server-utils');

const config = require('../config');
const db = require('../db');
const dataContext = require('../services/data-context');
const { ssoLogin } = require('@medic/user-management')(config, db, dataContext);

const { validateSession, setCookies, redirectToApp } = require('./login');

module.exports = {
    init: (app) => {
      const Keycloak = require('keycloak-connect');
      const memoryStore = new session.MemoryStore();

      // get this from settng doc & secrets store
      const keyClockConfig = {
        "realm": "cht",
        "auth-server-url": "https://127-0-0-1.local-ip.medicmobile.org:8443/",
        "ssl-required": "external",
        "resource": "cht-client",
        "credentials": {
          "secret": "H9sE3aJJ2IFfLgu8CFykRDacfoWQWKov"
        },
        "confidential-port": 0
      }

      const keycloak = new Keycloak({ store: memoryStore }, keyClockConfig);

      app.use(session({
          secret: 'mymKWhjV<T=-*VW<;cC5Y6U-{F.ppK+])',
          resave: false,
          saveUninitialized: true,
          store: memoryStore
      }));
      app.use(keycloak.middleware());
      return keycloak;
    },
    chtLogin: async (req, res) => {
      try {
        const username = req.kauth.grant.access_token.content.preferred_username;

        const {user, password} = await ssoLogin(username);
        req.body = { user, password };

        const sessionRes = await validateSession(req);
        const redirectUrl = await setCookies(req, res, sessionRes);
        res.redirect(redirectUrl);
      } catch (err) {
        console.log('error during sso login: ', err);
        serverUtils.error(err, req, res);
      }
    }
}
 