/**
 * Functions related to the finding, loading and manipulation of Kanso packages
 *
 * @module
 */

var settings = require('./settings'),
    buildsteps = require('./buildsteps'),
    versions = require('./versions'),
    async = require('async'),
    logger = require('./logger'),
    utils = require('./utils'),
    path = require('path'),
    pathExists = require('fs').exists || require('path').exists,
    semver = require('semver'),
    events = require('events'),
    _ = require('underscore')._;


/**
 * Loads a package, passing it through all plugin preprocessors before returning
 * the resulting document.
 *
 * Each preprocessor is passed the path to the package directory, the settings
 * loaded from its kanso.json file and the document returned from the previous
 * preprocessor.
 *
 * @param {String} name - the name / path of the package to lookup
 * @param {Boolean} root - whether this is the root package
 * @param {Array} paths - an array of package lookup paths
 * @param {String} source - the current package that paths are relative to
 * @param {Object} options - options to override values in package cfg
 * @param {Function} callback
 */

exports.load = function (name, paths, source, options, callback) {
    // package cache to load metadata into
    var pcache = {};

    // load kanso.json files for all dependencies recursively
    logger.info('Reading dependency tree...');
    exports.readMeta(pcache, name, null, paths, source, name, function (err) {
        if (err) {
            return callback(err);
        }

        // extend kanso.json values with options passed from command-line
        exports.merge(pcache[name].cfg, options, [], true);

        // set root package's root property
        pcache[name].root = true;

        // store a reference to the root path and cfg
        var rpath = pcache[name].path;
        var rcfg = pcache[name].cfg;

        // preprocess all packages in parallel
        var packages = Object.keys(pcache);
        async.map(packages, function (pkgname, cb) {

            var pkg = pcache[pkgname];
            if (utils.isSubPath(pkg.path, process.cwd())) {
                // report relative path if below current directory
                logger.info('loading', utils.relpath(pkg.path, process.cwd()));
            }
            else {
                // report absolute path
                logger.info('loading', pkg.path);
            }
            exports.preprocess(pcache, pkg, cb);

        },
        function (err, docs) {
            if (err) {
                return callback(err);
            }

            // combine all preprocessed design docs
            var doc = docs.reduce(function (a, b) {
                return exports.merge(a, b);
            }, {});

            // postprocess result
            exports.postprocess(pcache, rpath, rcfg, doc, function (err, doc) {
                if (err) {
                    return callback(err);
                }
                // add values from root packages's kanso.json
                if (!doc.kanso) {
                    doc.kanso = {};
                }
                doc.kanso.config = rcfg;
                doc.kanso.build_time = utils.ISODateString(new Date());
                utils.getKansoVersion(function (err, ver) {
                    if (err) {
                        return callback(err);
                    }
                    doc.kanso.kanso_version = ver;
                    callback(null, utils.stringifyFunctions(doc), rcfg);
                });
            });
        });
    });
};


/**
 * Resolve the target package and its dependencies, reading the kanso.json files
 * and adding them to cache object.
 *
 * @param {Object} cache - an object to add packages metadata and path info to
 * @param {String} name - name of package to load
 * @param {String} range - acceptable version range for target package
 * @param {Array} paths - lookup paths for finding packages
 * @param {String} source - the original location for resolving relative paths
 * @param {String} parent - name of the parent package (if any)
 * @param {Function} cb - callback function
 */

exports.readMeta = function (cache, name, range, paths, source, parent, cb) {
    var cached = cache[name] = {
        ready: false,
        ranges: [range],
        parent: parent,
        ev: new events.EventEmitter()
    };
    cached.ev.setMaxListeners(10000);
    exports.resolve(name, range, paths, source, function (err, v, doc, p) {
        if (err) {
            return cb(err);
        }
        cached.path = p;
        settings.load(p, function (err, cfg) {
            cached.cfg = cfg;
            cached.ready = true;
            cached.ev.emit('ready');
            paths = paths.concat([p + '/packages']);
            exports.readMetaDependencies(cache, cache[name], paths, source, cb);
        });
    });
};


/**
 * Read dependencies of a cached package loaded by the readMeta function.
 *
 * @param {Object} cache - an object to add packages metadata and path info to
 * @param {Object} pkg - the cached package object
 * @param {Array} paths - lookup paths for finding packages
 * @param {String} source - the original location for resolving relative paths
 * @param {Function} callback - the callback function
 */

