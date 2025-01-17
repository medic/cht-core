const { USERNAME, PASSWORD } = require('@constants');
const initialFetch = global.fetch;

const setAuth = () => {
  const headers = new Headers();
  headers.set('Authorization', 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64'));
  global.fetch = (url, options) => initialFetch(url, { headers, ...options, });
};

const removeAuth = () => {
  global.fetch = initialFetch;
};

module.exports = {
  setAuth,
  removeAuth,
};
