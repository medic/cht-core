const environment = require('@medic/environment');
const servername = environment.host;
let asyncLocalStorage;
let requestIdHeader;


const isString = value => typeof value === 'string' || value instanceof String;
const isTrue = value => isString(value) ? value.toLowerCase() === 'true' : value === true;

const addServername = isTrue(process.env.ADD_SERVERNAME_TO_HTTP_AGENT);

// When proxying to HTTPS from HTTP (for example where an ingress does TLS termination in an SNI environment),
// not including a 'servername' for a request to the HTTPS server (eg, def.org) produces the 
// following error:
// 
// 'ERR_TLS_CERT_ALTNAME_INVALID'
// "RequestError: Error [ERR_TLS_CERT_ALTNAME_INVALID]: Hostname/IP does not match certificate's altnames:
//  Host: abc.com. is not in the cert's altnames: DNS:def.org"
// 
// The addition of 'servername' resolves this error. See docs for 'tls.connect(options[, callback])'
//  (https://nodejs.org/api/tls.html): "Server name for the SNI (Server Name Indication) TLS extension  It is the
//  name of the host being connected to, and must be a host name, and not an IP address.".
//

const setRequestUri = (options) => {
  let uri = (options.uri || options.url);
  if (options.baseUrl) {
    uri = `${options.baseUrl}${uri}`;
  }

  if (options.qs) {
    Object.keys(options.qs).forEach((key) => {
      if (Array.isArray(options.qs[key])) {
        options.qs[key] = JSON.stringify(options.qs[key]);
      }
    });
    uri = `${uri}?${new URLSearchParams(options.qs).toString()}`;
  }

  options.uri = uri;
};

const setRequestAuth = (options) => {
  let auth;

  if (options.auth) {
    auth = options.auth;
  } else {
    const url = new URL(options.uri);
    if (url.username) {
      auth = { username: url.username, password: url.password };
      url.username = '';
      url.password = '';
      options.uri = url.toString();
    }
  }

  if (!auth) {
    return;
  }

  const basicAuth = btoa(`${auth.username}:${auth.password}`);
  options.headers.Authorization = `Basic ${basicAuth}`;
};

const setRequestContentType = (options) => {
  let sendJson = true;
  if (options.json === false ||
      (options.headers['Content-Type'] && options.headers['Content-Type'] !== 'application/json')
  ) {
    sendJson = false;
  }

  if (sendJson) {
    options.headers.Accept = 'application/json';
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  if (!sendJson && options.form) {
    const formData = new FormData();
    Object.keys(options.form).forEach(key => formData.append(key, options.form[key]));
    options.headers['Content-Type'] = 'multipart/form-data';
    options.body = formData;
  }

  return sendJson;
};

const getRequestOptions = (options, servername) => {
  options.headers = options.headers || {};

  const requestId = asyncLocalStorage?.getRequestId();
  if (requestId) {
    options.headers[requestIdHeader] = requestId;
  }

  setRequestUri(options);
  setRequestAuth(options);
  const sendJson = setRequestContentType(options);
  if (addServername) {
    options.servername = servername;
  }

  return { options, sendJson };
};

const getResponseBody = async (response, sendJson) => {
  const receiveJson =  (!response.headers.get('content-type') && sendJson) ||
                       response.headers.get('content-type')?.startsWith('application/json');
  return receiveJson ? await response.json() : await response.text();
};

const request = async (options = {}) => {
  const  { options: requestInit, sendJson } = getRequestOptions(options, servername);

  const response = await fetch(requestInit.uri, requestInit);
  const responseObj = {
    ...response,
    body: await getResponseBody(response, sendJson),
    status: response.status,
    ok: response.ok,
    headers: response.headers
  };

  if (options.simple === false) {
    return responseObj;
  }

  if (response.ok || (response.status > 300 && response.status < 399)) {
    return responseObj.body;
  }

  const err = new Error(response.error || `${response.status} - ${JSON.stringify(responseObj.body)}`);
  Object.assign(err, responseObj);
  throw err;
};

module.exports = {
  initialize: (store, header) => {
    asyncLocalStorage = store;
    requestIdHeader = header;
  },

  get: (options = {}) => request({ ...options, method: 'GET' }),
  post: (options = {}) => request({ ...options, method: 'POST' }),
  put: (options = {}) => request({ ...options, method: 'PUT' }),
  delete: (options = {}) => request({ ...options, method: 'DELETE' }),
  head: (options = {}) => request({ ...options, method: 'HEAD' }),
};
