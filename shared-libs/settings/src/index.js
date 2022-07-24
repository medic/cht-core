const request = require('request-promise-native');
const crypto = require('crypto');

const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const CRYPTO_ALGO = 'aes-256-cbc';

const getCredentialId = id => `credential:${id}`;

const getCouchNodeName = () => process.env.COUCH_NODE_NAME;

const getCouchUrl = () => {
  const couchUrl = process.env.COUCH_URL;
  return couchUrl && couchUrl.replace(/\/$/, '');
};

const getServerUrl = () => {
  const couchUrl = process.env.COUCH_URL;
  return couchUrl && couchUrl.slice(0, couchUrl.lastIndexOf('/'));
};

const getVaultUrl = (id) => `${getCouchUrl()}-vault/${getCredentialId(id)}`;

const getCredentialsDoc = (id) => {
  if (!id) {
    return Promise.reject(new Error('You must pass the key for the credentials you want'));
  }
  return request
    .get(getVaultUrl(id), { json: true })
    .catch(err => {
      if (err.statusCode === 404) {
        // No credentials defined
        return;
      }
      // Throw it regardless so the process gets halted, we just error above for higher specificity
      throw err;
    });
};

const getKey = () => {
  // NB: This path will need to change when we upgrade to CouchDB v3.2
  // https://docs.couchdb.org/en/stable/config/auth.html#chttpd_auth/secret
  const url = `${getCouchConfigUrl()}/couch_httpd_auth/secret`;
  return request
    .get(url, { json: true })
    .then(key => Buffer.from(key).slice(0, KEY_LENGTH));
};

const encrypt = (text) => {
  return getKey()
    .then(key => {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(CRYPTO_ALGO, key, iv);
      const start = cipher.update(text);
      const end = cipher.final();
      const encrypted = Buffer.concat([ start, end ]);
      return iv.toString('hex') + ':' + encrypted.toString('hex');
    });
};

const decrypt = (text) => {
  return getKey()
    .then(key => {
      const parts = text.split(':');
      const iv = Buffer.from(parts.shift(), 'hex');
      const encryptedText = Buffer.from(parts.join(':'), 'hex');
      const decipher = crypto.createDecipheriv(CRYPTO_ALGO, key, iv);
      const start = decipher.update(encryptedText);
      const final = decipher.final();
      return Buffer.concat([ start, final ]).toString();
    });
};

const getCredentials = (id) => {
  return getCredentialsDoc(id)
    .then(doc => {
      const encrypted = doc && doc.password;
      if (!encrypted) {
        return;
      }
      return decrypt(encrypted);
    });
};

const setCredentials = (id, password) => {
  return Promise.all([
    getCredentialsDoc(id),
    encrypt(password)
  ])
    .then(([ doc, encrypted ]) => {
      if (!doc) {
        doc = { _id: getCredentialId(id) };
      }
      doc.password = encrypted;
      return request.put(getVaultUrl(id), { json: true, body: doc });
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
