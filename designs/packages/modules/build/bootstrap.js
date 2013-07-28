/*global window: false, $: false, pageTracker: false, kanso: true */

/**
 * Code required to bootstrap the browser CommonJS environment.
 */

(function (exports) {

    exports.moduleCache = {};

    exports.normalizePath = function (p) {
        var path = [];
        var parts = p.split('/');
        for (var i = 0; i < parts.length; i += 1) {
            if (parts[i] === '..') {
                path.pop();
            }
            else if (parts[i] !== '.') {
                path.push(parts[i]);
            }
        }
        return path.join('/');
    };

    exports.dirname = function (p) {
        if (p === '/') {
            return p;
        }
        var parts = p.split('/');
        parts.pop();
        if (parts.length === 1 && parts[0] === '') {
            return '/';
        }
        return parts.join('/');
    };

    exports.createRequire = function (current) {
        return function (target) {
            var path;
            if (target.charAt(0) === '.') {
                var dir = exports.dirname(current);
                path = exports.normalizePath(dir + '/' + target);
            }
            else {
                path = exports.normalizePath(target);
            }
            var m = kanso.moduleCache[path];
            if (!m) {
                throw new Error('No such module: ' + path);
            }
            if (!m.loaded) {
                m.exports = {};
                m.id = path;
                // TODO: property not provided by couchdb, but is by node:
                //m.require = exports.createRequire(path);
                // TODO: property not provided by couchdb, but is by node:
                //m.filename = '';
                // TODO: module properties provided by couchdb, but not by kanso
                // * current
                // * parent
                // set this to true *before* calling m.load so circular
                // requires don't blow the call stack
                m.loaded = true;
                //m.load(m, m.exports, m.require);
                m.load(m, m.exports, exports.createRequire(path));
            }
            return m.exports;
        };
    };

    if (typeof require === 'undefined') {
        // make require available globally, unless already in a commonjs
        // environment
        this.require = exports.createRequire('');
    }

}((typeof exports === 'undefined') ? this.kanso = {}: module.exports));


/**
 * CommonJS modules are wrapped and appended to this file.
 */
