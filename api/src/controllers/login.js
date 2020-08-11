const fs = require('fs');
const { promisify } = require('util');
const url = require('url');
const path = require('path');
const request = require('request-promise-native');
const _ = require('lodash');
const auth = require('../auth');
const environment = require('../environment');
const config = require('../config');
const users = require('../services/users');
const tokenLogin = require('../services/token-login');
const logger = require('../logger');
const db = require('../db');
const localeUtils = require('locale');
const cookie = require('../services/cookie');

const templates = {
  login: {
    content: null,
    file: 'index.html',
    translationStrings: [
      'login',
      'login.error',
      'login.incorrect',
      'online.action.message',
      'User Name',
      'Password'
    ],
  },
  tokenLogin: {
    content: null,
    file: 'token-login.html',
    translationStrings: [
      'login.token.missing',
      'login.token.expired',
      'login.token.invalid',
      'login.token.timeout',
      'login.token.general.error',
      'login.token.loading',
      'login.token.redirect.login.info',
      'login.token.redirect.login',
    ],
  },
};

const getHomeUrl = userCtx => {
  // https://github.com/medic/medic/issues/5035
  // For Test DB, always redirect to the application, the tests rely on the UI elements of application page
  if (auth.isOnlineOnly(userCtx) &&
      auth.hasAllPermissions(userCtx, 'can_configure') &&
      environment.db !== 'medic-test') {
    return '/admin/';
  }
  return '/';
};

const getRedirectUrl = (userCtx, requested) => {
  const root = getHomeUrl(userCtx);
  if (!requested) {
    return root;
  }
  try {
    requested = url.resolve('/', requested);
  } catch (e) {
    // invalid url - return the default
    return root;
  }
  const parsed = url.parse(requested);
  return parsed.path + (parsed.hash || '');
};

const getEnabledLocales = () => {
  const options = { key: ['translations', true], include_docs: true };
  return db.medic
    .query('medic-client/doc_by_type', options)
    .then(result => result.rows.map(row => ({ key: row.doc.code, label: row.doc.name })))
    .then(enabled => (enabled.length < 2) ? [] : enabled) // hide selector if only one option
    .catch(err => {
      logger.error('Error loading translations: %o', err);
      return [];
    });
};

const getTemplate = (page) => {
  if (templates[page].content) {
    return templates[page].content;
  }
  const filepath = path.join(__dirname, '..', 'templates', 'login', templates[page].file);
  templates[page].content = promisify(fs.readFile)(filepath, { encoding: 'utf-8' })
    .then(file => _.template(file));
  return templates[page].content;
};

const getTranslationsString = page => {
  const translationStrings = templates[page].translationStrings;
  return encodeURIComponent(JSON.stringify(config.getTranslationValues(translationStrings)));
};

const getBestLocaleCode = (acceptedLanguages, locales, defaultLocale) => {
  const headerLocales = new localeUtils.Locales(acceptedLanguages);
  const supportedLocales = new localeUtils.Locales(locales.map(locale => locale.key), defaultLocale);
  return headerLocales.best(supportedLocales).language;
};

const render = (page, req, branding, extras = {}) => {
  return Promise
    .all([
      getTemplate(page),
      getEnabledLocales(),
    ])
    .then(([ template, locales ]) => {
      const options = Object.assign(
        {
          branding: branding,
          locales: locales,
          defaultLocale: getBestLocaleCode(req.headers['accept-language'], locales, config.get('locale')),
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
    url: url.format({
      protocol: environment.protocol,
      hostname: environment.host,
      port: environment.port,
      pathname: '_session',
    }),
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

const updateUserLanguageIfRequired = (user, current, selected) => {
  if (current === selected) {
    return Promise.resolve();
  }
  return users.updateUser(user, { language: selected });
};

const setCookies = (req, res, sessionRes) => {
  const sessionCookie = getSessionCookie(sessionRes);
  if (!sessionCookie) {
    throw { status: 401, error: 'Not logged in' };
  }
  const options = { headers: { Cookie: sessionCookie } };
  return auth
    .getUserCtx(options)
    .then(userCtx => {
      cookie.setSession(res, sessionCookie);
      setUserCtxCookie(res, userCtx);
      // Delete login=force cookie
      res.clearCookie('login');
      return auth
        .getUserSettings(userCtx)
        .catch(err => {
          if (err.status === 404 && auth.isDbAdmin(userCtx)) {
            return users.createAdmin(userCtx).then(() => auth.getUserSettings(userCtx));
          }
          throw err;
        })
        .then(({ language }={}) => {
          const selectedLocale = req.body.locale
            || language
            || config.get('locale');
          cookie.setLocale(res, selectedLocale);
          return updateUserLanguageIfRequired(req.body.user, language, selectedLocale);
        })
        .then(() => getRedirectUrl(userCtx, req.body.redirect));
    })
    .catch(err => {
      logger.error(`Error getting authCtx %o`, err);
      throw { status: 401, error: 'Error getting authCtx' };
    });
};

const getInlineImage = (data, contentType) => `data:${contentType};base64,${data}`;

const getDefaultBranding = () => {
  const logoPath = path.join(__dirname, '..', 'resources', 'logo', 'medic-logo-light-full.svg');
  return promisify(fs.readFile)(logoPath, {}).then(logo => {
    const data = Buffer.from(logo).toString('base64');
    return {
      name: 'Medic Mobile',
      logo: getInlineImage(data, 'image/svg+xml')
    };
  });
};

const getBranding = () => {
  return db.medic.get('branding', {attachments: true})
    .then(doc => {
      const image = doc._attachments[doc.resources.logo];
      return {
        name: doc.title,
        logo: getInlineImage(image.data, image.content_type)
      };
    })
    .catch(err => {
      logger.warn('Could not find branding doc on CouchDB: %o', err);
      return getDefaultBranding();
    });
};

const renderTokenLogin = (req, res) => {
  return getBranding()
    .then(branding => render('tokenLogin', req, branding, { tokenUrl: req.url }))
    .then(body => res.send(body));
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
        req.body = { user, password };

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

module.exports = {
  get: (req, res, next) => {
    return getBranding()
      .then(branding => render('login', req, branding))
      .then(body => {
        res.setHeader(
          'Link',
          '</login/style.css>; rel=preload; as=style, '
          + '</login/script.js>; rel=preload; as=script'
        );
        res.send(body);
      })
      .catch(next);
  },
  post: (req, res) => {
    return createSession(req)
      .then(sessionRes => {
        if (sessionRes.statusCode !== 200) {
          res.status(sessionRes.statusCode).json({ error: 'Not logged in' });
          return;
        }
        return setCookies(req, res, sessionRes)
          .then(redirectUrl => res.status(302).send(redirectUrl))
          .catch(err => {
            if (err.status === 401) {
              return res.status(err.status).json({ error: err.error });
            }
            throw err;
          });
      })
      .catch(err => {
        logger.error('Error logging in: %o', err);
        res.status(500).json({ error: 'Unexpected error logging in' });
      });
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
  tokenPost: (req, res, next) => {
    return auth
      .getUserCtx(req)
      .then(userCtx => {
        return res.status(302).send(getRedirectUrl(userCtx));
      })
      .catch(err => {
        if (err.code === 401) {
          return loginByToken(req, res);
        }
        next(err);
      });
  },

  // exposed for testing
  _safePath: getRedirectUrl,
  _reset: () => {
    templates.login.content = null;
    templates.tokenLogin.content = null;
  },
};
