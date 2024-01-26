const util = require('node:util');
const { Headers } = require('node-fetch');

const sessionCookieName = 'AuthSession';
const cookieRegex = new RegExp(`${sessionCookieName}=(.*)`);
const sessions = {};

const parseCookie = (response) => {
  const cookie = response.headers.get('set-cookie');
  if (!cookie) {
    return;
  }

  // Unfortunately, node-fetch doesn't handle multiple cookies
  // https://github.com/node-fetch/node-fetch/issues/251
  // AuthSession=YWRtaW46NjU5RDRFMzI6Qi5U7t5gHQMn4MgOYkEAX2qH5HZUpn6nKdX8Ik7gDpY; Version=1; Expires=Wed,
  // 08-Jan-2025 13:46:26 GMT; Max-Age=31536000; Path=/; HttpOnly

  const matches = cookie.match(cookieRegex);
  if (!matches) {
    return;
  }

  const parts = matches[1].split(';').map(item => item.trim().split('='));
  const session = {
    token: parts[0][0],
    expires: new Date(parts.find(part => part[0] === 'Expires')[1]).valueOf(),
  };

  return session;
};

const getExistingSession = (db) => {
  const url = new URL(db.name);
  url.pathname = '/_session';
  const urlString = url.toString();
  if (sessions[urlString] && !isExpired(sessions[urlString])) {
    return sessions[urlString];
  }
};

const getSessionUrl = (db) => {
  const url = new URL(db.name);
  url.pathname = '/_session';
  return url.toString();
};

const authenticate = async (db) => {
  const url = getSessionUrl(db);

  const authString = `${db.credentials.username}:${db.credentials.password}`;
  const token = btoa(decodeURIComponent(encodeURIComponent(authString)));
  const headers = new Headers();
  headers.set('Authorization', 'Basic ' + token);
  headers.set('Content-Type', 'application/json');

  const body = JSON.stringify({ name: db.credentials.username, password: db.credentials.password});

  const response = await db.originalFetch(url.toString(), { method: 'POST', headers, body });
  updateSession(db, response);
};

const updateSession = (db, response) => {
  const session = parseCookie(response);
  if (session) {
    const url = getSessionUrl(db);
    sessions[url] = session;
  }
};

const invalidateSession = db => {
  const url = getSessionUrl(db);
  delete sessions[url];
};

const isExpired = (session) => Date.now() > session.expires;

const extractAuth = (opts) => {
  if (opts.auth) {
    opts.credentials = opts.auth;
    delete opts.auth;
  }

  const url = new URL(opts.name);
  if (!url.username) {
    return;
  }

  opts.credentials = {
    username: url.username,
    password: url.password
  };

  url.username = url.password = '';
  opts.name = url.toString();
};

// eslint-disable-next-line func-style
function wrapAdapter (PouchDB, HttpPouch) {
  // eslint-disable-next-line func-style
  function HttpSessionPouch(db, callback) {
    extractAuth(db);
    if (!db.credentials) {
      HttpPouch.call(this, db, callback);
      return;
    }

    db.originalFetch = db.fetch || PouchDB.fetch;
    db.fetch = async (url, opts) => {
      let session = getExistingSession(db);
      if (!session) {
        await authenticate(db);
        session = getExistingSession(db);
      }

      opts.headers.set(sessionCookieName, session.token);

      const response = await db.originalFetch(url, opts);
      if (response.status === 401 && session) {
        invalidateSession(db);
        return db.fetch(url, opts);
      }

      updateSession(db, response);
      return response;
    };

    HttpPouch.call(this, db, callback);
  }
  HttpSessionPouch.valid = () => true;

  util.inherits(HttpSessionPouch, HttpPouch);
  return HttpSessionPouch;
}

module.exports = function (PouchDB) {
  PouchDB.adapters.http = wrapAdapter(PouchDB, PouchDB.adapters.http);
  PouchDB.adapters.https = wrapAdapter(PouchDB, PouchDB.adapters.https);
};
