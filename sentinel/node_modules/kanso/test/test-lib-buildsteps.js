var buildsteps = require('../lib/buildsteps'),
    logger = require('../lib/logger');

logger.clean_exit = true;


exports['after - specific steps'] = function (test) {
    test.expect(17);
    var calls = [];
    var d = {};
    var bm = new buildsteps.BuildManager(['root', 'path', 'settings'], d);

    bm.add('foo', 'one', function (root, path, settings, doc, callback) {
         test.equal(root, 'root');
         test.equal(path, 'path');
         test.equal(settings, 'settings');
         test.equal(doc, d);
         doc.one = 1;

         calls.push('one');
         callback(null, doc);
    });

    bm.add('foo', 'three', {
         after: 'bar/two',
         run: function (root, path, settings, doc, callback) {
             test.equal(root, 'root');
             test.equal(path, 'path');
             test.equal(settings, 'settings');
             test.equal(doc, d);
             test.equal(doc.one, 1);
             test.equal(doc.two, 2);
             doc.three = 3;

             calls.push('three');
             callback(null, doc);
        }
    });

    bm.add('bar', 'two', {
        after: 'foo/one',
        run: function (root, path, settings, doc, callback) {
             test.equal(root, 'root');
             test.equal(path, 'path');
             test.equal(settings, 'settings');
             test.equal(doc, d);
             test.equal(doc.one, 1);
             doc.two = 2;

             calls.push('two');
             callback(null, doc);
        }
    });

    bm.on('end', function (doc, completed, incomplete) {
        test.same(d, {
            one: 1,
            two: 2,
            three: 3
        });
        test.same(calls, ['one', 'two', 'three']);
        test.done();
    });
    bm.run();
};

exports['after - group steps'] = function (test) {
    test.expect(17);
    var calls = [];
    var d = {};
    var bm = new buildsteps.BuildManager(['root', 'path', 'settings'], d);

    bm.add('foo', 'one', function (root, path, settings, doc, callback) {
         test.equal(root, 'root');
         test.equal(path, 'path');
         test.equal(settings, 'settings');
         test.equal(doc, d);
         doc.one = 1;

         calls.push('one');
         callback(null, doc);
    });

    bm.add('foo', 'three', {
         after: 'bar',
         run: function (root, path, settings, doc, callback) {
             test.equal(root, 'root');
             test.equal(path, 'path');
             test.equal(settings, 'settings');
             test.equal(doc, d);
             test.equal(doc.one, 1);
             test.equal(doc.two, 2);
             doc.three = 3;

             calls.push('three');
             callback(null, doc);
        }
    });

    bm.add('bar', 'two', {
        run: function (root, path, settings, doc, callback) {
             test.equal(root, 'root');
             test.equal(path, 'path');
             test.equal(settings, 'settings');
             test.equal(doc, d);
             test.equal(doc.one, 1);
             doc.two = 2;

             calls.push('two');
             callback(null, doc);
        }
    });

    bm.on('end', function (doc, completed, incomplete) {
        test.same(d, {
            one: 1,
            two: 2,
            three: 3
        });
        test.same(calls, ['one', 'two', 'three']);
        test.done();
    });
    bm.run();
};

exports['after - multiple steps'] = function (test) {
    test.expect(24);
    var calls = [];
    var d = {};
    var bm = new buildsteps.BuildManager(['root', 'path', 'settings'], d);

    bm.add('foo', 'one', function (root, path, settings, doc, callback) {
         test.equal(root, 'root');
         test.equal(path, 'path');
         test.equal(settings, 'settings');
         test.equal(doc, d);
         doc.one = 1;

         calls.push('one');
         callback(null, doc);
    });

    bm.add('foo', 'four', {
         after: 'bar',
         after: 'baz/three',
         run: function (root, path, settings, doc, callback) {
             test.equal(root, 'root');
             test.equal(path, 'path');
             test.equal(settings, 'settings');
             test.equal(doc, d);
             test.equal(doc.one, 1);
             test.equal(doc.two, 2);
             test.equal(doc.three, 3);
             doc.four = 4;

             calls.push('four');
             callback(null, doc);
        }
    });

    bm.add('bar', 'two', {
        run: function (root, path, settings, doc, callback) {
             test.equal(root, 'root');
             test.equal(path, 'path');
             test.equal(settings, 'settings');
             test.equal(doc, d);
             test.equal(doc.one, 1);
             doc.two = 2;

             calls.push('two');
             callback(null, doc);
        }
    });

    bm.add('baz', 'three', {
        after: 'bar',
        run: function (root, path, settings, doc, callback) {
             test.equal(root, 'root');
             test.equal(path, 'path');
             test.equal(settings, 'settings');
             test.equal(doc, d);
             test.equal(doc.one, 1);
             test.equal(doc.two, 2);
             doc.three = 3;

             calls.push('three');
             callback(null, doc);
        }
    });

    bm.on('end', function (doc, completed, incomplete) {
        test.same(d, {
            one: 1,
            two: 2,
            three: 3,
            four: 4
        });
        test.same(calls, ['one', 'two', 'three', 'four']);
        test.done();
    });
    bm.run();
};


