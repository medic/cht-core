const util = require('node:util');
const { Headers } = require('node-fetch');

const sessionCookieName = 'AuthSession';
const cookieRegex = new RegExp(`${sessionCookieName}=(.*)`);

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

const getSession = async (opts) => {
  const url = new URL(opts.name);
  url.pathname = '/_session';

  const authString = `${opts.credentials.username}:${opts.credentials.password}`;
  const token = btoa(decodeURIComponent(encodeURIComponent(authString)));
  const headers = new Headers();
  headers.set('Authorization', 'Basic ' + token);
  headers.set('Content-Type', 'application/json');

  const body = JSON.stringify({ name: opts.credentials.username, password: opts.credentials.password});

  const response = await opts.originalFetch(url.toString(), { method: 'POST', headers, body });
  updateSession(opts, response);
};

const updateSession = (db, response) => {
  const session = parseCookie(response);
  if (session) {
    db.session = session;
  }
};

const isExpired = (session) => Date.now() > session.expires;

const extractAuth = (opts) => {
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
function wrapAdapter (HttpPouch) {
  // eslint-disable-next-line func-style
  function HttpSessionPouch(db, callback) {
    extractAuth(db);
    if (!db.credentials) {
      HttpPouch.call(this, db, callback);
      return;
    }

    db.originalFetch = db.fetch;
    db.fetch = async (url, opts) => {
      if (!db.session || isExpired(db.session)) {
        await getSession(db);
      }

      opts.headers.set(sessionCookieName, db.session.token);

      const response = await db.originalFetch(url, opts);
      if (response.status === 401 && db.session) {
        db.session = null;
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
  PouchDB.adapters.http = wrapAdapter(PouchDB.adapters.http);
  PouchDB.adapters.https = wrapAdapter(PouchDB.adapters.https);
};
