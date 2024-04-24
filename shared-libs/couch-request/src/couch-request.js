const request = require('request-promise-native');
const isPlainObject = require('lodash/isPlainObject');
const servername = new URL(process.env.COUCH_URL).hostname;

const isString = value => typeof value === 'string' || value instanceof String;
const isTrue = value => isString(value) ? value.toLowerCase() === 'true' : value === true;

const addServername = isTrue(process.env.ADD_SERVERNAME_TO_HTTP_AGENT);
const methods = {
  GET: 'GET',
  POST: 'POST',
  DELETE: 'DELETE',
  PUT: 'PUT',
  HEAD: 'HEAD'
};


const mergeOptions = (target, source, exclusions = []) => {
  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(exclusions) && exclusions.includes(key)) {
      return target;
    }
    target[key] = value; // locally, mutation is preferable to spreading as it doesn't
    // make new objects in memory. Assuming this is a hot path.
  }
  return target;
};

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

const validate = (firstIsString, method, first, second = {}) => {

  if (Object.hasOwn(methods, method) === false) {
    throw new Error(`Unsupported method (${method}) passed to call.`);
  }

  if (isPlainObject(second) === false) {
    throw new Error(`"options" must be a plain object'`);
  }

  if (firstIsString === false && isPlainObject(first) === false) {
    throw new Error(`"options" must be a plain object'`);
  }
};


const req = (method, first, second = {}) => {

  const firstIsString = isString(first);

  try {
    validate(firstIsString, method, first, second);
  } catch (e) {
    return Promise.reject(e);
  }

  const chosenOptions = firstIsString ? second : first;

  const exclusions = firstIsString ? ['url', 'uri', 'method'] : ['method'];
  const target = addServername ? { servername } : { };
  
  const mergedOptions = mergeOptions(target, chosenOptions, exclusions);

  return firstIsString ? getRequestType(method)(first, mergedOptions) : getRequestType(method)(mergedOptions);
};

const getRequestType = (method) => {
  // This is intended to simplify testing as sinon does not stub an
  // exported function (eg, 'export = requestPromise') but only methods.
  // From reading, proxyquire would need to be used to solve: https://www.npmjs.com/package/proxyquire
  // See: https://github.com/sinonjs/sinon/issues/562#issuecomment-79227487
  switch (method) {
  case methods.GET: {
    return request.get;
  }
  case methods.POST: {
    return request.post;
  }
  case methods.PUT: {
    return request.put;
  }
  case methods.DELETE: {
    return request.delete;
  }
  case methods.HEAD: {
    return request.head;
  }
  default: {
    return Promise.reject(Error(`Unsupported method (${method}) passed to call.`));
  }
  }
};

module.exports = {
  get: (first, second = {}) => req(methods.GET, first, second),
  post: (first, second = {}) => req(methods.POST, first, second),
  put: (first, second = {}) => req(methods.PUT, first, second),
  delete: (first, second = {}) => req(methods.DELETE, first, second),
  head: (first, second = {}) => req(methods.HEAD, first, second),
};
