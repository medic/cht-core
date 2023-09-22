const request = require('request-promise-native');

const isPlainObject = (value) => {
  if (typeof value !== 'object' || value == null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null)
    && !(Symbol.toStringTag in value) && !(Symbol.iterator in value);
};

const memoGlobalCouchRequestOptions = () => {
  const cache = new Map(); // the assumption here is that this will be a fairly hot path, so caching would be valuable
  return (COUCH_URL) => {
    if (cache.has(COUCH_URL)) {
      return {
        servername: cache.get('hostname')
      };
    }
    cache.set(COUCH_URL, COUCH_URL);
    const servername = new URL(COUCH_URL).hostname;
    cache.set('hostname', servername);
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
    return {
      servername
    };
  };
};

const globalCouchRequestOptions = memoGlobalCouchRequestOptions();

const mergeOptions = (target, source) => {
  for (const [key, value] of Object.entries(source)) {
    target[key] = value; // locally, mutation is preferable to spreading as it doesn't
    // make new objects in memory. Assuming this is a hot path.
  }
  return target;
};

module.exports = {
  get: (options = {}) => {
    if (isPlainObject(options) === false) {
      return Promise.reject(Error('"options" must be a plain object'));
    }
    return request.get(
      mergeOptions(globalCouchRequestOptions(process.env.COUCH_URL), options)
    );
  },
  post: (options = {}) => {
    if (isPlainObject(options) === false) {
      return Promise.reject(Error('"options" must be a plain object'));
    }
    return request.post(mergeOptions(globalCouchRequestOptions(process.env.COUCH_URL), options));
  },
  put: (options = {}) => {
    if (isPlainObject(options) === false) {
      return Promise.reject(Error('"options" must be a plain object'));
    }
    return request.put(mergeOptions(globalCouchRequestOptions(process.env.COUCH_URL), options));
  },
  delete: (options = {}) => {
    if (isPlainObject(options) === false) {
      return Promise.reject(Error('"options" must be a plain object'));
    }
    return request.delete(mergeOptions(globalCouchRequestOptions(process.env.COUCH_URL), options));
  },
  head: (options = {}) => {
    if (isPlainObject(options) === false) {
      return Promise.reject(Error('"options" must be a plain object'));
    }
    return request.head(mergeOptions(globalCouchRequestOptions(process.env.COUCH_URL), options));
  },
};
