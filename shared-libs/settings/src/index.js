const request = require('request-promise-native');

const getCouchNodeName = () => process.env.COUCH_NODE_NAME;

const getCouchUrl = () => {
  const couchUrl = process.env.COUCH_URL;
  return couchUrl && couchUrl.replace(/\/$/, '');
};

const getServerUrl = () => {
  const couchUrl = process.env.COUCH_URL;
  return couchUrl && couchUrl.slice(0, couchUrl.lastIndexOf('/'));
};

const getCredentials = (key) => {
  const couchUrl = getCouchUrl();
  if (!couchUrl) {
    return Promise.reject(new Error('Failed to find the CouchDB server'));
  }
  const vaultDbUrl = `${couchUrl}-vault`;
  return request
    .get(`${vaultDbUrl}/${key}`) // do we allow spaces in credential keys?
    .then(doc => doc && doc.password)
    .catch(err => {
      if (err.statusCode === 404) {
        // No credentials defined
        return;
      }
      // Throw it regardless so the process gets halted, we just error above for higher specificity
      throw err;
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
  getCouchConfig,
  updateAdminPassword,
};
