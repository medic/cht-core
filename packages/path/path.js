/**
 * Path functions ported from node.js to work in CouchDB and the browser.
 * This module is used internally by Kanso, although you can use it in your
 * apps too if you find the functions useful.
 *
 * @module
 */

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

/**
 * From node.js v0.2.6
 */

/**
 * Joins multiple paths together using '/'. Accepts a arbitrary number of
 * strings as arguments, returning the joined result as a single string.
 *
 * @name join(path, [...])
 * @returns {String}
 * @api public
 */

exports.join = function () {
    return exports.normalize(Array.prototype.join.call(arguments, "/"));
};

/**
 * Normalizes a path split into an array, taking care of '..' and '.' parts.
 *
 * @name normalizeArray(parts, [keepBlanks])
 * @param {Array} parts
 * @param {Boolean} keepBlanks
 * @returns {Array}
 * @api public
 */

exports.normalizeArray = function (parts, keepBlanks) {
    var directories = [], prev;
    for (var i = 0, l = parts.length - 1; i <= l; i++) {
        var directory = parts[i];

        // if it's blank, but it's not the first thing, and not the last
        // thing, skip it.
        if (directory === "" && i !== 0 && i !== l && !keepBlanks) {
            continue;
        }

        // if it's a dot, and there was some previous dir already, then
        // skip it.
        if (directory === "." && prev !== undefined) {
            continue;
        }

        // if it starts with "", and is a . or .., then skip it.
        if (directories.length === 1 && directories[0] === "" && (directory === "." || directory === "..")) {
            continue;
        }

        if (directory === ".." && directories.length && prev !== ".." && prev !== "." && prev !== undefined && (prev !== "" || keepBlanks)) {
            directories.pop();
            prev = directories.slice(-1)[0];
        }
        else {
            if (prev === ".") {
                directories.pop();
            }
            directories.push(directory);
            prev = directory;
        }
    }
    return directories;
};

/**
 * Normalize a string path, taking care of '..' and '.' parts.
 *
 * @name normalize(path, [keepBlanks])
 * @param {String} path
 * @param {Boolean} keepBlanks
 * @returns string
 * @api public
 */

exports.normalize = function (path, keepBlanks) {
    return exports.normalizeArray(path.split("/"), keepBlanks).join("/");
};

/**
 * Return the directory name of a path. Similar to the Unix dirname command.
 *
 * @name dirname(path)
 * @param {String} path
 * @returns {String}
 * @api public
 */

exports.dirname = function (path) {
    if (path.length > 1 && '/' === path[path.length - 1]) {
        path = path.replace(/\/+$/, '');
    }
    var lastSlash = path.lastIndexOf('/');
    switch (lastSlash) {
    case -1:
        return '.';
    case 0:
        return '/';
    default:
        return path.substring(0, lastSlash);
    }
};

/**
 * Return the last portion of a path. Similar to the Unix basename command.
 *
 * **Example**
 * <pre><code class="javascript">path.basename('/foo/bar/baz/asdf/quux.html')
 * // returns
 * 'quux.html'
 *
 * path.basename('/foo/bar/baz/asdf/quux.html', '.html')
 * // returns
 * 'quux'
 * </code></pre>
 *
 * @name basename(path, ext)
 * @param {String} path
 * @param {String} ext
 * @returns {String}
 * @api public
 */

exports.basename = function (path, ext) {
    var f = path.substr(path.lastIndexOf("/") + 1);
    if (ext && f.substr(-1 * ext.length) === ext) {
        f = f.substr(0, f.length - ext.length);
    }
    return f;
};

/**
 * Return the extension of the path. Everything after the last '.' in the last
 * portion of the path. If there is no '.' in the last portion of the path or
 * the only '.' is the first character, then it returns an empty string.
 *
 * <pre><code class="javascript">path.extname('index.html')
 * // returns
 * '.html'
 *
 * path.extname('index')
 * // returns
 * ''
 * </code></pre>
 *
 * @name extname(path)
 * @param {String} path
 * @returns {String}
 * @api public
 */

exports.extname = function (path) {
    var dot = path.lastIndexOf('.'),
        slash = path.lastIndexOf('/');
    // The last dot must be in the last path component, and it (the last dot)
    // must not start the last path component (i.e. be a dot that signifies a
    // hidden file in UNIX).
    return dot <= slash + 1 ? '' : path.substring(dot);
};

