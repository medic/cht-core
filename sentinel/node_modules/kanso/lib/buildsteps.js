/**
 * Tools for managing an evented bulid process, such as running pre/post
 * processors or merge rules.
 */


/**
 * Module dependencies
 */

var EventEmitter = require('events').EventEmitter,
    _ = require('underscore')._,
    node_util = require('util');


/**
 * Constructor for BuildManager Objects, used to run a build process built from
 * steps including before and after rules.
 *
 * @constructor
 */

function BuildManager (args, doc) {
    this.steps = [];
    this.args = args;
    this.doc = doc;
    this.ended = false;

    var that = this;
    this.on('step', function (pkg, name) {
        process.nextTick(function () {
            that.run();
        });
    });
    this.on('error', function (err) {
        that.end();
    });
};

/**
 * BuildManager is an event emitter with the following possible events:
 *
 * - step (pkg, name)
 *   a step has completed, the event also emits the package and step name.
 *
 * - error (err, step)
 *   a step resulted in an error, error object as first argument, step object
 *   (including .pkg and .name properties) as second argument.
 *
 * - end (completed, incomplete)
 *   always called at the end of processing (even if an error occurred)
 *   completed is an array of step objects (see error event) which finished
 *   processing successfully, incomplete is an array of step objects for steps
 *   which failed to run or complete
 */

node_util.inherits(BuildManager, EventEmitter);
exports.BuildManager = BuildManager;


/**
 * Checks if any steps are waiting for '*', if so it clears that requirement
 * and calls run() again, otherwise it emits an 'end' event.
 */

BuildManager.prototype.end = function () {
    if (this.ended) {
        return;
    }
    var s = this.finalSteps();
    if (s.length) {
        this.ended = false;
        this.prepareFinal(s);
        this.run();
    }
    else {
        var that = this;
        this.ended = true;
        process.nextTick(function () {
            that.emit('end', that.doc, that.completed(), that.incomplete());
        });
    }
};

/**
 * Returns all steps waiting for '*' before running
 *
 * @returns {Boolean}
 */

BuildManager.prototype.finalSteps = function () {
    return this.steps.filter(function (s) {
        if (s.after) {
            for (var i = 0, len = s.after.length; i < len; i++) {
                if (s.after[i] === '*') {
                    return true;
                }
            }
        }
        return false;
    });
};

/**
 * Clears '*' requirement for all given steps
 *
 * @param {Array} steps
 * @returns {Array}
 */

BuildManager.prototype.prepareFinal = function (steps) {
    return steps.map(function (s) {
        s.after = s.after.filter(function (a) {
            return a !== '*';
        });
        return s;
    });
};

/**
 * Checks requirements for each step, calling runStep on all steps
 * ready to run. If no steps are ready to run and no steps are currently in
 * progress, calls end().
 */

BuildManager.prototype.run = function () {
    this.reverseBefores();
    var that = this;
    var inprogress = 0;
    this.steps.forEach(function (s) {
        if (that.ready(s)) {
            inprogress++;
            that.runStep(s);
        }
        else if (s.inprogress) {
            inprogress++;
        }
    });
    if (!inprogress) {
        this.end();
    }
};

/**
 * Returns an array of completed steps
 *
 * @returns {Array}
 */

BuildManager.prototype.completed = function () {
    return this.steps.filter(function (s) {
        return s.complete;
    });
};

/**
 * Returns an array of incomplete steps
 *
 * @returns {Array}
 */

BuildManager.prototype.incomplete = function () {
    return this.steps.filter(function (s) {
        return !s.complete;
    });
};

/**
 * Tests if a step is ready to run.
 *
 * @param {Object} s
 * @returns {Boolean}
 */

BuildManager.prototype.ready = function (s) {
    if (s.complete || s.inprogress) {
        return false;
    }
    if (!s.after) { //&& !s.when) {
        return true;
    }

    if (s.after) {
        for (var i = 0, len = s.after.length; i < len; i++) {
            var a = s.after[i];
            if (a === '*') {
                return false;
            }
            if (!this.isComplete(this.getPackage(a), this.getName(a))) {
                return false;
            }
        }
    }
    /*
    if (s.when) {
        s.when()
    }
    */
    return true;
};

/**
 * Tests is a step or package is complete.
 *
 * @param {String} pkg
 * @param {String} name
 * @return {Boolean}
 */

BuildManager.prototype.isComplete = function (pkg, /*optional*/name) {
    var steps = this.getSteps(pkg, name);
    for (var i = 0, len = steps.length; i < len; i++) {
        if (!steps[i].complete) {
            return false;
        }
    }
    return true;
};

