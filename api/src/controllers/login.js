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
const SESSION_COOKIE_RE = /AuthSession=([^;]*);/;
const ONE_YEAR = 31536000000;
const logger = require('../logger');
const db = require('../db');
const production = process.env.NODE_ENV === 'production';

let loginTemplate;

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

const getLoginTemplate = () => {
  if (loginTemplate) {
    return loginTemplate;
  }
  const filepath = path.join(__dirname, '..', 'templates', 'login', 'index.html');
  loginTemplate = promisify(fs.readFile)(filepath, { encoding: 'utf-8' })
    .then(file => _.template(file));
  return loginTemplate;
};

const getTranslationsString = () => {
  return encodeURIComponent(JSON.stringify(config.getTranslationValues([
    'login',
    'login.error',
    'login.incorrect',
    'online.action.message',
    'User Name',
    'Password'
  ])));
};

const renderLogin = (req, branding) => {
  return Promise.all([
    getLoginTemplate(),
    getEnabledLocales()
  ])
    .then(([ template, locales ]) => {
      return template({
        branding: branding,
        defaultLocale: config.get('locale'),
        locales: locales,
        translations: getTranslationsString()
      });
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

const getCookieOptions = () => {
  return {
    sameSite: 'lax', // prevents the browser from sending this cookie along with some cross-site requests
    secure: production, // only transmit when requesting via https unless in development mode
  };
};

const setSessionCookie = (res, cookie) => {
  const sessionId = SESSION_COOKIE_RE.exec(cookie)[1];
  const options = getCookieOptions();
  options.httpOnly = true; // don't allow javascript access to stop xss
  res.cookie('AuthSession', sessionId, options);
};

const setUserCtxCookie = (res, userCtx) => {
  const options = getCookieOptions();
  options.maxAge = ONE_YEAR;
  const home = getHomeUrl(userCtx);
  let content;
  if (home === '/') {
    content = userCtx;
  } else {
    content = Object.assign({}, userCtx, { home });
  }
  res.cookie('userCtx', JSON.stringify(content), options);
};

const setLocaleCookie = (res, locale) => {
  const options = getCookieOptions();
  options.maxAge = ONE_YEAR;
  res.cookie('locale', locale, options);
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
    res.status(401).json({ error: 'Not logged in' });
    return;
  }
  const options = { headers: { Cookie: sessionCookie } };
  return auth
    .getUserCtx(options)
    .then(userCtx => {
      setSessionCookie(res, sessionCookie);
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
          setLocaleCookie(res, selectedLocale);
          return updateUserLanguageIfRequired(req.body.user, language, selectedLocale);
        })
        .then(() => {
          res.status(302).send(getRedirectUrl(userCtx, req.body.redirect));
        });
    })
    .catch(err => {
      logger.error(`Error getting authCtx %o`, err);
      res.status(401).json({ error: 'Error getting authCtx' });
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

module.exports = {
  get: (req, res, next) => {
    return getBranding()
      .then(branding => renderLogin(req, branding))
      .then(body => res.send(body))
      .catch(next);
  },
  post: (req, res) => {
    return createSession(req)
      .then(sessionRes => {
        if (sessionRes.statusCode !== 200) {
          res.status(sessionRes.statusCode).json({ error: 'Not logged in' });
          return;
        }
        return setCookies(req, res, sessionRes);
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
  // exposed for testing
  _safePath: getRedirectUrl,
  _reset: () => { loginTemplate = null; }
};
