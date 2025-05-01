const environment = require('@medic/environment');
const path = require('path');
const os = require('os');
let asyncLocalStorage;
let requestIdHeader;

const JSON_HEADER_VALUE = 'application/json';
const CONTENT_TYPE = 'content-type';
const CHT_AGENT = 'Community Health Toolkit';

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

const getUserAgent = async () => {
  const chtVersion = await environment.getVersion();
  const platform = os.platform();
  const arch = os.arch();
  return `${CHT_AGENT}/${chtVersion} (${platform},${arch})`;
};

const setRequestUri = (options) => {
  let uri = options.uri || options.url;
  if (options.baseUrl) {
    uri = path.join(options.baseUrl, uri);
  }

  if (options.qs) {
    Object.keys(options.qs).forEach((key) => {
      if (Array.isArray(options.qs[key])) {
        options.qs[key] = JSON.stringify(options.qs[key]);
      }
    });
    uri = `${uri}?${new URLSearchParams(options.qs).toString()}`;
  }

  delete options.url;
  delete options.baseUrl;
  delete options.qs;

  if (!uri) {
    throw new Error('Missing uri/url parameter.');
  }

  try {
    new URL(uri);
  } catch (err) {
    throw new Error('Invalid uri/url parameter. Please use a valid URL.');
  }

  options.uri = uri;
};

const setRequestAuth = (options) => {
  let auth;

  const url = new URL(options.uri);
  if (url.username) {
    auth = { username: url.username, password: url.password };
    url.username = '';
    url.password = '';
    options.uri = url.toString();
  }

  if (options.auth) {
    auth = options.auth;
  }

  if (options.auth && options.headers.authorization) {
    throw new Error('Conflicting authorization settings. Use authorization header or basic auth exclusively.');
  }

  if (!auth || options.headers.authorization) {
    return;
  }

  delete options.auth;
  const basicAuth = Buffer.from(`${auth.username}:${auth.password}`, 'utf8').toString('base64');
  options.headers.authorization = `Basic ${basicAuth}`;
};

const getSendJson = options => {
  const contentType = options.headers[CONTENT_TYPE];

  if (options.json && contentType && contentType !== JSON_HEADER_VALUE) {
    throw new Error('Incompatible json and content-type properties.');
  }
  return options.json !== false && (!contentType || contentType === JSON_HEADER_VALUE);
};

const setRequestContentType = (options, sendJson) => {
  if (sendJson) {
    options.headers.accept = JSON_HEADER_VALUE;
    options.headers[CONTENT_TYPE] = JSON_HEADER_VALUE;
    options.body && (options.body = JSON.stringify(options.body));
  }

  if (options.form) {
    const formData = new FormData();
    Object.keys(options.form).forEach(key => formData.append(key, options.form[key]));
    options.headers[CONTENT_TYPE] = 'application/x-www-form-urlencoded';

    options.body = new URLSearchParams(formData).toString();
  }

  delete options.json;
  delete options.form;

  return sendJson;
};

const setTimeout = (options) => {
  if (options.timeout) {
    options.signal = AbortSignal.timeout(options.timeout);
    delete options.timeout;
  }
};

const lowercaseHeaders = headers => Object.assign(
  {},
  ...Object.keys(headers).map(key => ({ [key.toLowerCase()]: headers[key] }))
);

const setRequestOptions = async (options) => {
  options.headers = lowercaseHeaders(options.headers || {});

  const requestId = asyncLocalStorage?.getRequestId();
  if (requestId) {
    options.headers[requestIdHeader] = requestId;
  }

  // Set user-agent header if not already set
  if (!options.headers['user-agent']) {
    options.headers['user-agent'] = await getUserAgent();
  }

  setRequestUri(options);
  setRequestAuth(options);
  setTimeout(options);
  const sendJson = getSendJson(options);
  setRequestContentType(options, sendJson);
  if (addServername) {
    options.servername = environment.host;
  }
};

const getResponseBody = async (response, sendJson) => {
  const contentType = response.headers.get(CONTENT_TYPE);
  const receiveJson = contentType?.startsWith(JSON_HEADER_VALUE);
  const content = receiveJson ? await response.json() : await response.text();

  if (sendJson && !contentType) {
    try {
      return JSON.parse(content);
    } catch (e) {
      return content;
    }
  }

  return content;
};