exports['before'] = function (test) {
    var calls = [];
    var d = {};
    var bm = new buildsteps.BuildManager(['root', 'path', 'settings'], d);

    bm.add('foo', 'two', function (root, path, settings, doc, callback) {
        calls.push('two');
        callback(null, doc);
    });

    bm.add('bar', 'one', {
        before: 'foo',
        run: function (root, path, settings, doc, callback) {
            calls.push('one');
            callback(null, doc);
        }
    });

    bm.on('end', function (doc, completed, incomplete) {
        test.same(calls, ['one', 'two']);
        test.done();
    });
    bm.run();
};

exports['unsatisfiable conditions'] = function (test) {
    var calls = [];
    var d = {};
    var bm = new buildsteps.BuildManager(['root', 'path', 'settings'], d);

    bm.add('foo', 'one', function (root, path, settings, doc, callback) {
        calls.push('one');
        callback(null, doc);
    });

    bm.add('foo', 'two', {
        after: 'foo/one',
        run: function (root, path, settings, doc, callback) {
            calls.push('two');
            callback(null, doc);
        }
    });

    bm.add('foo', 'three', {
        after: 'foo/two',
        before: 'foo/one',
        run: function (root, path, settings, doc, callback) {
            calls.push('three');
            callback(null, doc);
        }
    });

    bm.on('end', function (doc, completed, incomplete) {
        test.equal(doc, d);
        test.same(calls, []);
        test.same(completed, []);
        test.same(
            incomplete.map(function (i) { return i.toString(); }),
            ['foo/one', 'foo/two', 'foo/three']
        );
        test.done();
    });
    bm.run();
};

exports['build step error'] = function (test) {
    test.expect(5);
    var calls = [];
    var d = {};
    var e = new Error('test error');
    var bm = new buildsteps.BuildManager(['root', 'path', 'settings'], d);

    bm.add('foo', 'one', function (root, path, settings, doc, callback) {
        callback(e, doc);
    });

    bm.add('foo', 'two', {
        after: 'foo/one',
        run: function (root, path, settings, doc, callback) {
            callback(null, doc);
        }
    });

    bm.on('error', function (err, step) {
        test.equal(err, e);
        test.equal(step.toString(), 'foo/one');
    });

    bm.on('end', function (doc, complete, incomplete) {
        test.equal(doc, d);
        test.equal(complete.length, 0);
        test.equal(incomplete.length, 2);
        test.done();
    });

    bm.run();
};

exports['uncaught sync build step error'] = function (test) {
    test.expect(5);
    var calls = [];
    var d = {};
    var e = new Error('test error');
    var bm = new buildsteps.BuildManager(['root', 'path', 'settings'], d);

    bm.add('foo', 'one', function (root, path, settings, doc, callback) {
        throw e;
    });

    bm.add('foo', 'two', {
        after: 'foo/one',
        run: function (root, path, settings, doc, callback) {
            callback(null, doc);
        }
    });

    bm.on('error', function (err, step) {
        test.equal(err, e);
        test.equal(step.toString(), 'foo/one');
    });

    bm.on('end', function (doc, complete, incomplete) {
        test.equal(doc, d);
        test.equal(complete.length, 0);
        test.equal(incomplete.length, 2);
        test.done();
    });

    bm.run();
};

exports['after *'] = function (test) {
    var calls = [];
    var d = {};
    var bm = new buildsteps.BuildManager(['root', 'path', 'settings'], d);

    bm.add('foo', 'three', {
        after: '*',
        run: function (root, path, settings, doc, callback) {
            calls.push('three');
            callback(null, doc);
        }
    });

    bm.add('foo', 'one', {
        run: function (root, path, settings, doc, callback) {
            calls.push('one');
            callback(null, doc);
        }
    });

    bm.add('foo', 'two', {
        after: 'foo/one',
        run: function (root, path, settings, doc, callback) {
            calls.push('two');
            callback(null, doc);
        }
    });

    bm.on('end', function (doc, complete, incomplete) {
        test.equal(doc, d);
        test.same(calls, ['one', 'two', 'three']);
        test.done();
    });

    bm.run();
};

exports['addAll - empty'] = function (test) {
    test.expect(3);
    var d = {};
    var bm = new buildsteps.BuildManager(['root', 'path', 'settings'], d);
    bm.addAll({});
    bm.on('end', function (doc, completed, incomplete) {
        test.equal(doc, d);
        test.same(completed, []);
        test.same(incomplete, []);
        test.done();
    });
    bm.run();
};
