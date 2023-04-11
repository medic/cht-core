const production = process.env.NODE_ENV === 'production';
const ONE_YEAR_IN_MS = 31536000000;
const ONE_SECOND_IN_MS = 1000;
const COOKIE_ATTRIBUTE_SPLIT_RE = /;\s*/;
const sessionCookieName = 'AuthSession';

const getCookieOptions = (options = {}) => {
  Object.keys(options).forEach(key => {
    if (typeof options[key] === 'undefined') {
      delete options[key];
    }
  });

  const securityOptions = {
    sameSite: 'lax', // prevents the browser from sending this cookie along with some cross-site requests
    secure: production, // only transmit when requesting via https unless in development mode
  };

  return Object.assign({}, options, securityOptions);
};

const normalizeAttributeName = (option, lowerCaseFirst = true) => {
  const trimmed = option.trim();
  const lowerCased = lowerCaseFirst ? `${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}` : trimmed;
  return lowerCased.replace(/-/g, '');
};

const extractCookieAttributes = (cookieString) => {
  const attributes = {};
  cookieString.split(COOKIE_ATTRIBUTE_SPLIT_RE).forEach((attributePair, idx) => {
    const [attribute, value = ''] = attributePair.split('=');
    const attributeName = normalizeAttributeName(attribute, !!idx /* don't lowercase cookie name */);

    if (attributeName === 'maxAge') {
      // Response.cookie needs this value in milliseconds, contrary to HTTP spec
      attributes[attributeName] = parseInt(value.trim()) * ONE_SECOND_IN_MS;
    } else {
      attributes[attributeName] = value.trim();
    }
  });
  return attributes;
};

module.exports = {
  get: (req, name) => {
    const cookies = req.headers && req.headers.cookie;
    if (!cookies) {
      return;
    }
    const prefix = name + '=';
    const cookie = cookies.split(';').find(cookie => cookie.trim().startsWith(prefix));
    return cookie && cookie.trim().substring(prefix.length);
  },
  setUserCtx: (res, content) => {
    const options = getCookieOptions();
    options.maxAge = ONE_YEAR_IN_MS;
    res.cookie('userCtx', content, options);
  },
  setSession: (res, cookie) => {
    const { [sessionCookieName]: sessionId, maxAge } = extractCookieAttributes(cookie);

    const options = getCookieOptions({
      httpOnly: true, // don't allow javascript access to stop xss
      maxAge, // ensure the cookie expires when the CouchDB session expires
    });
    res.cookie('AuthSession', sessionId, options);
  },
  setLocale: (res, locale) => {
    const options = getCookieOptions();
    options.maxAge = ONE_YEAR_IN_MS;
    res.cookie('locale', locale, options);
  },
  setForceLogin: (res) => {
    res.cookie('login', 'force', getCookieOptions());
  }
};
