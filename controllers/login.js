var fs = require('fs'),
    url = require('url'),
    path = require('path'),
    _ = require('underscore'),
    auth = require('../auth'),
    db = require('../db'),
    config = require('../config'),
    loginTemplate;

fs.readFile(
  path.join(__dirname, '..', 'templates', 'login', 'index.html'),
  { encoding: 'utf-8' },
  function(err, data) {
    if (err) {
      console.error('Could not find login page');
      throw err;
    }
    loginTemplate = _.template(data);
  }
);

var safePath = function(requested) {
  var safePrefix = path.join('/', db.settings.db, '_design', db.settings.ddoc, '_rewrite');
  var appPrefix = path.join(safePrefix, '/');

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

  if (requested.indexOf(safePrefix) !== 0) {
    // path is not relative to the couch app
    return appPrefix;
  }

  return requested;
};

module.exports = {
  safePath: safePath,
  get: function(req, res) {
    auth.getUserCtx(req, function(err) {
      var redirect = safePath(req.query.redirect);
      if (!err) {
        // already logged in
        res.redirect(redirect);
      } else {
        res.send(loginTemplate({
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
        }));
      }
    });
  }
};