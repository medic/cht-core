const fs = require('fs'),
  { promisify } = require('util'),
  url = require('url'),
  path = require('path'),
  request = require('request'),
  _ = require('underscore'),
  auth = require('../auth'),
  environment = require('../environment'),
  config = require('../config'),
  SESSION_COOKIE_RE = /AuthSession\=([^;]*);/,
  ONE_YEAR = 31536000000,
  logger = require('../logger'),
  db = require('../db-pouch'),
  production = process.env.NODE_ENV === 'production';

let loginTemplate;

_.templateSettings = {
  escape: /\{\{(.+?)\}\}/g,
};

const safePath = requested => {
  const appPrefix = path.join('/', environment.db, '_design', environment.ddoc, '_rewrite');
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

const getLoginTemplate = () => {
  if (loginTemplate) {
    return Promise.resolve(loginTemplate);
  }
  const filepath = path.join(__dirname, '..', 'templates', 'login', 'index.html');
  return promisify(fs.readFile)(filepath, { encoding: 'utf-8' })
    .then(data => _.template(data));
};

const renderLogin = (redirect, branding) => {
  return getLoginTemplate().then(template => {
    return template({
      action: path.join('/', environment.db, 'login'),
      redirect: redirect,
      branding: branding,
      translations: {
        login: config.translate('login'),
        loginerror: config.translate('login.error'),
        loginincorrect: config.translate('login.incorrect'),
        loginoffline: config.translate('online.action.message'),
        username: config.translate('User Name'),
        password: config.translate('Password'),
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
  return new Promise((resolve, reject) => {
    request.post(
      {
        url: url.format({
          protocol: environment.protocol,
          hostname: environment.host,
          port: environment.port,
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
      res.json({ success: true });
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
  get: (req, res) => {
    const redirect = safePath(req.query.redirect);
    return auth
      .getUserCtx(req)
      .then(userCtx => {
        // already logged in
        setUserCtxCookie(res, userCtx);
        res.redirect(redirect);
      })
      .catch(() => {
        return getBranding()
          .then(branding => renderLogin(redirect, branding))
          .then(body => res.send(body))
          .catch(err => {
            logger.error('Could not find login page');
            throw err;
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
