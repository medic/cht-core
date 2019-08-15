const request = require('request-promise-native');
const RESULT_PARSE_REGEX = /^"(.*)"\n?$/;

// This API gives weird psuedo-JSON results:
//   "password"\n
// Should be just `password`
const parseResponse = response => response.match(RESULT_PARSE_REGEX)[1];

module.exports = {
  getCredentials: key => {
    const serverUrl = module.exports._getServerUrl();
    if (!serverUrl) {
      return Promise.reject(new Error('Failed to find the CouchDB server'));
    }
    const nodeName = module.exports._getCouchNodeName();
    if (!nodeName) {
      return Promise.reject(new Error('Failed to find the CouchDB node name'));
    }
    return request.get(`${serverUrl}/_node/${nodeName}/_config/medic-credentials/${key}`)
      .then(parseResponse)
      .catch(err => {
        if (err.statusCode === 404) {
          // no credentials defined
          return;
        }

        // Throw it regardless so the process gets halted, we just error above for higher specificity
        throw err;
      });
  },
  _getCouchNodeName: () => process.env.COUCH_NODE_NAME,
  _getServerUrl: () => {
    if (!process.env.COUCH_URL) {
      return;
    }
    const couchUrl = process.env.COUCH_URL.replace(/\/$/, '');
    return couchUrl.slice(0, couchUrl.lastIndexOf('/'));
  }
};
