var url = require('url'),
    path = require('path'),
    db = require('./db'),
    isClientHuman = require('./is-client-human'),
    MEDIC_BASIC_AUTH = 'Basic realm="Medic Mobile Web Services"';

var wantsJSON = function(req) {
  return req.get('Accept') === 'application/json';
};

var writeJSON = function(res, code, message, details) {
  res.status(code);
  res.json({
    code: code,
    error: message,
    details: details
  });
};

var respond = function(req, res, code, message, details) {
  if (wantsJSON(req)) {
    return writeJSON(res, code, message, details);
  }
  res.writeHead(code, {
    'Content-Type': 'text/plain'
  });
  if (details) {
    message += ': ' + JSON.stringify(details);
  }
  res.end(message);
};

const promptForBasicAuth = (res) => {
  res.writeHead(401, {
    'Content-Type': 'text/plain',
    'WWW-Authenticate': MEDIC_BASIC_AUTH
  });
  res.end('not logged in');
};

module.exports = {

  /*
   * Attempts to determine the correct response given the error code.
   * Set showPrompt if this is a direct API call rather than from the webapp
   */
  error: function(err, req, res, showPrompt) {
    if (typeof err === 'string') {
      return module.exports.serverError(err, req, res);
    }
    var code = err.code || err.statusCode || 500;
    if (code === 401) {
      return module.exports.notLoggedIn(req, res, showPrompt);
    }
    if (code === 500) {
      return module.exports.serverError(err, req, res);
    }
    respond(req, res, code, err.message || err.reason);
  },

  /**
   * The correct error handler to call when you know the error is
   * an authentication error.
   */
  notLoggedIn: function(req, res, showPrompt) {
    if (showPrompt) {
      // api access - basic auth allowed
      promptForBasicAuth(res);
      return;
    }
    if (wantsJSON(req)) {
      // couch request - respond with JSON error
      return writeJSON(res, 401, 'unauthorized');
    }
    // web access - redirect humans to login page; prompt others for basic auth
    if (isClientHuman(req)) {
      var redirectUrl = url.format({
        pathname: path.join('/', db.settings.db, 'login'),
        query: { redirect: req.url }
      });
      res.redirect(301, redirectUrl);
    } else {
      promptForBasicAuth(res);
    }
  },

  /**
   * Only to be used when handling unexpected errors.
   */
  serverError: function(err, req, res) {
    console.error('Server error:\n', err);
    respond(req, res, 500, 'Server error');
  }
};
