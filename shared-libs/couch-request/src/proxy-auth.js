const request = require('request-promise-native');
const crypto = require('crypto');

const { COUCH_URL, COUCHDB_SECRET } = process.env;

const promisedCouchSecret = (async () => {
  const envarSecret = COUCHDB_SECRET?.trim();
  if (envarSecret) {
    return envarSecret;
  }

  // Need to look up the secret (assuming the COUCH_URL contains user/pass)
  const serverUrl = new URL('/', COUCH_URL);
  const response = await request.get(`${serverUrl}/_node/_local/_config/couch_httpd_auth/secret`);
  return JSON
    .parse(response)
    .trim();
})();

const createHeaders = (username, roles, token) => {
  return {
    'X-Auth-CouchDB-UserName': username,
    'X-Auth-CouchDB-Roles': roles,
    'X-Auth-CouchDB-Token': token,
  };
};

const getAuthHeaders = async (username, roles) => {
  const secret = await promisedCouchSecret;
  const token = crypto
    .createHmac('sha256', secret)
    .update(username)
    .digest('hex');
  return createHeaders(username, roles, token);
};

module.exports = {
  createHeaders,
  getAuthHeaders,
  getCouchSecret: () => promisedCouchSecret,
};
