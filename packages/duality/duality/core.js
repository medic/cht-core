/*global window: false, getRow: true, start: true, $: false, pageTracker: true,
  duality: true, log: true, console: true, send: true */

/**
 * The core module contains functions used by duality to facilitate the running
 * of your app. You shouldn't need to use any of the functions here directly
 * unless you're messing with the internals of the framework.
 *
 * @module
 */


/**
 * Module dependencies
 */

var settings = require('settings/root'), // module auto-generated
    url = require('url'),
    db = require('db'),
    utils = require('./utils'),
    session = require('session'),
    cookies = require('cookies'),
    events = require('./events'),
    urlParse = url.parse,
    urlFormat = url.format,
    _ = require('underscore')._,
    flashmessages,
    templates;


try {
    flashmessages = require('./flashmessages');
}
catch (e) {
    // may not be available
}

try {
    templates = require('duality/templates');
}
catch (e) {
    // may not be available
}


var BASE_TEMPLATE = 'base.html';
if (settings.duality && settings.duality.base_template) {
    BASE_TEMPLATE = settings.duality.base_template;
}

/**
 * This is because the first page hit also triggers duality to handle the url
 * client-side. Knowing it is the first page being loaded means we can stop
 * the pageTracker code from submitting the URL twice. Exported because this
 * might be useful information to other modules, it should not be modified
 * by them.
 */

//exports.initial_hit = utils.initial_hit;


/**
 * This variable keeps track of whether or not the browser supports
 * pushstate for manipulating browser history.
 */

exports.history_support = false;

/**
 * Stores the current html5 history state to detect duplicate popstate events
 */

exports.current_state = null;

/**
 * Set to true when setURL is called so the onpopstate which fires afterwards
 * knows it is the result of an explicit call to setURL (as opposed to clicking
 * the back, forward or reload buttons). This means we can avoid showing a
 * confirmation dialog for POST requests in these circumstances.
 */

exports.set_called = false;


/**
 * This is set to true when the initial page request is to an unknown URL
 * rewrite target (such as a static .html page). This tells duality whether to
 * handle urls internally or let the browser refresh the page when clicking
 * links etc
 */

exports.unknown_target = false;


if (typeof window !== 'undefined') {
    if (!window.console) {
        // console.log is going to cause errors, just stub the functions
        // for now. TODO: add logging utility for IE?
        window.console = {
            log: function () {},
            error: function () {},
            info: function () {},
            warn: function () {}
        };
    }
    var console = window.console;
}


/**
 * Global functions required to match the CouchDB JavaScript environment.
 */

if (typeof getRow === 'undefined' && typeof window !== 'undefined') {
    window.getRow = function () {
        return null;
    };
}
if (typeof start === 'undefined' && typeof window !== 'undefined') {
    window.start = function (options) {};
}
if (typeof send === 'undefined' && typeof window !== 'undefined') {
    window.send = function (options) {};
}
if (typeof log === 'undefined' && typeof window !== 'undefined') {
    window.log = function () {
        return console.log.apply(console, arguments);
    };
}


/**
 * Used to store userCtx, periodically updated like on session.login and
 * session.logout. TODO: Or if a permissions error is returned from a db method?
 */

// TODO: added to utils to avoid circular dependency bug in couchdb
//exports.userCtx = utils.userCtx;


exports._rewrites = [];
exports._shows = {};
exports._lists = {};
exports._updates = {};


function loadDeps(deps) {
    // TODO: ignore deps already merged in
    if (!deps) {
        return;
    }
    for (var k in deps) {
        var s = null;
        try {
            s = require('settings/packages/' + k);
        }
        catch (e) {
            // no settings, skip
        }
        if (s) {
            if (s.load) {
                var a = require(s.load);
                // should these always be concatenated?
                // TODO: this behaves differently to the build steps which only
                // use the rewrites from the root package
                exports._rewrites = exports._rewrites.concat(a.rewrites || []);

                // TODO: detect conflicting properties as the merge build step
                // would report them
                _.extend(exports._shows, a.shows);
                _.extend(exports._lists, a.lists);
                _.extend(exports._updates, a.updates);
            }
            loadDeps(s.dependencies);
        }
    }
}


// load root app
var tmp = {};
tmp[settings.name] = null;
loadDeps(tmp);

// load dependencies of root app
loadDeps(settings.dependencies);

