const fs = require('fs'),
  url = require('url'),
  path = require('path'),
  request = require('request'),
  _ = require('underscore'),
  auth = require('../auth'),
  db = require('../db-nano'),
  config = require('../config'),
  cookie = require('../services/cookie'),
  SESSION_COOKIE_RE = /AuthSession\=([^;]*);/,
  ONE_YEAR = 31536000000,
  logger = require('../logger'),
  production = process.env.NODE_ENV === 'production';

let loginTemplate;

_.templateSettings = {
  escape: /\{\{(.+?)\}\}/g,
};

const safePath = requested => {
  const appPrefix = path.join(
    '/',
    db.settings.db,
    '_design',
    db.settings.ddoc,
    '_rewrite'
  );
  const dirPrefix = path.join(appPrefix, '/');

  if (!requested) {
    // no redirect path - return root
    return appPrefix;
  }

  try {
    requested = url.resolve('/', requested);
  } catch (e) {
    // invalid url - return the default
    return appPrefix;
  }

  const parsed = url.parse(requested);

  if (parsed.path !== appPrefix && parsed.path.indexOf(dirPrefix) !== 0) {
    // path is not relative to the couch app
    return appPrefix;
  }

  return parsed.path + (parsed.hash || '');
};

const getLoginTemplate = callback => {
  if (loginTemplate) {
    return callback(null, loginTemplate);
  }
  fs.readFile(
    path.join(__dirname, '..', 'templates', 'login', 'index.html'),
    { encoding: 'utf-8' },
    (err, data) => {
      if (err) {
        return callback(err);
      }
      loginTemplate = _.template(data);
      callback(null, loginTemplate);
    }
  );
};

const renderLogin = (req, redirect, callback) => {
  const locale = cookie.get(req, 'locale');
  getLoginTemplate((err, template) => {
    if (err) {
      return callback(err);
    }
    const body = template({
      action: path.join('/', db.settings.db, 'login'),
      redirect: redirect,
      branding: {
        name: 'Medic Mobile',
      },
      translations: {
        login: config.translate('login', locale),
        loginerror: config.translate('login.error', locale),
        loginincorrect: config.translate('login.incorrect', locale),
        loginoffline: config.translate('online.action.message', locale),
        username: config.translate('User Name', locale),
        password: config.translate('Password', locale),
      },
    });
    callback(null, body);
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
  return new Promise((resolve, reject) => {
    request.post(
      {
        url: url.format({
          protocol: db.settings.protocol,
          hostname: db.settings.host,
          port: db.settings.port,
          pathname: '_session',
        }),
        json: true,
        body: { name: user, password: password },
        auth: { user: user, pass: password },
      },
      (err, sessionRes) => {
        if (err) {
          return reject(err);
        }
        resolve(sessionRes);
      }
    );
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
  res.cookie('userCtx', JSON.stringify(userCtx), options);
};

const setLocaleCookie = (res, locale) => {
  const options = getCookieOptions();
  options.maxAge = ONE_YEAR;
  res.cookie('locale', locale, options);
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
      return auth.getUserSettings(userCtx).then(settings => {
        setLocaleCookie(res, settings.language);
        res.json({ success: true });
      });
    })
    .catch(err => {
      logger.error(`Error getting authCtx ${err}`);
      res.status(401).json({ error: 'Error getting authCtx' });
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
        res.redirect(redirect);
      })
      .catch(() => {
        renderLogin(req, redirect, (err, body) => {
          if (err) {
            logger.error('Could not find login page');
            return next(err);
          }
          res.send(body);
        });
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
