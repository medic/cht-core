var db = require('./db'),
    pathPrefix = '/' + db.settings.db + '/';

module.exports = {
  notLoggedIn: function(req, res, showPrompt) {
    if (showPrompt) {
      // api access - basic auth allowed
      res.writeHead(401, {
        'Content-Type': 'text/plain',
        'WWW-Authenticate': 'Basic realm="Medic Mobile Web Services"'
      });
      res.end('not logged in');
    } else {
      // web access - redirect to login page
      res.redirect(301, pathPrefix + 'login?redirect=' + encodeURIComponent(req.url));
    }
  },

  error: function(err, req, res, showPrompt) {
    if (typeof err === 'string') {
      return module.exports.serverError(err, req, res);
    } else if (err.code === 500) {
      return module.exports.serverError(err.message, req, res);
    } else if (err.code === 401) {
      return module.exports.notLoggedIn(req, res, showPrompt);
    }
    res.writeHead((err.code || err.statusCode) || 500, {
      'Content-Type': 'text/plain'
    });
    res.end(err.message || err.reason);
  },

  serverError: function(err, req, res) {
    console.error('Server error: ');
    console.log('  detail: ' + (err.stack || JSON.stringify(err)));
    res.writeHead(500, {
      'Content-Type': 'text/plain'
    });
    if (err.message) {
      res.end('Server error: ' + err.message);
    } else if (typeof err === 'string') {
      res.end('Server error: ' + err);
    } else {
      res.end('Server error');
    }
  }
};
