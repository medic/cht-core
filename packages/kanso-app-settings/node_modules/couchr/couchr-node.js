var querystring = require('querystring'),
    follow = require('follow'),
    http = require('http'),
    https = require('https'),
    url = require('url'),
    urlParse = url.parse,
    urlFormat = url.format;


var STATUS_MSGS = {
    400: '400: Bad Request',
    401: '401: Unauthorized',
    402: '402: Payment Required',
    403: '403: Forbidden',
    404: '404: Not Found',
    405: '405: Method Not Allowed',
    406: '406: Not Acceptable',
    407: '407: Proxy Authentication Required',
    408: '408: Request Timeout',
    409: '409: Conflict',
    410: '410: Gone',
    411: '411: Length Required',
    412: '412: Precondition Failed',
    413: '413: Request Entity Too Large',
    414: '414: Request-URI Too Long',
    415: '415: Unsupported Media Type',
    416: '416: Requested Range Not Satisfiable',
    417: '417: Expectation Failed',
    418: '418: I\'m a teapot',
    422: '422: Unprocessable Entity',
    423: '423: Locked',
    424: '424: Failed Dependency',
    425: '425: Unordered Collection',
    444: '444: No Response',
    426: '426: Upgrade Required',
    449: '449: Retry With',
    450: '450: Blocked by Windows Parental Controls',
    499: '499: Client Closed Request',
    500: '500: Internal Server Error',
    501: '501: Not Implemented',
    502: '502: Bad Gateway',
    503: '503: Service Unavailable',
    504: '504: Gateway Timeout',
    505: '505: HTTP Version Not Supported',
    506: '506: Variant Also Negotiates',
    507: '507: Insufficient Storage',
    509: '509: Bandwidth Limit Exceeded',
    510: '510: Not Extended'
};


/**
 * Creates an error object with a message depending on the HTTP status code
 * of a response.
 */

exports.statusCodeError = function (code) {
    if (code in STATUS_MSGS) {
        return new Error(STATUS_MSGS[code]);
    }
    return new Error('Status code: ' + code);
};


exports.request = function (method, url, /*opt*/data, /*opt*/opt, callback) {
    if (!callback) {
        callback = opt;
        opt = {};
    }
    if (!callback) {
        callback = data;
        data = null;
    }

    opt = opt || {};

    var parsed = urlParse(url);
    var path = parsed.path;
    var headers = {
        'Host': parsed.hostname,
        'Accept': 'application/json'
    };
    if (method === 'POST' || method === 'PUT') {
        if (typeof data !== 'string' && !Buffer.isBuffer(data)) {
            try {
                data = JSON.stringify(data);
            }
            catch (e) {
                return callback(e);
            }
        }
        if (!Buffer.isBuffer(data)) {
            data = new Buffer(data);
        }
        if (opt.headers && opt.headers['Content-Type']) {
            headers['Content-Type'] = opt.headers['Content-Type'];
        }
        else {
            headers['Content-Type'] = 'application/json';
        }
        headers['Content-Length'] = data.length;
    } else if (method === 'COPY') {
        headers['Destination'] = opt.headers['Destination'];
    }
    else if (data) {
        // properly encode "key" properties as JSON
        ['key', 'keys', 'startkey', 'endkey'].forEach(function(key) {
            if (data[key] != null) {
                data[key] = JSON.stringify(data[key]);
            }
        });

        path = parsed.pathname + '?' + querystring.stringify(data);
        data = null;
        headers['Content-Length'] = 0;
    }

    if (parsed.auth) {
        var enc = new Buffer(parsed.auth).toString('base64');
        headers.Authorization = "Basic " + enc;
    }
    if (opt.Cookie) {
        headers.Cookie = opt.Cookie;
    }
    var proto = (parsed.protocol === 'https:') ? https: http;

    var request = proto.request({
        host: parsed.hostname,
        port: parsed.port,
        method: method,
        path: path,
        headers: headers
    });

    request.on('response', function (response) {
        if (response.headers.connection === 'close' &&
            response.statusCode >= 300) {
            var err3 = exports.statusCodeError(response.statusCode);
            err3.response = response;
            return callback(err3, data, response);
        }
        else {
            var buffer = [];
            response.on('data', function (chunk) {
                if (opt.callback_on_data) {
                    // don't accumulate final result, call function
                    // immediately with data
                    var data = parseData(response, chunk.toString());
                    if (data) {
                        // don't return 'null's on newlines
                        return opt.callback_on_data(null, data);
                    }
                }
                else {
                    // accumulate final result
                    buffer.push(chunk.toString());
                }
            });
            response.on('end', function () {
                try {
                    var data = parseData(response, buffer.join(''));
                }
                catch (e) {
                    return callback(e);
                }
                if (response.statusCode >= 300) {
                    if (data && data.error) {
                        var err = new Error(
                            data.error + (data.reason ? '\n' + data.reason: '')
                        );
                        err.error = data.error;
                        err.reason = data.reason;
                        err.response = response;
                        return callback(err, data, response);
                    }
                    else {
                        var err2 = exports.statusCodeError(response.statusCode);
                        err2.response = response;
                        return callback(err2, data, response);
                    }
                }
                else {
                    process.nextTick(function () {
                        return callback(null, data, response);
                    });
                }
            });
        }
    });

    // handle errors in the request
    request.on('error', function(err) {
        callback(err);
    });

    if (data && (method === 'POST' || method === 'PUT')) {
        request.write(data, 'utf8');
    }
    request.end();
};

function parseData(response, data) {
    var ct = (response.headers['content-type'] || '').split(';')[0];
    if (ct === 'application/json') {
        // trim whitespace
        data = data.replace(/^\s+|\s+$/g, '');
        // parse if any data, otherwise return null
        return data.length ? JSON.parse(data): null;
    }
    return data;
}

function makeRequest(method) {
    return function () {
        var args = Array.prototype.slice.call(arguments);
        exports.request.apply(this, [method].concat(args));
    };
};

exports.get = makeRequest('GET');
exports.post = makeRequest('POST');
exports.head = makeRequest('HEAD');
exports.put = makeRequest('PUT');

// data.rev should be in query part of URL
exports.del = function (url, data, callback) {
    if (!callback) {
        callback = data;
        data = null;
    }
    if (data && data.rev && !/\?rev=/.test(url)) {
        url += (url.indexOf('?') === -1) ? '?': '&';
        url += 'rev=' + encodeURIComponent(data.rev);
    }
    exports.request('DELETE', url, data, callback);
};

// non-standard HTTP method, may not work in all browsers
exports.copy = function (from, to, callback) {
    var opt = {
        headers: {'Destination': to}
    };
    exports.request('COPY', from, null, opt, callback);
};

exports.changes = function (dburl, q) {
    q = q || {};
    if (!q.hasOwnProperty('since')) {
        q.since = 'now';
    }
    q.db = dburl;
    var feed = new follow.Feed(q);
    feed.follow();
    return feed;
};
