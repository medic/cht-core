const fs = require('fs'),
      url = require('url'),
      path = require('path'),
      request = require('request'),
      _ = require('underscore'),
      auth = require('../auth'),
      db = require('../db'),
      config = require('../config'),
      SESSION_COOKIE_RE = /AuthSession\=([^;]*);/,
      ONE_YEAR = 31536000000,
      production = process.env.NODE_ENV === 'production';

let loginTemplate;

_.templateSettings = {
  escape: /\{\{(.+?)\}\}/g,
};

const safePath = requested => {
  const appPrefix = path.join('/', db.settings.db, '_design', db.settings.ddoc, '_rewrite');
  const dirPrefix = path.join(appPrefix, '/');

  if (!requested) {
    // no redirect path - return root
    return appPrefix;
  }

  try {
    requested = url.resolve('/', requested);
  } catch(e) {
    // invalid url - return the default
    return appPrefix;
  }

  const parsed = url.parse(requested);

  if (parsed.path !== appPrefix &&
      parsed.path.indexOf(dirPrefix) !== 0) {
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

const renderLogin = (redirect, callback) => {
  getLoginTemplate((err, template) => {
    if (err) {
      return callback(err);
    }
    const body = template({
      action: path.join('/', db.settings.db, 'login'),
      redirect: redirect,
      branding: {
        name: 'Medic Mobile'
      },
      translations: {
        login: config.translate('login'),
        loginerror: config.translate('login.error'),
        loginincorrect: config.translate('login.incorrect'),
        username: config.translate('User Name'),
        password: config.translate('Password')
      }
    });
    callback(null, body);
  });
};

const getSessionCookie = res => {
  return _.find(res.headers['set-cookie'], cookie =>
    cookie.indexOf('AuthSession') === 0
  );
};

const createSession = (req, callback) => {
  const user = req.body.user;
  const password = req.body.password;
  request.post({
    url: url.format({
      protocol: db.settings.protocol,
      hostname: db.settings.host,
      port: db.settings.port,
      pathname: '_session'
    }),
    json: true,
    body: { name: user, password: password },
    auth: { user: user, pass: password }
  }, callback);
};

const getCookieOptions = () => {
  return {
    sameSite: 'lax', // prevents the browser from sending this cookie along with cross-site requests
    secure: production // only transmit when requesting via https unless in development mode
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

const setCookies = (req, res, sessionRes) => {
  const sessionCookie = getSessionCookie(sessionRes);
  if (!sessionCookie) {
    res.status(401).json({ error: 'Not logged in' });
    return;
  }
  const options = { headers: { Cookie: sessionCookie } };
  auth.getUserCtx(options, (err, userCtx) => {
    if (err) {
      console.error('Error getting authCtx', err);
      res.status(401).json({ error: 'Error getting authCtx' });
      return;
    }
    setSessionCookie(res, sessionCookie);
    setUserCtxCookie(res, userCtx);
    res.json({ success: true });
  });
};

module.exports = {
  safePath: safePath,
  get: (req, res) => {
    auth.getUserCtx(req, (err, userCtx) => {
      const redirect = safePath(req.query.redirect);
      if (!err) {
        // already logged in
        setUserCtxCookie(res, userCtx);
        res.redirect(redirect);
        return;
      }
      renderLogin(redirect, (err, body) => {
        if (err) {
          console.error('Could not find login page');
          throw err;
        }
        res.send(body);
      });
    });
  },
  post: (req, res) => {
    createSession(req, (err, sessionRes) => {
      if (err) {
        console.error('Error logging in', err);
        res.status(500).json({ error: 'Unexpected error logging in' });
        return;
      }
      if (sessionRes.statusCode !== 200) {
        res.status(sessionRes.statusCode).json({ error: 'Not logged in' });
        return;
      }
      setCookies(req, res, sessionRes);
    });
  }
};
