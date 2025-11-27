const path = require('path');
const request = require('@medic/couch-request');
const url = require('node:url');
const auth = require('../auth');
const environment = require('@medic/environment');
const config = require('../config');
const privacyPolicy = require('../services/privacy-policy');
const logger = require('@medic/logger');
const db = require('../db');
const dataContext = require('../services/data-context');
const {
  tokenLogin, ssoLogin, roles, users, validatePassword
} = require('@medic/user-management')(config, db, dataContext);
const localeUtils = require('locale');
const cookie = require('../services/cookie');
const brandingService = require('../services/branding');
const translations = require('../translations');
const template = require('../services/template');
const rateLimitService = require('../services/rate-limit');
const serverUtils = require('../server-utils');
const sso = require('../services/sso-login');

const PASSWORD_RESET_URL = '/medic/password-reset';

const ERROR_KEY_MAPPING = {
  // Ignore Sonar false positive that these are hard-coded credentials.
  // These are css error classes for password reset html
  'password.weak': 'password-weak', //NoSONAR
  'password.length.minimum': 'password-short', //NoSONAR
  'password.current.incorrect': 'current-password-incorrect', //NoSONAR
  'password.same': 'password-same', //NoSONAR
  'fields.required': 'fields-required', //NoSONAR
};

const templates = {
  login: {
    file: path.join(__dirname, '..', 'templates', 'login', 'index.html'),
    translationStrings: [
      'login',
      'login.error',
      'login.hide_password',
      'login.incorrect',
      'login.show_password',
      'login.sso',
      'login.sso.user_invalid',
      'login.unsupported_browser',
      'login.unsupported_browser.outdated_cht_android',
      'login.unsupported_browser.outdated_webview_apk',
      'login.unsupported_browser.outdated_browser',
      'login.unsupported_browser.safari',
      'online.action.message',
      'User Name',
      'Password',
      'privacy.policy'
    ],
  },
  tokenLogin: {
    file: path.join(__dirname, '..', 'templates', 'login', 'token-login.html'),
    translationStrings: [
      'login.token.missing',
      'login.token.expired',
      'login.token.invalid',
      'login.token.timeout',
      'login.token.general.error',
      'login.token.loading',
      'login.token.redirect.login.info',
      'login.token.redirect.login',
      'privacy.policy'
    ],
  },
  passwordReset: {
    file: path.join(__dirname, '..', 'templates', 'login', 'password-reset.html'),
    translationStrings: [
      'login.show_password',
      'login.hide_password',
      'change.password.title',
      'change.password.hint',
      'change.password.submit',
      'change.password.new.password',
      'change.password.confirm.password',
      'password.weak',
      'password.length.minimum',
      'password.must.match',
      'user.password.current',
      'password.current.incorrect',
      'password.same',
      'fields.required'
    ],
  }
};

const skipPasswordChange = (user) => {
  return !user?.password_change_required;
};

const getHomeUrl = userCtx => {
  // https://github.com/medic/medic/issues/5035
  // For Test DB, always redirect to the application, the tests rely on the UI elements of application page
  if (roles.isOnlineOnly(userCtx) &&
      auth.hasAllPermissions(userCtx, 'can_configure') &&
      !environment.isTesting) {
    return '/admin/';
  }
  return '/';
};

const hasDoubleSlash = (path) => {
  const decoded = decodeURIComponent(path);
  if (decoded.length !== path.length) {
    // it was encoded - check if it's double encoded
    return hasDoubleSlash(decoded);
  }
  return /\/\//g.test(decoded);
};

const resolveUrl = (requested) => {
  try {
    const resolvedUrl = new URL(requested, new URL('/', 'resolve://'));
    if (resolvedUrl.protocol === 'resolve:') {
      const { pathname, search, hash } = resolvedUrl;
      return pathname + search + hash;
    }
    return resolvedUrl.toString();
  } catch {
    // invalid url
    return;
  }
};

const sanitizeRequestedRedirect = (requested) => {
  const resolved = resolveUrl(requested);
  if (!resolved) {
    return;
  }
  const parsed = new URL(resolved, 'resolve://');
  const path = parsed.pathname + (parsed.hash || '');
  if (hasDoubleSlash(path)) {
    // double slash can be abused to redirect to another host
    // https://github.com/medic/cht-core/issues/9122
    return;
  }
  return path;
};

const getRedirectUrl = (userCtx, requested) => {
  if (requested) {
    const redirect = sanitizeRequestedRedirect(requested);
    if (redirect) {
      return redirect;
    }
  }
  return getHomeUrl(userCtx);
};