exports._rewrites = _.flatten(exports._rewrites);


/**
 * Called by duality.js once the design doc has been loaded.
 */

exports.init = function () {

    if (window.history && history.pushState) {
        exports.history_support = true;

        $('form').live('submit', function (ev) {
            var action = $(this).attr('action');
            var method = $(this).attr('method').toUpperCase();

            // use current path if action path is mising
            action = urlParse(action);
            if (!action.pathname) {
                action.pathname = urlParse(exports.getURL()).pathname;
            }
            action = urlFormat(action);

            // _session is a special case always available at the root url
            if (action !== '/_session' && exports.isAppURL(action)) {
                var url = exports.appPath(action);
                ev.preventDefault();
                var fields = $(this).serializeArray();
                var data = {};
                for (var i = 0; i < fields.length; i++) {
                    data[fields[i].name] = fields[i].value;
                }
                if (method === 'GET' || method === 'HEAD') {
                    var parsed = urlParse(url);
                    parsed.query = data;
                    data = {};
                    url = urlFormat(parsed);
                }
                // TODO: should this post form data to a new window using
                // target="_blank" if the action is to an unrecognized rewrite
                // target?
                exports.setURL(method, url, data);
            }
            ev.preventDefault();
            return false;
        });

        $('a').live('click', function (ev) {
            var href = $(this).attr('href');
            var rel = $(this).attr('rel');

            if (href && exports.isAppURL(href) && rel !== 'external') {
                var url = exports.appPath(href);
                ev.preventDefault();
                var match = exports.matchURL('GET', url);
                if (/^_show\//.test(match.to) ||
                    /^_list\//.test(match.to) ||
                    /^_update\//.test(match.to)) {
                    exports.setURL('GET', url, {});
                }
                else {
                    // unknown rewrite target, don't create history entry
                    // but open in a new window since the new page probably
                    // doesn't have pushstate support and will break the back
                    // button
                    window.open(exports.getBaseURL() + url);
                }
            }
        });

        window.onpopstate = function (ev) {
            var url = exports.getAppURL();
            var state = ev.state || {};
            var method = state.method || 'GET';
            var data = state.data;
            var count = state.history_count;

            if (method !== 'GET' && method !== 'HEAD') {
                // unsafe method, unless caused by an explicit call to setURL
                // show a confirmation dialog
                if (!exports.set_called) {
                    // TODO: at this point is it too late to undo the popstate?
                    var resend = confirm(
                        'In order to complete this request the browser will ' +
                        'have to re-send information, repeating any ' +
                        'previous action (such as creating a document).\n\n' +
                        'Re-send information?'
                    );
                    if (!resend) {
                        var curr_count = exports.current_state.history_count;
                        window.history.go(curr_count - count);
                        return;
                    }
                }
            }
            // reset set_called
            exports.set_called = false;

            var curr = exports.current_state;
            if (curr &&
                curr.url === url &&
                curr.timestamp === state.timestamp &&
                (curr.method || 'GET') === (state.method || 'GET')) {
                // duplicate popstate event
                return;
            }
            exports.current_state = {
                method: method,
                url: url,
                data: data,
                timestamp: state.timestamp,
                history_count: count
            };
            exports.handle(method, url, data);
        };
        window.onpopstate({});
    }
    else {
        // This browser has no html5  history support, attempt to
        // enhance the page anyway
        // TODO: figure out the data from the initial request as this
        // re-rendering might wipe relevant data from the response
        // TODO: figure out the method from the initial request
        // because the initial request may have been a POST (pointing to
        // an update function instead of the show this GET might render)
        //
        // - perhaps use cookies to pass the method and data back to the client?
        //
        exports.handle('GET', exports.getAppURL(), {});
    }

    // TODO: should this be after userCtx is available??
    // call init on app too
    events.emit('init');
};


/**
 * Extracts groups from a url, eg:
 * '/some/path' with pattern '/some/:name' -> {name: 'path'}
 *
 * @name rewriteGroups(pattern, url)
 * @param {String} pattern
 * @param {String} url
 * @returns {Object}
 * @api public
 */