const sanitizeErrorResponse = (body) => {
  if (!body) {
    return 'No response body';
  }
  
  if (typeof body === 'string') {
    return body.replace(/(?:password|auth|user|pass)[:=].*?(?:[&\s]|$)/gi, '');
  }
  
  if (typeof body === 'object') {
    const sanitized = { ...body };

    ['password', 'auth', 'authorization', 'key', 'secret', 'token', 'username', 'user', 'pass'].forEach(field => {
      if (field in sanitized) {
        delete sanitized[field]; 
      }
    });
    return sanitized;
  }
  
  return body;
};
const request = async (options = {}) => {
  await setRequestOptions(options);

  const response = await global.fetch(options.uri, options);
  const responseObj = {
    ...response,
    body: await getResponseBody(response, options.headers[CONTENT_TYPE] === JSON_HEADER_VALUE),
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

  const sanitizedBody = sanitizeErrorResponse(responseObj.body);
  const err = new Error(`${response.status} - ${JSON.stringify(sanitizedBody)}`);
  
  err.status = response.status;
  err.statusCode = response.status;
  err.body = sanitizedBody;
  err.headers = response.headers;
  err.ok = response.ok;
  
  throw err;
};

/**
 * couch-request options are an extension of RequestInit,
 * (see https://developer.mozilla.org/en-US/docs/Web/API/RequestInit), with a few custom fields, inherited from
 * request-promise-native, which were widely used and simplified the interface
 *
 * @typedef {Object} RequestInit
 * @property {string|undefined} uri - fully qualified uri string. Has precedence over url.
 * @property {string|undefined} url - fully qualified uri string.
 * @property {string|undefined} baseUrl - fully qualified uri string used as the base url.
 * Concatenated with uri || url to create the full URL.
 * @property {boolean|undefined} json - defaults to true.
 * Sets body to JSON representation of value and adds content-type: application/json header.
 * Additionally, parses the response body as JSON.
 * @property {Object} headers - hashmap of request headers. Headers names must be lowercase according to http/2 RFC
 * https://datatracker.ietf.org/doc/html/rfc7540#section-8.1.2
 * @property {Object|undefined} qs - object containing querystring values to be appended to the uri
 * @property body - entity body for PATCH, POST and PUT requests.
 * If json is true, then body must be a JSON-serializable object.
 * See: https://developer.mozilla.org/en-US/docs/Web/API/RequestInit#body
 * @property {Object|undefined} form - when passed an object, this sets body to a querystring representation of value,
 * and adds content-type: application/x-www-form-urlencoded header
 * @property {Object|undefined} auth - a hash containing values username, password
 * @property {Boolean|undefined} simple - if true, returns full response object instead of parsed body.
 * @property {Number|undefined} timeout - integer containing number of milliseconds. Adds an abortSignal.
 */

/**
 * couch-request response is an extension of Response https://developer.mozilla.org/en-US/docs/Web/API/Response
 * @typedef {Object} RequestResponse
 * @property body - parsed or raw response body
 * @property {Headers} headers - The Headers object associated with the response.
 * @property {Boolean} ok - states whether the response was successful (status in the range 200-299) or not.
 * @property {Number} status - HTTP status codes of the response.
 */

module.exports = {
  initialize: (store, header) => {
    asyncLocalStorage = store;
    requestIdHeader = header.toLowerCase();
  },

  /**
   * @param {RequestInit} options
   * @returns {Promise<RequestResponse|any>}
   */
  get: (options = {}) => request({ ...options, method: 'GET' }),
  /**
   * @param {RequestInit} options
   * @returns {Promise<RequestResponse|any>}
   */
  post: (options = {}) => request({ ...options, method: 'POST' }),
  /**
   * @param {RequestInit} options
   * @returns {Promise<RequestResponse|any>}
   */
  put: (options = {}) => request({ ...options, method: 'PUT' }),
  /**
   * @param {RequestInit} options
   * @returns {Promise<RequestResponse|any>}
   */
  delete: (options = {}) => request({ ...options, method: 'DELETE' }),
  /**
   * @param {RequestInit} options
   * @returns {Promise<RequestResponse|any>}
   */
  head: (options = {}) => request({ ...options, method: 'HEAD' }),
};