const getEnabledLocales = () => {
  return translations
    .getEnabledLocales()
    .then(docs => {
      const enabledLocales = docs.map(doc => ({ key: doc.code, label: doc.name }));
      return enabledLocales.length < 2 ? [] : enabledLocales; // hide selector if only one option
    })
    .catch(err => {
      logger.error('Error loading translations: %o', err);
      return [];
    });
};

const getTemplate = (page) => {
  return template.getTemplate(templates[page].file);
};

const getTranslationsString = page => {
  const translationStrings = templates[page].translationStrings;
  return encodeURIComponent(JSON.stringify(config.getTranslations(translationStrings)));
};

const getBestLocaleCode = (acceptedLanguages, locales, defaultLocale) => {
  const headerLocales = new localeUtils.Locales(acceptedLanguages);
  const supportedLocales = new localeUtils.Locales(locales.map(locale => locale.key), defaultLocale);
  return headerLocales.best(supportedLocales).language;
};

const render = (page, req, extras = {}) => {
  const acceptLanguageHeader = req && req.locale;
  return Promise
    .all([
      getTemplate(page),
      getEnabledLocales(),
      brandingService.get(),
      privacyPolicy.exists(),
    ])
    .then(([ template, locales, branding, hasPrivacyPolicy ]) => {
      const options = Object.assign(
        {
          branding,
          locales,
          hasPrivacyPolicy,
          defaultLocale: getBestLocaleCode(acceptLanguageHeader, locales, config.get('locale')),
          translations: getTranslationsString(page)
        },
        extras
      );
      return template(options);
    });
};

const unauthorizedError = (message) => {
  const error = new Error(message);
  error.status = 401;
  return error;
};

const getSessionCookie = res => {
  const sessionCookie = res.headers.getSetCookie().find(cookie => cookie.indexOf('AuthSession') === 0);
  if (!sessionCookie) {
    throw unauthorizedError('Not logged in');
  }
  return sessionCookie;
};

const createSession = req => {
  const user = req.body.user;
  const password = req.body.password;

  return request.post({
    url: new URL('/_session', environment.serverUrlNoAuth).toString(),
    json: true,
    simple: false, // doesn't throw an error on non-200 responses
    body: { name: user, password: password },
    auth: { username: user, password: password },
  });
};

const setUserCtxCookie = (res, userCtx) => {
  const home = getHomeUrl(userCtx);
  let content;
  if (home === '/') {
    content = userCtx;
  } else {
    content = Object.assign({}, userCtx, { home });
  }
  cookie.setUserCtx(res, JSON.stringify(content));
};

const isOidcUser = (userDoc) => userDoc?.oidc_username && ssoLogin.isSsoLoginEnabled();

const setCookies = async (req, res, sessionCookie) => {
  const options = { headers: { Cookie: sessionCookie } };
  const userCtx = await getUserCtxRetry(options);
  if (roles.isDbAdmin(userCtx)) {
    await users.createAdmin(userCtx);
  }

  const userDoc = await users.getUserDoc(userCtx.name);
  if (isOidcUser(userDoc)) {
    throw unauthorizedError('Password Login Not Permitted For SSO Users');
  }
  if (!skipPasswordChange(userDoc)) {
    return redirectToPasswordReset(req, res, userCtx);
  }

  return redirectToApp({ req, res, sessionCookie, userCtx });
};

const redirectToApp = async ({ req, res, sessionCookie, userCtx }) => {
  cookie.setSession(res, sessionCookie);
  setUserCtxCookie(res, userCtx);
  cookie.clearCookie(res, 'login');
  setUserLocale(req, res);
  return getRedirectUrl(userCtx, req.body.redirect);
};

const redirectToPasswordReset = (req, res, userCtx) => {
  setUserCtxCookie(res, userCtx);
  setUserLocale(req, res);
  return PASSWORD_RESET_URL;
};

const setUserLocale = (req, res) => {
  const selectedLocale = req.body.locale || config.get('locale');
  cookie.setLocale(res, selectedLocale);
};

const renderTokenLogin = (req, res) => {
  return render('tokenLogin', req, { tokenUrl: req.url })
    .then(body => res.send(body));
};

const getUserCtxRetry = async (options, retry = 10) => {
  try {
    return await auth.getUserCtx(options);
  } catch (err) {
    // in a clustered setup, requesting session immediately after changing a password might 401
    if (retry > 0 && err && err.code === 401) {
      await new Promise(r => setTimeout(r, 10));
      return getUserCtxRetry(options, --retry);
    }

    logger.error(`Error getting authCtx %o`, err);
    throw unauthorizedError('Error getting authCtx');
  }
};