exports.readMetaDependencies = function (cache, pkg, paths, source, callback) {
    var deps = Object.keys(pkg.cfg.dependencies || {});

    async.forEach(deps, function (dep, cb) {
        var range = pkg.cfg.dependencies[dep];

        function testVersion(cached, range) {
            if (!semver.satisfies(cached.cfg.version, range)) {
                return callback(new Error(
                    'Conflicting version requirements for ' +
                    cached.cfg.name + ':\n' +
                    'Version ' + cached.cfg.version + ' loaded by "' +
                    cached.parent + '" but "' + pkg.cfg.name +
                    '" requires ' + range
                ));
            }
        }
        if (cache[dep]) {
            var cached = cache[dep];
            cached.ranges.push(range);
            if (cached.ready) {
                testVersion(cached, range);
                // return loaded copy
                return cb(null, cached);
            }
            else {
                // wait for existing request to load
                cached.ev.on('ready', function () {
                    testVersion(cached, range);
                    return cb(null, cached);
                });
                return;
            }
        }
        else {
            exports.readMeta(
                cache, dep, range, paths, source, pkg.cfg.name, cb
            );
        }
    }, callback);
};


/**
 * Gets all applicable preprocessors from a cached packages dependencies,
 * returning an preprocessors in an object keyed by package name then
 * preprocessor name.
 *
 * @param {Object} cache - the cached package information
 * @param {Object} pkg - package object in the cache to get preprocessors for
 * @returns {Object}
 */

exports.getPreprocessors = function (cache, pkg) {
    var pre = {};
    var deps = Object.keys(pkg.cfg.dependencies || {});

    deps.forEach(function (dep) {
        var cfg = cache[dep].cfg;
        if (cfg.preprocessors) {
            for (var k in cfg.preprocessors) {
                if (!pre[cfg.name]) {
                    pre[cfg.name] = {};
                }
                if (!pre[cfg.name][k]) {
                    pre[cfg.name][k] = require(
                        utils.abspath(cfg.preprocessors[k], cache[dep].path)
                    );
                }
            }
        }
    });

    return pre;
};


/**
 * Runs preprocessors for the cached package object, returning the resulting
 * preprocessed design doc to the callback.
 *
 * @param {Object} cache - cached package objects
 * @param {Object} pkg - the package object to preprocess
 * @param {Function} callback
 */

exports.preprocess = function (cache, pkg, callback) {
    var pre = exports.getPreprocessors(cache, pkg);

    var root = pkg.root,
        p = pkg.path,
        cfg = pkg.cfg;

    var doc = {};
    var errs = [];

    var bm = new buildsteps.BuildManager([root, p, cfg], doc);
    bm.addAll(pre);
    bm.on('error', function (err, step) {
        errs.push({err: err, step: step});
    });
    bm.on('beforeStep', function (pkg, name) {
        if (root) {
            logger.info('preprocessor', pkg + '/' + name);
        }
        logger.debug(cfg.name + ' - starting preprocessor', pkg + '/' + name);
    });
    bm.on('step', function (pkg, name) {
        logger.debug(cfg.name + ' - completed preprocessor', pkg + '/' + name);
    });
    bm.on('end', function (doc, complete, incomplete) {
        if (errs.length) {
            errs.forEach(function (e) {
                logger.error(
                    'Error when running preprocessor: "' +
                    e.step.toString() + '"'
                );
                //logger.error(e.err);
            });
            return callback(errs[0].err);
        }
        if (incomplete.length) {
            incomplete.forEach(function (s) {
                logger.warning('Preprocessor failed to run: ' + s.toString());
            });
        }
        return callback(null, doc);
    });
    bm.run();
};


/**
 * Get all exported postprocessor functions from the cache, keyed by package
 * name then postprocessor name.
 *
 * @param {Object} cache - the cached package objects
 * @returns {Object}
 */

exports.getPostprocessors = function (cache) {
    var post = {};
    var packages = Object.keys(cache || {});

    packages.forEach(function (name) {
        var cfg = cache[name].cfg;
        if (cfg.postprocessors) {
            for (var k in cfg.postprocessors) {
                if (!post[cfg.name]) {
                    post[cfg.name] = {};
                }
                if (!post[cfg.name][k]) {
                    post[cfg.name][k] = require(
                        utils.abspath(cfg.postprocessors[k], cache[name].path)
                    );
                }
            }
        }
    });

    return post;
};


/**
 * Run all postprocessors on the fully merged preprocessed design doc, returns
 * the postprocessed doc to the callback.
 *
 * @param {Object} cache - the cached package objects
 * @param {String} p - the path of the root package
 * @param {Object} cfg - the kanso.json settings of the root package
 * @param {Object} doc - the preprocessed and merged design doc
 * @param {Function} callback
 */

