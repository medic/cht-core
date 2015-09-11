var fs = require('fs'),
    url = require('url'),
    path = require('path'),
    request = require('request'),
    _ = require('underscore'),
    auth = require('../auth'),
    db = require('../db'),
    config = require('../config'),
    SESSION_COOKIE_RE = /AuthSession\=([^;]*);/,
    loginTemplate;

_.templateSettings = {
  escape: /\{\{(.+?)\}\}/g,
};

var safePath = function(requested) {
  var appPrefix = path.join('/', db.settings.db, '_design', db.settings.ddoc, '_rewrite');
  var dirPrefix = path.join(appPrefix, '/');
  var fragmentPrefix = appPrefix + '#';

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

  if (requested !== appPrefix &&
      requested.indexOf(dirPrefix) !== 0 &&
      requested.indexOf(fragmentPrefix) !== 0) {
    // path is not relative to the couch app
    return appPrefix;
  }

  return requested;
};

var getLoginTemplate = function(callback) {
  if (loginTemplate) {
    return callback(null, loginTemplate);
  }
  fs.readFile(
    path.join(__dirname, '..', 'templates', 'login', 'index.html'),
    { encoding: 'utf-8' },
    function(err, data) {
      if (err) {
        return callback(err);
      }
      loginTemplate = _.template(data);
      callback(null, loginTemplate);
    }
  );
};

var renderLogin = function(redirect, callback) {
  getLoginTemplate(function(err, template) {
    if (err) {
      return callback(err);
    }
    var body = template({
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

var getSessionCookie = function(res) {
  return _.find(res.headers['set-cookie'], function(cookie) {
    return cookie.indexOf('AuthSession') === 0;
  });
};

var createSession = function(req, callback) {
  var user = req.body.user;
  var password = req.body.password;
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

var setSessionCookie = function(res, cookie) {
  var sessionId = SESSION_COOKIE_RE.exec(cookie)[1];
  res.cookie('AuthSession', sessionId, { httpOnly: true });
};

var setUserCtxCookie = function(res, userCtx) {
  res.cookie('userCtx', JSON.stringify(userCtx));
};

var setCookies = function(res, sessionRes) {
  var sessionCookie = getSessionCookie(sessionRes);
  if (!sessionCookie) {
    res.status(401).json({ error: 'Not logged in' });
    return;
  }
  var options = { headers: { Cookie: sessionCookie } };
  auth.getUserCtx(options, function(err, userCtx) {
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
  get: function(req, res) {
    auth.getUserCtx(req, function(err, userCtx) {
      var redirect = safePath(req.query.redirect);
      if (!err) {
        // already logged in
        setUserCtxCookie(res, userCtx);
        res.redirect(redirect);
        return;
      }
      renderLogin(redirect, function(err, body) {
        if (err) {
          console.error('Could not find login page');
          throw err;
        }
        res.send(body);
      });
    });
  },
  post: function(req, res) {
    createSession(req, function(err, sessionRes) {
      if (err) {
        console.error('Error logging in', err);
        res.status(500).json({ error: 'Unexpected error logging in' });
        return;
      }
      if (sessionRes.statusCode !== 200) {
        res.status(sessionRes.statusCode).json({ error: 'Not logged in' });
        return;
      }
      setCookies(res, sessionRes);
    });
  }
};