const createSessionCookieRetry = (req, retry=10) => {
  return createSession(req).then(sessionRes => {
    if (sessionRes.status === 200) {
      return getSessionCookie(sessionRes);
    }

    if (retry > 0) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          createSessionCookieRetry(req, retry - 1).then(resolve).catch(reject);
        }, 10);
      });
    }

    throw { status: 408, message: 'Login failed after 10 retries' };
  });
};

/**
 * Generates a session cookie for a user identified by supplied token and hash request params.
 * The user's password is reset in the process.
 */
const loginByToken = async (req, res) => {
  if (!tokenLogin.isTokenLoginEnabled()) {
    return res.status(400).json({ error: 'disabled', reason: 'Token login disabled' });
  }

  if (!req.params || !req.params.token) {
    return res.status(400).json({ error: 'missing', reason: 'Missing required param' });
  }

  try {
    const userId = await tokenLogin.getUserByToken(req.params.token);
    if (!userId) {
      return res.status(401).json({ error: 'invalid'});
    }

    const { user, password } = await tokenLogin.resetPassword(userId);
    req.body = { user, password, locale: req.body.locale };

    const sessionCookie = await createSessionCookieRetry(req);
    const redirectUrl = await setCookies(req, res, sessionCookie);

    await tokenLogin.deactivateTokenLogin(userId);
    return res.status(302).send(redirectUrl);
  } catch (err) {
    logger.error('Error while logging in with token', err);
    const status = err.status || err.code || 400;
    const message = err.error || err.message || 'Unexpected error logging in';
    res.status(status).json({ error: message });
  }
};

const renderLogin = async (req) => render('login', req, {
  hasOidcProvider: ssoLogin.isSsoLoginEnabled()
});

const renderPasswordReset = (req) => {
  return render('passwordReset', req);
};

const validatePasswordReset = (password) => {
  const error = validatePassword(password);

  if (!error) {
    return { isValid: true };
  }

  return {
    isValid: false,
    error: ERROR_KEY_MAPPING[error.message.translationKey],
    params: error.message.translationParams
  };
};

const validateSession = async (req) => {
  const sessionRes = await createSession(req);
  if (sessionRes.status !== 200) {
    const error = new Error('Not logged in');
    error.status = sessionRes.status;
    error.error = 'Not logged in';
    throw error;
  }
  return getSessionCookie(sessionRes);
};

const sendLoginErrorResponse = (e, res) => {
  if (e.status === 401 || e.status === 400) {
    return res.status(e.status).json({ error: e.error || e.message });
  }
  logger.error('Error logging in: %o', e);
  return res.status(500).json({ error: 'Unexpected error logging in' });
};

const login = async (req, res) => {
  try {
    const sessionCookie = await validateSession(req);
    const redirectUrl = await setCookies(req, res, sessionCookie);
    res.status(302).send(redirectUrl);
  } catch (e) {
    return sendLoginErrorResponse(e, res);
  }
};

const updatePassword = (user, newPassword) => {
  const updateData = {
    password: newPassword,
    password_change_required: false,
  };
  return users.updateUser(user.name, updateData, true);
};

const validateCurrentPassword = async (username, currentPassword, newPassword) => {
  try {
    await request.get({
      url: new URL('/_session', environment.serverUrlNoAuth).toString(),
      json: true,
      auth: { username: username, password: currentPassword },
    });

    if (currentPassword === newPassword) {
      return {
        isValid: false,
        error: ERROR_KEY_MAPPING['password.same'],
      };
    }
    return { isValid: true };
  } catch (err) {
    if (err.status === 401) {
      return {
        isValid: false,
        error: ERROR_KEY_MAPPING['password.current.incorrect'],
      };
    }
    throw err;
  }
};

const passwordResetValidation = async (username, currentPassword, password) => {
  const validation = validatePasswordReset(password);
  if (!validation.isValid) {
    return {
      status: 400,
      ...validation,
    };
  }

  const currentPasswordValidation = await validateCurrentPassword(username, currentPassword, password);
  if (!currentPasswordValidation.isValid) {
    return {
      status: 400,
      ...currentPasswordValidation,
    };
  }

  return { isValid: true };
};

const getAppUrl = () => {
  const appUrl = config.get('app_url');
  if (!appUrl) {
    throw new Error('The app_url value is not configured.');
  }

  return appUrl.replace(/\/+$/, '');
};

