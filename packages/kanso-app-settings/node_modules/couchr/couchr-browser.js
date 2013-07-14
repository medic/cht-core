/**
 * Universal module definition
 */

(function (root, factory) {

    if (typeof exports === 'object') {
        factory(exports, require('events'), require('jquery')); // Commonjs
    }
    else if (typeof define === 'function' && define.amd) {
        define(['exports', 'events', 'jquery'], factory); // AMD
    }
    else {
        root.couchr = {};
        factory(root.couchr, root.events, jQuery); // Browser globals
    }

}(this, function (exports, events, $) {

    /**
     * Returns a function for handling ajax responses from jquery and calls
     * the callback with the data or appropriate error.
     *
     * @param {Function} callback(err,response)
     * @api private
     */

    function onComplete(options, callback) {
        return function (req) {
            var resp;
            if (ctype = req.getResponseHeader('Content-Type')) {
                ctype = ctype.split(';')[0];
            }
            if (ctype === 'application/json' || ctype === 'text/json') {
                try {
                    resp = $.parseJSON(req.responseText)
                }
                catch (e) {
                    return callback(e, null, req);
                }
            }
            else {
                var ct = req.getResponseHeader("content-type") || "";
                var xml = ct.indexOf("xml") >= 0;
                resp = xml ? req.responseXML : req.responseText;
            }
            if (req.status == 200 || req.status == 201 || req.status == 202) {
                callback(null, resp, req);
            }
            else if (resp && (resp.error || resp.reason)) {
                var err = new Error(resp.reason || resp.error);
                err.error = resp.error;
                err.reason = resp.reason;
                err.code = resp.code;
                err.status = req.status;
                callback(err, null, req);
            }
            else {
                // TODO: map status code to meaningful error message
                var msg = req.statusText;
                if (!msg || msg === 'error') {
                    msg = 'Returned status code: ' + req.status;
                }
                var err2 = new Error(msg);
                err2.status = req.status;
                callback(err2, null, req);
            }
        };
    }

    /**
     * Properly encodes query parameters to CouchDB views etc. Handle complex
     * keys and other non-string parameters by passing through JSON.stringify.
     * Returns a shallow-copied clone of the original query after complex values
     * have been stringified.
     *
     * @name stringifyQuery(query)
     * @param {Object} query
     * @returns {Object}
     * @api public
     */

    exports.stringifyQuery = function (query) {
        var q = {};
        for (var k in query) {
            if (typeof query[k] !== 'string') {
                q[k] = JSON.stringify(query[k]);
            }
            else {
                q[k] = query[k];
            }
        }
        return q;
    };

    /**
     * Make a request using jQuery.ajax, with some default settings and proper
     * callback handling.
     *
     * @name ajax(options, callback)
     * @param {Object} options
     * @param {Function} callback(err,response)
     * @api public
     */

    exports.ajax = function (options, callback) {
        options.complete = onComplete(options, callback);
        options.dataType = 'json';
        if (!options.hasOwnProperty('cache')) {
            // IE has a tendency to cache /_session and other things stupidly
            // so turning it off by default
            options.cache = false;
        }
        return $.ajax(options);
    };


    exports.request = function (method, url, /*o*/data, /*o*/opt, callback) {
        if (!callback) {
            callback = opt;
            opt = null;
        }
        if (!callback) {
            callback = data;
            data = null;
        }
        var options = opt || {};
        options.type = method;
        options.url = url;

        if (data) {
            try {
                if (method === 'GET' || method === 'HEAD') {
                    options.data = exports.stringifyQuery(data);
                }
                else {
                    options.data = JSON.stringify(data);
                    options.processData = false;
                    options.contentType = 'application/json';
                }
            }
            catch (e) {
                return callback(e);
            }
        }
        return exports.ajax(options, callback);
    };

    function makeRequest(method) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return exports.request.apply(this, [method].concat(args));
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
        return exports.request('DELETE', url, data, callback);
    };

    // non-standard HTTP method, may not work in all browsers
    exports.copy = function (from, to, callback) {
        var opt = {
            headers: {'Destination': to}
        };
        return exports.request('COPY', from, null, opt, callback);
    };

    exports.changes = function (dburl, q) {
        q = q || {};
        q.feed = q.feed || 'longpoll';
        q.heartbeat = q.heartbeat || 10000;

        var ev = new events.EventEmitter();
        var request_in_progress = false;
        var paused = false;

        ev.pause = function () {
            paused = true;
        };

        ev.resume = function () {
            paused = false;
            if (!request_in_progress) {
                getChanges();
            }
        };

        function getChanges() {
            if (paused) {
                return;
            }
            try {
                var data = exports.stringifyQuery(q);
            }
            catch (e) {
                return ev.emit('error', e);
            }
            var url = dburl + '/_changes';
            request_in_progress = true;

            exports.request('GET', url, data, function (err, data) {
                request_in_progress = false;
                if (err) {
                    ev.emit('error', err);
                    // retry after 1 sec
                    setTimeout(getChanges, 1000);
                }
                if (!paused) {
                    for (var i = 0, len = data.results.length; i < len; i++) {
                        ev.emit('change', data.results[i]);
                    }
                    q.since = data.last_seq;
                    getChanges();
                }
            });
        }

        // use setTimeout to pass control back to the browser briefly to
        // allow the loading spinner to stop on page load
        setTimeout(function () {
            if (q.hasOwnProperty('since')) {
                getChanges();
            }
            else {
                exports.get(dburl, function (err, info) {
                    if (err) {
                        // no retry, just fail
                        return ev.emit('error', err);
                    }
                    q.since = info.update_seq;
                    getChanges();
                });
            }
        }, 0);

        return ev;
    };

}));