exports.rewriteGroups = function (pattern, url) {
    var pathname = urlParse(url).pathname;
    var re = new RegExp(
        '^' + pattern.replace(/:\w+/g, '([^/]+)').replace(/\*/g, '.*') + '$'
    );
    var m = re.exec(pathname);
    if (!m) {
        return [];
    }
    var values = m.slice(1);
    var keys = [];
    var matches = pattern.match(/:\w+/g) || [];
    for (var i = 0; i < matches.length; i++) {
        keys.push(matches[i].substr(1));
    }
    var groups = {};
    for (var j = 0; j < keys.length; j++) {
        groups[keys[j]] = values[j];
    }
    return groups;
};

/**
 * Extracts a splat value from a rewrite pattern and matching URL.
 *
 * @name rewriteSplat(pattern, url)
 * @param {String} pattern
 * @param {String} url
 * @returns {String}
 * @api public
 */

exports.rewriteSplat = function (pattern, url) {
    // splats are only supported at the end of a rewrite pattern
    if (pattern.charAt(pattern.length - 1) === '*') {
        var re = new RegExp(pattern.substr(0, pattern.length - 1) + '(.*)');
        var match = re.exec(url);
        if (match) {
            return match[1];
        }
    }
};


/**
 * Attempts to match rewrite from patterns to a URL, returning the
 * matching rewrite object if successful.
 *
 * @name matchURL(method, url)
 * @param {String} method
 * @param {String} url
 * @returns {Object}
 * @api public
 */

exports.matchURL = function (method, url) {
    var pathname = urlParse(url).pathname;
    var rewrites = exports._rewrites;
    for (var i = 0; i < rewrites.length; i++) {
        var r = rewrites[i];
        if (!r.method || method === r.method) {
            var from = r.from;
            from = from.replace(/\*$/, '(.*)');
            from = from.replace(/:\w+/g, '([^/]+)');
            var re = new RegExp('^' + from + '$');
            if (re.test(pathname)) {
                return r;
            }
        }
    }
};

/**
 * Replace group names in a string with the value of that group
 * eg: "/:name" with groups {name: 'test'} -> "/test"
 *
 * @name replaceGroups(val, groups, splat)
 * @param {String} val
 * @param {Object} groups
 * @param {String} splat
 * @returns {String}
 * @api public
 */

exports.replaceGroups = function (val, groups, splat) {
    var k, match, result = val;

    if (typeof val === 'string') {
        result = val.split('/');
        for (var i = 0; i < result.length; i++) {
            match = false;
            for (k in groups) {
                if (result[i] === ':' + k) {
                    result[i] = decodeURIComponent(groups[k]);
                    match = true;
                }
            }
            if (!match && result[i] === '*') {
                result[i] = splat;
            }
        }
        result = result.join('/');
    }
    else if (val.length) {
        result = val.slice();
        for (var j = 0; j < val.length; j++) {
            match = false;
            for (k in groups) {
                if (val[j] === ':' + k) {
                    result[j] = decodeURIComponent(groups[k]);
                    match = true;
                }
            }
            if (!match && val[j] === '*') {
                result[j] = splat;
            }
        }
    }
    return result;
};


/**
 * Creates a new request object from a url and matching rewrite object.
 * Query parameters are automatically populated from rewrite pattern.
 *
 * @name createRequest(method, url, data, match, callback)
 * @param {String} method
 * @param {String} url
 * @param {Object} data
 * @param {Object} match
 * @param {Function} callback
 * @api public
 */

exports.createRequest = function (method, url, data, match, callback) {
    var groups = exports.rewriteGroups(match.from, url);
    var query = urlParse(url, true).query || {};
    var k;
    if (match.query) {
        for (k in match.query) {
            if (match.query.hasOwnProperty(k)) {
                query[k] = exports.replaceGroups(match.query[k], groups);
            }
        }
    }
    if (groups) {
        for (k in groups) {
            if (groups.hasOwnProperty(k)) {
                query[k] = decodeURIComponent(groups[k]);
            }
        }
    }
    // splats are available for rewriting match.to, but not accessible on
    // the request object (couchdb 1.1.x), storing in a separate variable
    // for now
    var splat = exports.rewriteSplat(match.from, url);
    var to = exports.replaceGroups(match.to, query, splat);
    var req = {
        method: method,
        query: query,
        headers: {},
        path: to.split('/'),
        client: true,
        initial_hit: utils.initial_hit,
        cookie: cookies.readBrowserCookies()
    };
    if (data) {
        req.form = data;
    }

    db.newUUID(100, function (err, uuid) {
        if (err) {
            return callback(err);
        }
        req.uuid = uuid;

        if (utils.userCtx) {
            req.userCtx = utils.userCtx;
            return callback(null, req);
        }
        else {
            session.info(function (err, session) {
                if (err) {
                    return callback(err);
                }
                req.userCtx = session.userCtx;
                callback(null, req);
            });
        }
    });
};


