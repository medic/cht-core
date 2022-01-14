const request = require('request-promise-native');
const RESULT_PARSE_REGEX = /^"(.*)"\n?$/;

// This API gives weird psuedo-JSON results:
//   "password"\n
// Should be just `password`
const parseResponse = response => response.match(RESULT_PARSE_REGEX)[1];

const getCouchNodeName = () => process.env.COUCH_NODE_NAME;

const getCredentials = (key) => {
  try {
    const couchConfigUrl = getCouchConfigUrl();
    return request
      .get(`${couchConfigUrl}/medic-credentials/${key}`)
      .then(parseResponse)
      .catch(err => {
        if (err.statusCode === 404) {
          // No credentials defined
          return;
        }
        // Throw it regardless so the process gets halted, we just error above for higher specificity
        throw err;
      });

  } catch (error) {
    return Promise.reject(error);
  }
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
    throw new Error('Failed to find the CouchDB server');
  }

  const nodeName = getCouchNodeName();
  if (!nodeName) {
    throw new Error('Failed to find the CouchDB node name');
  }

  return `${serverUrl}/_node/${nodeName}/_config`;
};

const getCouchConfig = (param) => {
  try {
    const couchConfigUrl = getCouchConfigUrl();
    return request.get({ url: `${couchConfigUrl}/${param}`, json: true });
  } catch (error) {
    return Promise.reject(error);
  }
};

const updateAdminPassword = (userName, password) => {
  try {
    const couchConfigUrl = getCouchConfigUrl();
    return request.put({ url: `${couchConfigUrl}/admins/${userName}`, body: `"${password}"` });
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = {
  getCredentials,
  getCouchConfig,
  updateAdminPassword,
};
