const production = process.env.NODE_ENV === 'production';
const ONE_YEAR = 31536000000;
const SESSION_COOKIE_RE = /AuthSession=([^;]*);/;

const getCookieOptions = () => {
  return {
    sameSite: 'lax', // prevents the browser from sending this cookie along with some cross-site requests
    secure: production, // only transmit when requesting via https unless in development mode
  };
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
    options.maxAge = ONE_YEAR;
    res.cookie('userCtx', content, options);
  },
  setSession: (res, cookie) => {
    const sessionId = SESSION_COOKIE_RE.exec(cookie)[1];
    const options = getCookieOptions();
    options.httpOnly = true; // don't allow javascript access to stop xss
    res.cookie('AuthSession', sessionId, options);
  },
  setLocale: (res, locale) => {
    const options = getCookieOptions();
    options.maxAge = ONE_YEAR;
    res.cookie('locale', locale, options);
  }
};