/**
 * Handles return values from show / list / update functions
 */

exports.handleResponse = function (req, res) {
    if (req && typeof res === 'object') {
        if (res.headers) {
            if (res.headers['Set-Cookie']) {
                document.cookie = res.headers['Set-Cookie'];
            }
            var loc = res.headers['Location'];
            if (loc && _.indexOf([301, 302, 303, 307], res.code) !== -1) {
                if (exports.isAppURL(loc)) {
                    // reset method to GET unless response is a 307
                    var method = res.code === 307 ? req.method || 'GET': 'GET';
                    exports.setURL(method, exports.appPath(loc));
                }
                else {
                    document.location = loc;
                }
            }
        }
    }
};


/**
 * Fetches the relevant document and calls the named show function.
 *
 * @name runShowBrowser(req, name, docid, callback)
 * @param {Object} req
 * @param {String} name
 * @param {String} docid
 * @param {Function} callback
 * @api public
 */

exports.runShowBrowser = function (req, name, docid, callback) {
    var result;
    var fn = exports._shows[name];
    if (!fn) {
        throw new Error('Unknown show function: ' + name);
    }

    var info = {
        type: 'show',
        name: name,
        target: docid,
        query: req.query,
        fn: fn
    };
    events.emit('beforeResource', info);

    if (docid) {
        var appdb = db.use(exports.getDBURL(req));
        appdb.getDoc(docid, req.query, function (err, doc) {
            var current_req = (utils.currentRequest() || {});
            if (current_req.uuid === req.uuid) {
                if (err) {
                    return callback(err);
                }
                var res = exports.runShow(fn, doc, req);
                events.emit('afterResponse', info, req, res);
                if (res) {
                    exports.handleResponse(req, res);
                }
                else {
                    // returned without response, meaning cookies won't be set
                    // by handleResponseHeaders
                    if (flashmessages && req.outgoing_flash_messages) {
                        flashmessages.setCookieBrowser(
                            req, req.outgoing_flash_messages
                        );
                    }
                }
                callback();
            }
        });
    }
    else {
        var res = exports.runShow(fn, null, req);
        events.emit('afterResponse', info, req, res);
        if (res) {
            exports.handleResponse(req, res);
        }
        else {
            // returned without response, meaning cookies won't be set by
            // handleResponseHeaders
            if (flashmessages && req.outgoing_flash_messages) {
                flashmessages.setCookieBrowser(
                    req, req.outgoing_flash_messages
                );
            }
        }
        callback();
    }
};

/**
 * Helper for runShow/runList.
 *
 * @name parseResponse(req, res)
 * @param {Object} req
 * @param {Object} res
 * @api public
 */

exports.parseResponse = function (req, res) {
    var ids = _.without(_.keys(res), 'title', 'code', 'headers', 'body');
    if (req.client) {
        if (res.title) {
            document.title = res.title;
        }
        _.each(ids, function (id) {
            $('#' + id).html(res[id]);
        });
    }
    else if (!res.body) {
        var context = {title: res.title || ''};
        _.each(ids, function (id) {
            context[id] = res[id];
        });
        if (!templates) {
            throw new Error(
                'Short-hand response style requires template module'
            );
        }
        var body = templates.render(BASE_TEMPLATE, req, context);
        res = {
            body: body,
            code: res.code || 200,
            headers: res.headers
        };
    }
    return {
        body: res.body,
        code: res.code,
        headers: res.headers
    };
};

/**
 * Runs a show function with the given document and request object,
 * emitting relevant events. This function runs both server and client-side.
 *
 * @name runShow(fn, doc, req)
 * @param {Function} fn
 * @param {Object} doc
 * @param {Object} req
 * @api public
 */

