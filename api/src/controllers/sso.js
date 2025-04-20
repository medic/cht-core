const logger = require('@medic/logger');
const environment = require('@medic/environment');
const { getAuthorizationUrl, getIdToken, getCookie } = require('../services/sso-login');
const { setCookies, sendLoginErrorResponse } = require('./login');

module.exports = {
  oidcLogin: async (req, res) => {
    req.body = { locale: 'en' };
    const currentUrl =  new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
    try {
      const auth = await getIdToken(currentUrl);
      const cookie = await getCookie(auth.user.username);
      const redirectUrl = await setCookies(req, res, null, cookie);
      res.redirect(redirectUrl);
    } catch (e) {
      logger.error(e);
      return sendLoginErrorResponse(e, res);
    }
  },
  oidcAuthorize: async (req, res) => {
    const redirectUrl = new URL(
      `/${environment.db}/login/oidc/get_token`,
      `${req.protocol}://${req.get('host')}`
    ).toString();

    const authUrl = await getAuthorizationUrl(redirectUrl);
    res.redirect(301, authUrl.href);
  }
};
