const fs = require('fs'),
  { promisify } = require('util'),
  url = require('url'),
  path = require('path'),
  request = require('request-promise-native'),
  _ = require('underscore'),
  auth = require('../auth'),
  environment = require('../environment'),
  config = require('../config'),
  cookie = require('../services/cookie'),
  logger = require('../logger'),
  db = require('../db');

let loginTemplate;

_.templateSettings = {
  escape: /\{\{(.+?)\}\}/g,
};

const safePath = requested => {
  const root = '/';

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

const getLoginTemplate = () => {
  if (loginTemplate) {
    return Promise.resolve(loginTemplate);
  }
  const filepath = path.join(__dirname, '..', 'templates', 'login', 'index.html');
  return promisify(fs.readFile)(filepath, { encoding: 'utf-8' })
    .then(data => _.template(data));
};

const renderLogin = (req, redirect, branding) => {
  const locale = cookie.get(req, 'locale');
  return getLoginTemplate().then(template => {
    return template({
      action: '/medic/login',
      redirect: redirect,
      branding: branding,
      translations: {
        login: config.translate('login', locale),
        loginerror: config.translate('login.error', locale),
        loginincorrect: config.translate('login.incorrect', locale),
        loginoffline: config.translate('online.action.message', locale),
        username: config.translate('User Name', locale),
        password: config.translate('Password', locale),
      },
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

const setUserCtxCookie = (res, userCtx) => {
  cookie.setUserCtx(res, JSON.stringify(userCtx));
};

const getRedirectUrl = userCtx => {
  // https://github.com/medic/medic/issues/5035
  // For Test DB, always redirect to the application, the tests rely on the UI elements of application page
  if (auth.isOnlineOnly(userCtx) &&
      auth.hasAllPermissions(userCtx, 'can_configure') &&
      environment.db !== 'medic-test') {
    return '/admin/';
  }
  return '/';
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
      cookie.setSession(res, sessionCookie);
      setUserCtxCookie(res, userCtx);
      // Delete login=force cookie
      res.clearCookie('login');
      return auth.getUserSettings(userCtx).then(({ language }={}) => {
        if (language) {
          cookie.setLocale(res, language);
        }
        res.status(302).send(getRedirectUrl(userCtx));
      });
    })
    .catch(err => {
      logger.error(`Error getting authCtx ${err}`);
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
  safePath: safePath,
  get: (req, res, next) => {
    const redirect = safePath(req.query.redirect);
    return auth
      .getUserCtx(req)
      .then(userCtx => {
        // already logged in
        setUserCtxCookie(res, userCtx);
        var hasForceLoginCookie = cookie.get(req, 'login') === 'force';
        if (hasForceLoginCookie) {
          throw new Error('Force login');
        }
        res.redirect(redirect);
      })
      .catch(() => {
        return getBranding()
          .then(branding => renderLogin(req, redirect, branding))
          .then(body => res.send(body))
          .catch(next);
      });
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
};