exports.parseResponse = function (req, res) {
    var ids = _.without(_.keys(res), 'title', 'code', 'headers', 'body');
    if (req.client) {
        if (res.title) {
            document.title = res.title;
        }
        _.each(ids, function (id) {
            $('#' + id).html(res[id]);
        });
    }
    else if (!res.body) {
        var context = {title: res.title || ''};
        _.each(ids, function (id) {
            context[id] = res[id];
        });
        if (!templates) {
            throw new Error(
                'Short-hand response style requires templates module'
            );
        }
        var body = templates.render(BASE_TEMPLATE, req, context);
        res = {
            body: body,
            code: res.code || 200,
            headers: res.headers
        };
    }
    return {
        body: res.body,
        code: res.code,
        headers: res.headers
    };
};

exports.runShow = function (fn, doc, req) {
    if (flashmessages) {
        req = flashmessages.updateRequest(req);
    }
    utils.currentRequest(req);
    var info = {
        type: 'show',
        name: req.path[1],
        target: req.path[2],
        query: req.query,
        fn: fn
    };
    events.emit('beforeRequest', info, req);
    var res = fn(doc, req);

    if (!(res instanceof Object)) {
        res = {code: 200, body: res};
    }
    else {
        res = exports.parseResponse(req, res);
    }
    events.emit('beforeResponseStart', info, req, res);
    events.emit('beforeResponseData', info, req, res, res.body || '');

    if (flashmessages) {
        res = flashmessages.updateResponse(req, res);
    }
    req.response_received = true;
    return res;
};

/**
 * Fetches the relevant document and calls the named update function.
 *
 * @name runUpdateBrowser(req, name, docid, callback)
 * @param {Object} req
 * @param {String} name
 * @param {String} docid
 * @param {Function} callback
 * @api public
 */

exports.runUpdateBrowser = function (req, name, docid, callback) {
    var result;
    var fn = exports._updates[name];
    if (!fn) {
        throw new Error('Unknown update function: ' + name);
    }

    var info = {
        type: 'update',
        name: name,
        target: docid,
        query: req.query,
        fn: fn
    };
    events.emit('beforeResource', info);

    if (docid) {
        var appdb = db.use(exports.getDBURL(req));
        appdb.getDoc(docid, req.query, function (err, doc) {
            var current_req = (utils.currentRequest() || {});
            if (current_req.uuid === req.uuid) {
                if (err) {
                    return callback(err);
                }
                exports.runUpdate(fn, doc, req, function (err, res) {
                    if (err) {
                        events.emit('updateFailure', err, info, req, res, doc);
                        return callback(err);
                    }
                    events.emit('afterResponse', info, req, res);
                    if (res) {
                        exports.handleResponse(req, res[1]);
                    }
                    else {
                        // returned without response, meaning cookies won't be
                        // set by handleResponseHeaders
                        if (flashmessages && req.outgoing_flash_messages) {
                            flashmessages.setCookieBrowser(
                                req, req.outgoing_flash_messages
                            );
                        }
                    }
                    callback();
                });
            }
        });
    }
    else {
        exports.runUpdate(fn, null, req, function (err, res) {
            if (err) {
                events.emit('updateFailure', err, info, req, res, null);
                return callback(err);
            }
            events.emit('afterResponse', info, req, res);
            if (res) {
                exports.handleResponse(req, res[1]);
            }
            else {
                // returned without response, meaning cookies won't be set by
                // handleResponseHeaders
                if (flashmessages && req.outgoing_flash_messages) {
                    flashmessages.setCookieBrowser(
                        req, req.outgoing_flash_messages
                    );
                }
            }
            callback();
        });
    }
};

/**
 * Runs a update function with the given document and request object,
 * emitting relevant events. This function runs both server and client-side.
 *
 * @name runUpdate(fn, doc, req)
 * @param {Function} fn
 * @param {Object} doc
 * @param {Object} req
 * @api public
 */

exports.runUpdate = function (fn, doc, req, cb) {
    if (flashmessages) {
        req = flashmessages.updateRequest(req);
    }
    utils.currentRequest(req);
    var info = {
        type: 'update',
        name: req.path[1],
        target: req.path[2],
        query: req.query,
        fn: fn
    };
    events.emit('beforeRequest', info, req);
    var val = fn(doc, req);

    var res = val ? val[1]: null;
    if (!(res instanceof Object)) {
        res = {code: 200, body: res};
    }
    else {
        res = exports.parseResponse(req, res);
    }
    events.emit('beforeResponseStart', info, req, res);
    events.emit('beforeResponseData', info, req, res, res.body || '');

    if (flashmessages) {
        res = flashmessages.updateResponse(req, res);
    }
    var r = [val ? val[0]: null, res];
    if (req.client && r[0]) {
        var appdb = db.use(exports.getDBURL(req));
        appdb.saveDoc(r[0], function (err, res) {
            if (err) {
                return cb(err);
            }
            req.response_received = true;
            cb(null, r);
        });
    }
    else {
        req.response_received = true;
        cb(null, r);
    }
};


