var _ = require('underscore'),
    transitions;

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
    var audit = {
        saveDoc: function() {
            test.fail();
        }
    };
    transitions.finalize({
        change: { doc: doc },
        audit: audit,
        results: null
    }, function() {
        test.done();
    });
};

exports['save is called if transition results have changes'] = function(test) {
    test.expect(1);
    var doc = {
        _rev: '1'
    };
    var audit = {
        saveDoc: function(doc) {
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
    test.expect(7);
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
        test.ok(doc.transitions.x.ok);
        test.ok(doc.transitions.x.last_rev);
        test.ok(doc.transitions.x.seq);
        test.equals(doc.errors, undefined);
        test.equals(doc.foo, 'bar');
        test.done();
    });
};

exports['applyTransition handles errors'] = function(test) {
    test.expect(5);
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
            callback(new Error('oops'));
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
        test.equals(err.message, 'oops');
        test.equals(changed, undefined);
        // ok is set to false
        test.ok(doc.transitions.x.ok === false);
        // one error is created on doc
        test.ok(doc.errors.length === 1);
        // error message contains error
        test.ok(doc.errors[0].message.match(/oops/));
        test.done();
    });
};
