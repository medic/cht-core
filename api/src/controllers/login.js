const path = require('path');
const request = require('@medic/couch-request');
const _ = require('lodash');
const url = require('node:url');
const auth = require('../auth');
const environment = require('../environment');
const config = require('../config');
const privacyPolicy = require('../services/privacy-policy');
const logger = require('@medic/logger');
const db = require('../db');
const dataContext = require('../services/data-context');
const { tokenLogin, roles, users } = require('@medic/user-management')(config, db, dataContext);
const localeUtils = require('locale');
const cookie = require('../services/cookie');
const brandingService = require('../services/branding');
const translations = require('../translations');
const template = require('../services/template');
const rateLimitService = require('../services/rate-limit');
const serverUtils = require('../server-utils');

const templates = {
  login: {
    file: path.join(__dirname, '..', 'templates', 'login', 'index.html'),
    translationStrings: [
      'login',
      'login.error',
      'login.hide_password',
      'login.incorrect',
      'login.show_password',
      'login.unsupported_browser',
      'login.unsupported_browser.outdated_cht_android',
      'login.unsupported_browser.outdated_webview_apk',
      'login.unsupported_browser.outdated_browser',
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
    return url.resolve('/', requested);
  } catch (e) {
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
      privacyPolicy.exists()
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

const getSessionCookie = res => {
  return _.find(
    res.headers['set-cookie'],
    cookie => cookie.indexOf('AuthSession') === 0
  );
};

const createSession = req => {
  const user = req.body.user;
  const password = req.body.password;
  return request.post({
    url: new URL('/_session', environment.serverUrlNoAuth).toString(),
    json: true,
    resolveWithFullResponse: true,
    simple: false, // doesn't throw an error on non-200 responses
    body: { name: user, password: password },
    auth: { user: user, pass: password },
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

const setCookies = (req, res, sessionRes) => {
  const sessionCookie = getSessionCookie(sessionRes);
  if (!sessionCookie) {
    throw { status: 401, error: 'Not logged in' };
  }
  const options = { headers: { Cookie: sessionCookie } };
  return getUserCtxRetry(options)
    .then(userCtx => {
      cookie.setSession(res, sessionCookie);
      setUserCtxCookie(res, userCtx);
      // Delete login=force cookie
      res.clearCookie('login');

      return Promise.resolve()
        .then(() => {
          if (roles.isDbAdmin(userCtx)) {
            return users.createAdmin(userCtx);
          }
        })
        .then(() => {
          const selectedLocale = req.body.locale
            || config.get('locale');
          cookie.setLocale(res, selectedLocale);
          return getRedirectUrl(userCtx, req.body.redirect);
        });
    })
    .catch(err => {
      logger.error(`Error getting authCtx %o`, err);
      throw { status: 401, error: 'Error getting authCtx' };
    });
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
    throw err;
  }
};

const createSessionRetry = (req, retry=10) => {
  return createSession(req).then(sessionRes => {
    if (sessionRes.statusCode === 200) {
      return sessionRes;
    }

    if (retry > 0) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          createSessionRetry(req, retry - 1).then(resolve).catch(reject);
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
const loginByToken = (req, res) => {
  if (!tokenLogin.isTokenLoginEnabled()) {
    return res.status(400).json({ error: 'disabled', reason: 'Token login disabled' });
  }

  if (!req.params || !req.params.token) {
    return res.status(400).json({ error: 'missing', reason: 'Missing required param' });
  }

  return tokenLogin
    .getUserByToken(req.params.token)
    .then(userId => {
      if (!userId) {
        throw { status: 401, error: 'invalid' };
      }

      return tokenLogin.resetPassword(userId).then(({ user, password }) => {
        req.body = { user, password, locale: req.body.locale };

        return createSessionRetry(req)
          .then(sessionRes => setCookies(req, res, sessionRes))
          .then(redirectUrl => {
            return tokenLogin.deactivateTokenLogin(userId).then(() => res.status(302).send(redirectUrl));
          });
      });
    })
    .catch((err = {}) => {
      logger.error('Error while logging in with token', err);
      const status = err.status || err.code || 400;
      const message = err.error || err.message || 'Unexpected error logging in';
      res.status(status).json({ error: message });
    });
};

const renderLogin = (req) => {
  return render('login', req);
};

const login = async (req, res) => {
  try {
    const sessionRes = await createSession(req);
    if (sessionRes.statusCode !== 200) {
      res.status(sessionRes.statusCode).json({ error: 'Not logged in' });
    } else {
      const redirectUrl = await setCookies(req, res, sessionRes);
      res.status(302).send(redirectUrl);
    }
  } catch (e) {
    if (e.status === 401) {
      return res.status(401).json({ error: e.error });
    }
    logger.error('Error logging in: %o', e);
    res.status(500).json({ error: 'Unexpected error logging in' });
  }
};

module.exports = {
  renderLogin,

  get: (req, res, next) => {
    return renderLogin(req)
      .then(body => {
        res.setHeader(
          'Link',
          '</login/style.css>; rel=preload; as=style, '
          + '</login/script.js>; rel=preload; as=script, '
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
};