/**
 * Creates a fake head object from view results for passing to a list function
 * being run client-side.
 *
 * @name createHead(data)
 * @param {Object} data
 * @returns {Object}
 * @api public
 */

exports.createHead = function (data) {
    var head = {};
    for (var k in data) {
        if (k !== 'rows') {
            head[k] = data[k];
        }
    }
    return head;
};


/**
 * Fetches the relevant view and calls the named list function with the results.
 *
 * @name runListBrowser(req, name, view, callback)
 * @param {Object} req
 * @param {String} name
 * @param {String} view
 * @param {Function} callback
 * @api public
 */

exports.runListBrowser = function (req, name, view, callback) {
    var fn = exports._lists[name];
    if (!fn) {
        throw new Error('Unknown list function: ' + name);
    }

    var info = {
        type: 'list',
        name: name,
        target: view,
        query: req.query,
        fn: fn
    };
    events.emit('beforeResource', info);

    if (view) {
        // update_seq used in head parameter passed to list function
        req.query.update_seq = true;
        var appdb = db.use(exports.getDBURL(req));
        appdb.getView(settings.name, view, req.query, function (err, data) {
            var current_req = (utils.currentRequest() || {});
            if (current_req.uuid === req.uuid) {
                if (err) {
                    return callback(err);
                }
                getRow = function () {
                    return data.rows.shift();
                };
                start = function (res) {
                    exports.handleResponse(req, res);
                };
                var head = exports.createHead(data);
                var res = exports.runList(fn, head, req);
                events.emit('afterResponse', info, req, res);
                if (res) {
                    exports.handleResponse(req, res);
                }
                else {
                    // returned without response, meaning cookies won't be set
                    // by handleResponseHeaders
                    if (flashmessages && req.outgoing_flash_messages) {
                        flashmessages.setCookieBrowser(
                            req, req.outgoing_flash_messages
                        );
                    }
                }
                getRow = function () {
                    return null;
                };
                callback();
            }
        });
    }
    // TODO: check if it should throw here
    else {
        var e = new Error('no view specified');
        if (callback) {
            callback(e);
        }
        else {
            throw e;
        }
    }
};

/**
 * Runs a list function with the given document and request object,
 * emitting relevant events. This function runs both server and client-side.
 *
 * @name runList(fn, head, req)
 * @param {Function} fn
 * @param {Object} head
 * @param {Object} req
 * @api public
 */

exports.runList = function (fn, head, req) {
    if (flashmessages) {
        req = flashmessages.updateRequest(req);
    }
    utils.currentRequest(req);
    var info = {
        type: 'list',
        name: req.path[1],
        target: req.path[2],
        query: req.query,
        fn: fn
    };
    // cache response from start call
    var start_res;
    var _start = start;
    start = function (res) {
        start_res = res;
        events.emit('beforeResponseStart', info, req, res);
        if (res.body) {
            events.emit('beforeResponseData', info, req, res, res.body);
        }
        if (flashmessages) {
            res = flashmessages.updateResponse(req, res);
        }
        _start(res);
    };
    var _send = send;
    send = function (data) {
        if (!start_res.body) {
            start_res.body = '';
        }
        // TODO: does it make sense to store data here and use up memory
        // on the server?
        start_res.body += data;
        events.emit('beforeResponseData', info, req, start_res, data);
        _send(data);
    };
    events.emit('beforeRequest', info, req);
    var val = fn(head, req);

    if (val instanceof Object) {
        val = exports.parseResponse(req, val).body;
    }
    if (!start_res) {
        start_res = {code: 200, body: val};
        events.emit('beforeResponseStart', info, req, start_res);
        events.emit('beforeResponseData', info, req, start_res, val);
        start = _start;
        send = _send;
    }
    else {
        start_res.body = start_res.body ? start_res.body + val: val;
        events.emit('beforeResponseData', info, req, start_res, val);
    }
    start = _start;
    send = _send;
    req.response_received = true;
    return val;
};