exports.postprocess = function (cache, p, cfg, doc, callback) {
    var post = exports.getPostprocessors(cache);

    var errs = [];
    var bm = new buildsteps.BuildManager([true, p, cfg], doc);
    bm.addAll(post);
    bm.on('error', function (err, step) {
        errs.push({err: err, step: step});
    });
    bm.on('beforeStep', function (pkg, name) {
        logger.info('postprocessor', pkg + '/' + name);
    });
    bm.on('step', function (pkg, name) {
        logger.debug('completed postprocessor', pkg + '/' + name);
    });
    bm.on('end', function (doc, complete, incomplete) {
        if (errs.length) {
            logger.error(
                'Error when running postprocessor: "' +
                errs[0].step.toString() + '"'
            );
            // this gets displayed by the command running package.load
            //logger.error(errs[0].err);
            return callback(errs[0].err);
        }
        else if (incomplete.length) {
            incomplete.forEach(function (s) {
                logger.warning('Postprocessor failed to run: ' + s.toString());
            });
        }
        callback(null, doc);
    });
    bm.run();
};


/**
 * Deep-merge to design documents, throwing on conflicting properties. Objects
 * with different properties can be merged, but arrays can't be since there's
 * no way of knowing the correct order.
 *
 * @param {Object} a - merge target
 * @param {Object} b - merge source
 * @param {Array} path - (optional) used for reporting location of conflicts
 * @returns {Object}
 */

exports.merge = function (a, b, /*opt*/path, /*opt*/ignore_conflicts) {
    a = a || {};
    b = b || {};
    path = path || [];

    for (var k in b) {
        if (typeof b[k] === 'object' && !Array.isArray(b[k])) {
            a[k] = exports.merge(a[k], b[k], path.concat([k]));
        }
        else {
            if (a[k] && a[k] !== b[k] && !ignore_conflicts) {
                throw new Error(
                    'Conflicting property at: ' + path.concat([k]).join('.') +
                    '\nBetween: ' + JSON.stringify(a[k]) + ' and ' +
                    JSON.stringify(b[k])
                );
            }
            a[k] = b[k];
        }
    }
    return a;
};


/**
 * Generates an array of possible paths from the package name,
 * source package path and array of package lookup paths (from .kansorc)
 *
 * @param {String} name - the name / path of the package to lookup
 * @param {String} source - the current package that paths are relative to
 * @param {Array} paths - an array of package lookup paths
 * @returns {Array}
 */

exports.resolveCandidates = function (name, source, paths) {
    var candidates = [];
    if (name[0] === '/') {
        // absolute path to a specific package directory
        candidates.push(name);
    }
    else if (name[0] === '.') {
        // relative path to a specific package directory
        candidates.push(path.normalize(path.join(source, name)));
    }
    else {
        // just a package name, use lookup paths
        candidates = candidates.concat(paths.map(function (dir) {
            return path.join(dir, name);
        }));
    }
    return candidates;
};


/**
 * Returns an object keyed by version number, containing the path and cfg
 * for each version, giving priority to paths earlier in the candidates list.
 *
 * eg, with candidates = [pathA, pathB], if both paths contained v1 of the
 * package, pathA and the kanso.json values from that path will be used for
 * that version, because it comes before pathB in the candidates array.
 *
 * @param {Array} candidates - an array of possible package paths
 * @param {Function} callback
 */

exports.availableVersions = function (candidates, callback) {
    var versions = {};
    async.forEach(candidates, function (c, cb) {
        pathExists(path.join(c, 'kanso.json'), function (exists) {
            if (exists) {
                settings.load(c, function (err, doc) {
                    if (err) {
                        return cb(err);
                    }
                    if (!versions[doc.version]) {
                        versions[doc.version] = {
                            path: c,
                            config: doc,
                            source: 'local'
                        };
                    }
                    cb();
                });
            }
            else {
                cb();
            }
        });
    },
    function (err) {
        callback(err, versions);
    });
};


/**
 * Looks up the path to a specified package, returning an error if not found.
 *
 * @param {String} name - the name / path of the package to lookup
 * @param {String} range - a version or range of versions to match against
 * @param {Array} paths - an array of package lookup paths
 * @param {String} source - the current package that paths are relative to
 * @param {Function} callback
 */

exports.resolve = async.memoize(function (name, ranges, paths, source, callback) {
    if (!Array.isArray(ranges)) {
        ranges = [ranges];
    }
    souce = source || process.cwd();
    var candidates = exports.resolveCandidates(name, source, paths);

    exports.availableVersions(candidates, function (err, matches) {
        if (err) {
            return callback(err);
        }
        var vers = Object.keys(matches);
        var highest = versions.maxSatisfying(vers, ranges);
        if (highest) {
            var m = matches[highest];
            return callback(null, highest, m.config, m.path);
        }
        if (vers.length) {
            var e = new Error(
                "Cannot find package '" + name + "' matching " +
                ranges.join(' && ') + "\n" +
                "Available versions: " + vers.join(', ')
            );
            e.missing = true;
            return callback(e);
        }
        else {
            var e = new Error("Cannot find package '" + name + "'");
            e.missing = true;
            return callback(e);
        }
    });
});