module.exports = {
  renderLogin,
  renderPasswordReset,

  get: (req, res, next) => {
    return renderLogin(req)
      .then(body => {
        res.setHeader(
          'Link',
          '</login/style.css>; rel=preload; as=style, '
          + '</login/script.js>; rel=preload; as=script, '
          + '</login/auth-utils.js>; rel=preload; as=script, '
          + '</login/lib-bowser.js>; rel=preload; as=script'
        );
        res.send(body);
      })
      .catch(next);
  },
  post: async (req, res) => {
    const limited = await rateLimitService.isLimited(req);
    if (limited) {
      return serverUtils.rateLimited(req, res);
    }
    await login(req, res);
  },
  getIdentity: (req, res) => {
    res.type('application/json');
    return auth
      .getUserCtx(req)
      .then(userCtx => {
        setUserCtxCookie(res, userCtx);
        res.send({ success: true });
      })
      .catch(() => {
        res.status(401);
        return res.send();
      });
  },

  getPasswordReset: (req, res, next) => {
    return renderPasswordReset(req)
      .then(body => {
        res.setHeader(
          'Link',
          '</login/style.css>; rel=preload; as=style, '
          + '</login/auth-utils.js>; rel=preload; as=script, '
          + '</login/password-reset.js>; rel=preload; as=script'
        );
        res.send(body);
      })
      .catch(next);
  },
  resetPassword: async (req, res) => {
    const limited = await rateLimitService.isLimited(req);
    if (limited) {
      return serverUtils.rateLimited(req, res);
    }

    try {
      const { username, currentPassword, password, locale } = req.body;
      const validationResult = await passwordResetValidation(username, currentPassword, password);
      if (!validationResult.isValid) {
        return res.status(validationResult.status).json({
          error: validationResult.error,
          params: validationResult.params
        });
      }

      const userDoc = await users.getUserDoc(username);
      if (isOidcUser(userDoc)) {
        const error = new Error('Password Reset Not Permitted For SSO Users');
        error.status = 400;
        throw error;
      }
      await updatePassword(userDoc, password);

      req.body = { user: username, password, locale };
      const sessionCookie = await createSessionCookieRetry(req);
      const redirectUrl = await setCookies(req, res, sessionCookie);
      return res.status(302).send(redirectUrl);
    } catch (err) {
      logger.error('Error updating password: %o', err);
      const status = err.status || 500;
      res.status(status).json({ error: err.error || err.message || 'Error updating password' });
    }
  },
  tokenGet: (req, res, next) => renderTokenLogin(req, res).catch(next),
  tokenPost: async (req, res, next) => {
    const limited = await rateLimitService.isLimited(req);
    if (limited) {
      return serverUtils.rateLimited(req, res);
    }
    try {
      const userCtx = await auth.getUserCtx(req);
      return res.status(302).send(getRedirectUrl(userCtx));
    } catch (e) {
      if (e.code === 401) {
        return loginByToken(req, res);
      }
      next(e);
    }
  },
  oidcLogin: async (req, res) => {
    const limited = await rateLimitService.isLimited(req);
    if (limited) {
      return serverUtils.rateLimited(req, res);
    }
    try {
      const currentUrl =  new URL(`${getAppUrl()}${req.originalUrl}`);
      const { username, locale } = await sso.getIdToken(currentUrl);
      const sessionCookie = await sso.getCookie(username);
      req.body = { locale };

      const options = { headers: { Cookie: sessionCookie } };
      const userCtx = await getUserCtxRetry(options);
      const redirectUrl = await redirectToApp({ req, res, sessionCookie, userCtx });
      res.status(302).redirect(redirectUrl);
    } catch (e) {
      logger.error('Error logging in via SSO: %o', e);
      const redirectUrl = url.format({
        pathname: path.join('/', environment.db, 'login'),
        query: { sso_error: e.status === 401 ? 'ssouserinvalid' : 'loginerror' }
      });
      res.status(302).redirect(redirectUrl);
    }
  },
  oidcAuthorize: async (req, res) => {
    const limited = await rateLimitService.isLimited(req);
    if (limited) {
      return serverUtils.rateLimited(req, res);
    }

    try {
      const redirectUrl = new URL(`${getAppUrl()}/${environment.db}/login/oidc`);
      const authUrl = await sso.getAuthorizationUrl(redirectUrl.toString());
      res.status(302).send(authUrl.href);
    } catch (e) {
      logger.error('Error getting authorization redirect url for SSO: %o', e);
      return serverUtils.error(e, req, res);
    }
  },
};