/**
 * Creates a request object for the url and runs appropriate show, list or
 * update functions.
 *
 * @name handle(method, url, data)
 * @param {String} method
 * @param {String} url
 * @param {Object} data
 * @api public
 */

exports.handle = function (method, url, data) {
    if (exports.unknown_target) {
        // if we're currently on an unknown rewrite target page (such as a
        // static .html file), don't attempt to intercept the request
        window.location = exports.getBaseURL() + url;
        return;
    }
    var match = exports.matchURL(method, url);
    if (match) {
        var parsed = urlParse(url);
        exports.createRequest(method, url, data, match, function (err, req) {
            if (err) {
                throw err;
            }
            var msg = method + ' ' + url + ' -> ' +
                JSON.stringify(req.path.join('/')) + ' ' +
                JSON.stringify(req.query);

            if (data) {
                msg += ' data: ' + JSON.stringify(data);
            }

            console.log(msg);
            utils.currentRequest(req);

            var after = function () {
                if (parsed.hash) {
                    // we have to handle in-page anchors manually because we've
                    // hijacked the hash part of the url
                    // TODO: don't re-handle the page if only the hash has
                    // changed

                    // test if a valid element name or id
                    if (/#[A-Za-z_\-:\.]+/.test(parsed.hash)) {
                        var el = $(parsed.hash);
                        if (el.length) {
                            window.scrollTo(0, el.offset().top);
                        }
                    }
                    else if (parsed.hash === '#') {
                        // scroll to top of page
                        window.scrollTo(0, 0);
                    }
                    // TODO: handle invalid values?
                }
            };

            var src, fn, name;

            if (req.path[0] === '_show') {
                exports.runShowBrowser(
                    req, req.path[1], req.path.slice(2).join('/'), after
                );
                if (!utils.initial_hit) {
                    window.scrollTo(0, 0);
                }
            }
            else if (req.path[0] === '_list') {
                exports.runListBrowser(
                    req, req.path[1], req.path.slice(2).join('/'), after
                );
                if (!utils.initial_hit) {
                    window.scrollTo(0, 0);
                }
            }
            else if (req.path[0] === '_update') {
                exports.runUpdateBrowser(
                    req, req.path[1], req.path.slice(2).join('/'), after
                );
                if (!utils.initial_hit) {
                    window.scrollTo(0, 0);
                }
            }
            else {
                console.log('Unknown rewrite target: ' + req.path.join('/'));
                if (!utils.initial_hit) {
                    var newurl = exports.getBaseURL() + url;
                    console.log('Opening new window for: ' + newurl);
                    // reset url
                    window.history.go(-1);
                    // open in new window, since this page is unlikely to have
                    // pushstate support and would break the back button
                    window.open(newurl);
                }
                else {
                    exports.unknown_target = true;
                    console.log(
                        'Initial hit is an uknown rewrite target, duality ' +
                        'will not fetch from server in order to avoid ' +
                        'redirect loop'
                    );
                }
            }
            utils.initial_hit = false;
        });
    }
    else {
        console.log(method + ' ' + url + ' -> [404]');
        window.location = exports.getBaseURL() + url;
        return;
    }

    /**
     * if google analytics is included on the page, and this url
     * has not been tracked (not the initial hit) then manually
     * track a page view. This is done consistently for hash-based
     * and pushState urls
     */
    if (window.pageTracker && !utils.initial_hit) {
        pageTracker._trackPageview(url);
    }
};


/**
 * Add a history entry for the given url, prefixed with the baseURL for the app.
 *
 * @name setURL(method, url, data)
 * @param {String} method
 * @param {String} url
 * @param {Object} data (optional)
 * @api public
 */

exports.setURL = function (method, url, data) {
    var fullurl = exports.getBaseURL() + url;
    var state = {
        method: method,
        data: data,
        timestamp: new Date().getTime(),
        history_count: window.history.length + 1
    };
    // this is the result of a direct call to setURL
    // (don't show confirmation dialog for unsafe states needing to re-submit)
    exports.set_called = true;

    /**
     * if the current request is unsafe, we replace it so clicking the back
     * button 'skips' it without showing a dialog.
     *
     * This means GET1, POST2, GET3 would result in a history of GET1, GET3.
     * Clicking back after GET3 wouldn't re-submit a form.
     *
     * Doing GET1, POST2, then clicking back and forward again would result
     * in a confirmation dialog asking if you want to re-submit.
     */

    var curr_state = exports.current_state;
    var curr_method = curr_state ? (curr_state.method || 'GET'): 'GET';

    if (curr_method !== 'GET' && curr_method !== 'HEAD') {
        // unsafe method on current request, replace it
        window.history.replaceState(state, document.title, fullurl);
    }
    else {
        // last request was safe, add a new entry in the history
        window.history.pushState(state, document.title, fullurl);
    }
    // manually fire popstate event
    window.onpopstate({state: state});
};


