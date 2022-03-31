const request = require('request-promise-native');

const getCredentialId = key => `credential:${key}`;

const getCouchNodeName = () => process.env.COUCH_NODE_NAME;

const getCouchUrl = () => {
  const couchUrl = process.env.COUCH_URL;
  return couchUrl && couchUrl.replace(/\/$/, '');
};

const getServerUrl = () => {
  const couchUrl = process.env.COUCH_URL;
  return couchUrl && couchUrl.slice(0, couchUrl.lastIndexOf('/'));
};

const getVaultUrl = (key) => `${getCouchUrl()}-vault/${getCredentialId(key)}`;

const getCredentialsDoc = (key) => {
  if (!key) {
    return Promise.reject(new Error('You must pass the key for the credentials you want'));
  }
  return request
    .get(`${getVaultUrl(key)}`, { json: true }) // TODO do we allow spaces in credential keys?
    .catch(err => {
      if (err.statusCode === 404) {
        // No credentials defined
        return;
      }
      // Throw it regardless so the process gets halted, we just error above for higher specificity
      throw err;
    });
};

// TODO use node crypto and couchdb secret to encrypt/decrypt the password
// eg: curl /_node/_local/_config/chttpd_auth/secret
const getCredentials = (key) => {
  return getCredentialsDoc(key)
    .then(doc => doc && doc.password);
};

const setCredentials = (key, password) => {
  return getCredentialsDoc(key)
    .then(doc => {
      if (!doc) {
        doc = { _id: getCredentialId(key) };
      }
      doc.password = password;

      return request.put(`${getVaultUrl(key)}`, { json: true, body: doc });
    });
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
  setCredentials,
  getCouchConfig,
  updateAdminPassword,
};
