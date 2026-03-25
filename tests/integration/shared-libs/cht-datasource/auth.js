// Currently the remote context for cht-datasource does not handle any authentication
// for its fetch calls because it inherits the session cookie when running in the browser.
// NodeJS does not support automatically applying cookies to fetch calls.
// So, for the integration tests we need to wrap the fetch calls to set
// the basic auth headers on each request.
const { USERNAME, PASSWORD } = require('@constants');
const initialFetch = global.fetch;

const setAuth = () => {
  const headers = new Headers();
  headers.set('Authorization', 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64'));
  global.fetch = (url, options) => {
    if (options && options.headers) {
      const userHeaders = new Headers(options.headers);
      for (const [ key, value ] of userHeaders.entries()) {
        // User headers override pre-set headers
        headers.set(key, value);
      }
    }
    return initialFetch(url, { ...options, headers });
  };
};

const removeAuth = () => {
  global.fetch = initialFetch;
};

module.exports = {
  setAuth,
  removeAuth,
};