/**
 * This was moved to utils to avoid a circular dependency between
 * core.js and db.js... however, it should be accessed via the core.js module
 * as it may get moved back once circular dependencies are fixed in couchdb's
 * commonjs implementation.
 */

exports.getBaseURL = utils.getBaseURL;

exports.getDBURL = function (req) {
    return exports.getBaseURL(req) + '/_db';
};


/**
 * Gets the current app-level URL (without baseURL prefix).
 *
 * @name getAppURL()
 * @returns {String}
 * @api public
 */

exports.getAppURL = function () {
    return exports.appPath(exports.getURL());
};

/**
 * Gets the window location coerced to a string (for IE)
 *
 * @name getURL()
 * @returns {String}
 * @api public
 */

exports.getURL = function () {
    return '' + window.location;
};


/**
 * Tests if two urls are of the same origin. Accepts parsed url objects
 * or strings as arguments.
 *
 * @name sameOrigin(a, b)
 * @param a
 * @param b
 * @returns Boolean
 * @api public
 */

exports.sameOrigin = function (a, b) {
    var ap = (typeof a === 'string') ? urlParse(a): a;
    var bp = (typeof b === 'string') ? urlParse(b): b;
    // if one url is relative to current origin, return true
    if (ap.protocol === undefined || bp.protocol === undefined) {
        return true;
    }
    return (
        ap.protocol === bp.protocol &&
        ap.hostname === bp.hostname &&
        ap.port === bp.port
    );
};

/**
 * Converts a full url to an app-level url (without baseURL prefix).
 * example: {baseURL}/some/path -> /some/path
 *
 * @name appPath(p)
 * @param {String} p
 * @returns {String}
 * @api public
 */

exports.appPath = function (p) {
    // hash links need current URL prepending
    if (p.charAt(0) === '#') {
        var newurl = urlParse(exports.getURL());
        newurl.hash = p;
        return exports.appPath(urlFormat(newurl));
    }
    else if (p.charAt(0) === '?') {
        // if the request is just a query, then prepend the current app path
        // as a browser would
        var newurl2 = urlParse(exports.getURL());
        delete newurl2.query;
        delete newurl2.search;
        delete newurl2.href;
        newurl2.search = p;
        return exports.appPath(urlFormat(newurl2));
    }
    else if (/\w+:/.test(p)) {
        // include protocol
        var origin = p.split('/').slice(0, 3).join('/');
        // coerce window.location to a real string so we can use split in IE
        var loc = '' + window.location;
        if (origin === loc.split('/').slice(0, 3).join('/')) {
            // remove origin, set p to pathname only
            // IE often adds this to a tags, hence why we strip it out now
            p = p.substr(origin.length);
        }
        else {
            // not same origin, return original full path
            return p || '/';
        }
    }
    var base = exports.getBaseURL();
    if (p.substr(0, base.length) === base) {
        return p.substr(base.length) || '/';
    }
    return p || '/';
};


/**
 * Used to decide whether to handle a link or not. Should detect app vs.
 * external urls.
 *
 * @name isAppURL(url)
 * @param {String} url
 * @returns {Boolean}
 * @api public
 */

exports.isAppURL = function (url) {
    // coerce window.location to a real string in IE
    var loc = '' + window.location;
    var base = exports.getBaseURL();
    if (!exports.sameOrigin(url, loc)) {
        return false;
    }
    var p = urlParse(url).pathname;
    if (!p) {
        return false;
    }
    if (p.length < base.length) {
        return false;
    }
    if (p.length === base.length) {
        return p === base;
    }
    return p.substr(0, base.length + 1) === base + '/';
};


// make sure currentRequest() always provided the latest session information
events.on('sessionChange', function (userCtx, req) {
    var curr_req = utils.currentRequest();
    if (curr_req) {
        curr_req.userCtx = userCtx;
        utils.currentRequest(curr_req);
    }
});
