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

exports['save not called if transition results are null'] = function(test) {
    test.expect(0);
    var doc = {
        _rev: '1'
    };
    var db = {
        getDoc: function(id, callback) {
            callback(null, latest);
        }
    };
    var audit = {
        saveDoc: function(doc, callback) {
            test.fail();
        }
    };
    transitions.finalize({
        change: { doc: doc },
        audit: audit,
        results: null
    });
    test.done();
};

exports['save is called if transition results have changes'] = function(test) {
    test.expect(1);
    var doc = {
        _rev: '1'
    };
    var audit = {
        saveDoc: function(doc, callback) {
            test.ok(doc._rev);
        }
    };
    transitions.finalize({
        change: { doc: doc },
        audit: audit,
        results: [null,null,true]
    });
    test.done();
};

exports['applyTransition creates transitions property'] = function(test) {
    test.expect(8);
    var doc = {
        _rev: '1'
    };
    var audit = {
        saveDoc: function(doc, callback) {
            callback();
        }
    };
    var transition = {
        onMatch: function(change, db, audit, callback) {
            change.doc.foo = 'bar';
            callback(null, true);
        }
    };
    transitions.applyTransition({
        key: 'x',
        change: {
            doc: doc,
            seq: 1
        },
        transition: transition,
        audit: audit
    }, function(err, changed) {
        test.ok(!err);
        test.ok(changed);
        test.ok(doc.transitions);
        test.ok(doc.transitions.x);
        test.ok(doc.transitions.x.ok);
        test.ok(doc.transitions.x.last_rev);
        test.ok(doc.transitions.x.seq);
        test.ok(doc.foo);
        test.done();
    });
}

exports['applyTransition returns error and does not create transitions property'] = function(test) {
    test.expect(3);
    var doc = {
        _rev: '1'
    };
    var audit = {
        saveDoc: function(doc, callback) {
            callback();
        }
    };
    var transition = {
        onMatch: function(change, db, audit, callback) {
            callback('oops');
        }
    };
    transitions.applyTransition({
        key: 'x',
        change: {
            doc: doc
        },
        transition: transition,
        audit: audit
    }, function(err, changed) {
        test.ok(err);
        test.ok(!changed);
        test.ok(!doc.transitions);
        test.done();
    });
}

exports['same _rev returns false canRun'] = function(test) {
    var db,
        audit,
        doc,
        latest;

    doc = {
        _rev: '1',
        transitions: {
            x: {
                last_rev: '1'
            }
        }
    };

    var transition = {
        filter: function(doc) {
            return true;
        }
    };

    test.ok(!transitions.canRun({
        change: {
            doc: doc
        },
        key: 'x',
        transition: transition
    }));
    test.done();
}

exports['different _rev returns true canRun'] = function(test) {
    var db,
        audit,
        doc,
        latest;

    doc = {
        _rev: '2',
        transitions: {
            x: {
                last_rev: '1'
            }
        }
    };

    var transition = {
        filter: function(doc) {
            return true;
        }
    };

    test.ok(transitions.canRun({
        change: {
            doc: doc
        },
        key: 'x',
        transition: transition
    }));
    test.done();
}
