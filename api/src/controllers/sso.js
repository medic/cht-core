const logger = require('@medic/logger');
const environment = require('@medic/environment');
const sso = require('../services/sso-login');
const login = require('./login');

module.exports = {
  oidcLogin: async (req, res) => {
    req.body = { locale: 'en' };
    const currentUrl =  new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
    try {
      const auth = await sso.getIdToken(currentUrl);
      const cookie = await sso.getCookie(auth.user.username);
      const redirectUrl = await login.setCookies(req, res, null, cookie);
      res.redirect(redirectUrl);
    } catch (e) {
      logger.error(e);
      return login.sendLoginErrorResponse(e, res);
    }
  },
  oidcAuthorize: async (req, res) => {
    const redirectUrl = new URL(
      `/${environment.db}/login/oidc/get_token`,
      `${req.protocol}://${req.get('host')}`
    ).toString();

    try {
      const authUrl = await sso.getAuthorizationUrl(redirectUrl);
      res.redirect(301, authUrl.href);
    } catch (e) {
      logger.error(e);
      return login.sendLoginErrorResponse(e, res);
    }
  }
};
