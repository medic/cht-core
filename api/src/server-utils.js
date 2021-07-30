const url = require('url');
const path = require('path');
const environment = require('./environment');
const isClientHuman = require('./is-client-human');
const logger = require('./logger');
const request = require('request-promise-native');
const MEDIC_BASIC_AUTH = 'Basic realm="Medic Mobile Web Services"';

const wantsJSON = req => req.get('Accept') === 'application/json';

const writeJSON = (res, code, error, details) => {
  res.status(code);
  res.json({ code, error, details });
};

const DEFAULT_SECURITY_STRUCTURE = {
  names: [],
  roles: [],
};

const addRoleToSecurity = (dbname, role, addAsAdmin) => {
  const securityUrl = url.format({
    protocol: environment.protocol,
    hostname: environment.host,
    port: environment.port,
    pathname: `${dbname}/_security`,
  });
  const credentials = {
    user: environment.username,
    pass: environment.password
  };

  return request
    .get({ url: securityUrl, auth: credentials, json: true })
    .then(body => {
      // In CouchDB 1.x, if you have not written to the _security object before
      // it is empty.
      const property = addAsAdmin ? 'admins' : 'members';
      if (!body[property]) {
        body[property] = DEFAULT_SECURITY_STRUCTURE;
      }

      if (body[property].roles.includes(role)) {
        return;
      }

      logger.info(`Adding ${role} role to ${dbname} ${property}`);
      body[property].roles.push(role);
      return request.put({ url: securityUrl, auth: credentials, json: true, body });
    });
};

const respond = (req, res, code, message, details) => {
  if (wantsJSON(req)) {
    return writeJSON(res, code, message, details);
  }
  if (!res.headersSent) {
    res.writeHead(code, {
      'Content-Type': 'text/plain',
    });
  }
  if (message.message) {
    message = message.message;
  }
  if (typeof message !== 'string') {
    message = JSON.stringify(message);
  }
  if (details) {
    message += ': ' + JSON.stringify(details);
  }
  res.end(message);
};

const promptForBasicAuth = res => {
  res.writeHead(401, {
    'Content-Type': 'text/plain',
    'WWW-Authenticate': MEDIC_BASIC_AUTH,
  });
  res.end('not logged in');
};

module.exports = {
  MEDIC_BASIC_AUTH: MEDIC_BASIC_AUTH,

  /*
   * Attempts to determine the correct response given the error code.
   * Set showPrompt if this is a direct API call rather than from the webapp
   */
  error: (err, req, res, showPrompt) => {
    if (typeof err === 'string') {
      return module.exports.serverError(err, req, res);
    }
    // https://github.com/nodejs/node/issues/9027
    let code = err.code || err.statusCode || err.status || 500;
    if (!Number.isInteger(code)) {
      logger.warn(`Non-numeric error code: ${code}`);
      code = 500;
    }
    if (code === 401) {
      return module.exports.notLoggedIn(req, res, showPrompt);
    }
    if (code >= 500 && code < 600) {
      return module.exports.serverError(err, req, res);
    }
    respond(req, res, code, err.message || err.reason);
  },

  /**
   * The correct error handler to call when you know the error is
   * an authentication error.
   */
  notLoggedIn: (req, res, showPrompt) => {
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
      const redirectUrl = url.format({
        pathname: path.join('/', environment.db, 'login'),
        query: { redirect: req.url },
      });
      res.redirect(302, redirectUrl);
    } else {
      promptForBasicAuth(res);
    }
  },

  /**
   * Only to be used when handling unexpected errors.
   */
  serverError: (err, req, res) => {
    logger.error('Server error: %o', err);
    if (err.type === 'entity.too.large') {
      return respond(req, res, 413, 'Payload Too Large');
    }
    respond(req, res, 500, 'Server error', err.publicMessage);
  },

  emptyJSONBodyError: (req, res) => {
    const err = {
      code: 400,
      message: 'Request body is empty or Content-Type header was not set to application/json.',
    };
    return module.exports.error(err, req, res);
  },

  addRoleToSecurity,
};
