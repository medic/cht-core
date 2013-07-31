var _ = require('underscore'),
    transitions,
    gently = global.GENTLY = new (require('gently')),
    utils = require('../../lib/utils');

exports.setUp = function(callback) {
    process.env.TEST_ENV = true;
    transitions = require('../../transitions/index');
    callback();
};

exports['finalize exposed'] = function(test) {
    test.ok(_.isFunction(transitions.finalize));
    test.done();
};

exports['save not called if transition has had no effect'] = function(test) {
    var db,
        doc,
        latest;

    doc = {
        _rev: '1'
    };
    latest = {
        _rev: '1'
    };

    db = {
        getDoc: function(id, callback) {
            callback(null, latest);
        },
        saveDoc: function(doc, callback) {
            test.fail();
        }
    };

    transitions.finalize({
        change: {
            doc: doc
        },
        key: 'x'
    }, db, function(err) {
        test.done();
    });
};

exports['records error status of transition'] = function(test) {
    var db,
        doc,
        latest;

    doc = {
        _rev: '1'
    };

    db = {
        getDoc: function(id, callback) {
            callback(null, doc);
        },
        saveDoc: function(doc, callback) {
            callback();
        }
    };

    transitions.finalize({
        err: 'badness',
        change: {
            doc: doc
        },
        key: 'x'
    }, db, function(err) {
        test.ok(doc.transitions);
        test.equals(doc.transitions.x.ok, false);
        test.done();
    });
}

exports['updated _rev bypasses save'] = function(test) {
    var db,
        doc,
        latest;

    doc = {
        changed_stuff: true,
        _rev: '1'
    };
    latest = {
        _rev: '2'
    };

    db = {
        getDoc: function(id, callback) {
            callback(null, latest);
        },
        saveDoc: function(doc, callback) {
            test.fail();
        }
    };

    transitions.finalize({
        change: {
            doc: doc
        },
        key: 'x'
    }, db, function(err) {
        test.ok(!err);
        test.done();
    });
}

exports['passes changed doc to saveDoc when changed'] = function(test) {
    var db,
        doc,
        latest;

    doc = {
        changed_stuff: true,
        _rev: '1'
    };
    latest = {
        _rev: '1'
    };

    db = {
        getDoc: function(id, callback) {
            callback(null, latest);
        },
        saveDoc: function(doc, callback) {
            test.ok(doc.changed_stuff);
            callback();
        }
    };

    transitions.finalize({
        change: {
            doc: doc
        },
        key: 'x'
    }, db, function(err) {
        test.ok(!err);
        test.equals(doc.transitions.x.ok, true);
        test.done();
    });
}
