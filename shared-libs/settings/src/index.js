const request = require('request-promise-native');
const RESULT_PARSE_REGEX = /^"(.*)"\n?$/;

// This API gives weird psuedo-JSON results:
//   "password"\n
// Should be just `password`
const parseResponse = response => response.match(RESULT_PARSE_REGEX)[1];

const getCouchNodeName = () => process.env.COUCH_NODE_NAME;

const getCredentials = (key) => {
  return getCouchConfigUrl()
    .then(couchConfigUrl => request.get(`${couchConfigUrl}/medic-credentials/${key}`))
    .then(parseResponse)
    .catch(err => {
      if (err.statusCode === 404) {
        // no credentials defined
        return;
      }

      // Throw it regardless so the process gets halted, we just error above for higher specificity
      throw err;
    });
};

const getServerUrl = () => {
  if (!process.env.COUCH_URL) {
    return;
  }
  const couchUrl = process.env.COUCH_URL.replace(/\/$/, '');
  return couchUrl.slice(0, couchUrl.lastIndexOf('/'));
};

const getCouchConfigUrl = () => {
  const serverUrl = getServerUrl();
  if (!serverUrl) {
    return Promise.reject(new Error('Failed to find the CouchDB server'));
  }

  const nodeName = getCouchNodeName();
  if (!nodeName) {
    return Promise.reject(new Error('Failed to find the CouchDB node name'));
  }

  return Promise.resolve(`${serverUrl}/_node/${nodeName}/_config`);
};

const getCouchConfig = (param) => {
  return getCouchConfigUrl()
    .then(couchConfigUrl => {
      return request.get({
        url: `${couchConfigUrl}/${param}`,
        json: true
      });
    });
};

const updateAdminPassword = (userName, password) => {
  return getCouchConfigUrl()
    .then(couchConfigUrl => {
      return request.put({
        url: `${couchConfigUrl}/admins/${userName}`,
        body: `"${password}"`
      });
    });
};

module.exports = {
  getCredentials,
  getCouchConfig,
  updateAdminPassword,
};