/**
 * Parses a step reference string, extracting the package name
 *
 * @param {String} str
 * @returns {String}
 */

BuildManager.prototype.getPackage = function (str) {
    return str.split('/')[0];
};

/**
 * Parses a step reference string, extracting the step name
 *
 * @param {String} str
 * @returns {String}
 */

BuildManager.prototype.getName = function (str) {
    return str.split('/').slice(1).join('/');
};

/**
 * Cycles through all steps checking for 'before' requirements, looking up
 * the step to run before and adding an after requirement to that. After adding
 * 'after' requirements to all steps referenced in the 'before' property, the
 * property is deleted on the original step object.
 */

BuildManager.prototype.reverseBefores = function () {
    var that = this;
    for (var i = 0, len = this.steps.length; i < len; i++) {
        var curr = this.steps[i];
        var fn = curr.fn;
        if (fn && curr.before) {
            var steps = curr.before.reduce(function (arr, b) {
                return arr.concat(
                    that.getSteps(that.getPackage(b), that.getName(b))
                );
            }, []);
            steps.forEach(function (s) {
                if (typeof s.fn === 'function') {
                    s.fn = {run: s.fn};
                }
                s.after = s.after || [];
                s.after.push(curr.toString());
            });
            delete curr.before;
        }
    }
};

/**
 * Calls add on each step contained in an object of packages keyed by name.
 *
 * Example Object formt:
 *
 *     { pkg1: {step1: function () { ... }, step2: function () { ... }}
 *     , pkg2: {step3: function () { ... }} }
 */

BuildManager.prototype.addAll = function (pkgs) {
    for (var pkg in pkgs) {
        for (var name in pkgs[pkg]) {
            this.add(pkg, name, pkgs[pkg][name]);
        }
    }
};

/**
 * Add a new build step to the build manager
 *
 * @param {String} pkg
 * @param {String} name
 * @param {Object|Function} fn
 * @returns {Object} the step object added to steps array
 */

BuildManager.prototype.add = function (pkg, name, fn) {
    if (pkg.indexOf('/') !== -1) {
        throw new Error('Packages cannot have "/" in their name');
    }
    if (this.getStep(pkg, name)) {
        throw new Error('Build step already exists for ' + pkg + '/' + name);
    }
    if (fn.after && !Array.isArray(fn.after)) {
        fn.after = [fn.after];
    }
    if (fn.before && !Array.isArray(fn.before)) {
        fn.before = [fn.before];
    }
    var s = {
        pkg: pkg,
        name: name,
        fn: fn,
        // make sure dependency information is
        // cloned to avoid affecting other packages
        after: fn.after ? fn.after.slice(): [],
        before: fn.before ? fn.before.slice(): [],
        toString: function () {
            return pkg + '/' + name;
        }
    };
    this.steps.push(s);
    return s;
};

/**
 * Returns the step for a specific package and step name
 *
 * @param {String} pkg
 * @param {String} name
 * @returns {Object}
 */

BuildManager.prototype.getStep = function (pkg, name) {
    return _.detect(this.steps, function (s) {
        return s.pkg === pkg && s.name === name;
    });
};

/**
 * Returns an array of steps matching either a package name or both a package
 * name and a step name.
 *
 * @param {String} pkg
 * @param {String} name (optional)
 * @returns {Object}
 */

BuildManager.prototype.getSteps = function (pkg, /*optional*/name) {
    if (name) {
        return [this.getStep(pkg, name)];
    }
    return _.filter(this.steps, function (s) {
        return s.pkg === pkg;
    });
};

/**
 * Runs a specific step, emitting a 'step' event once it is complete or
 * an 'error' event if the step results in an error.
 *
 * A 'step' event will trigger another call to run(), to re-check the
 * requirements of each step.
 *
 * @param {Object} s
 */

BuildManager.prototype.runStep = function (s) {
    s.inprogress = true;
    var fn = (typeof s.fn === 'function') ? s.fn: s.fn.run;
    var that = this;
    try {
        that.emit('beforeStep', s.pkg, s.name);
        fn.apply(null, this.args.concat([this.doc, function (err, doc) {
            if (err) {
                return that.emit('error', err, s);
            }
            that.doc = doc;
            s.inprogress = false;
            s.complete = true;
            that.emit('step', s.pkg, s.name);
        }]));
    }
    catch (e) {
        return that.emit('error', e, s);
    }
};
