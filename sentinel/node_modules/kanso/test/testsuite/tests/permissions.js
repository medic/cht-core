var permissions = require('couchtypes/permissions');


exports['matchUsername'] = function (test) {
    var fn = permissions.matchUsername();
    test.throws(function () {
        fn({}, {}, 'testuser2', null, {name: 'testuser'});
    });
    test.throws(function () {
        fn({}, {}, '', null, {name: 'testuser'});
    });
    // should not throw
    fn({}, {}, 'testuser', null, {name: 'testuser'});
    fn({}, {}, '', null, {name: ''});
    fn({}, {}, undefined, null, {name: ''});
    fn({}, {}, '', null, {name: undefined});
    test.done();
};

exports['fieldUneditable'] = function (test) {
    var fn = permissions.fieldUneditable();
    test.throws(function () {
        fn({}, {}, 'val', 'val2', {name: 'testuser'});
    });
    test.throws(function () {
        fn({}, {}, '', 'val', {name: 'testuser'});
    });
    // should not throw
    fn({}, {}, 'val', 'val', {name: 'testuser'});
    fn({}, {}, '', '', {name: 'testuser'});
    test.done();
};

exports['usernameMatchesField'] = function (test) {
    var fn = permissions.usernameMatchesField('creator');
    var oldDoc = {creator: 'testuser'};
    var userCtx = {name: 'testuser'};
    fn({}, oldDoc, 'newVal', 'oldVal', userCtx);
    test.throws(function () {
        userCtx = {name: 'testuser2'};
        fn({}, oldDoc, 'newVal', 'oldVal', userCtx);
    });
    test.done();
};

exports['usernameMatchesField - nested field'] = function (test) {
    var fn = permissions.usernameMatchesField(['one', 'two', 'three']);
    var oldDoc = {one: {two: {three: 'testuser'}}};
    var userCtx = {name: 'testuser'};
    fn({}, oldDoc, 'newVal', 'oldVal', userCtx);
    test.throws(function () {
        userCtx = {name: 'testuser2'};
        fn({}, oldDoc, 'newVal', 'oldVal', userCtx);
    });
    test.done();
};

exports['loggedIn'] = function (test) {
    var fn = permissions.loggedIn();
    fn({}, {}, 'newVal', 'oldVal', {name: 'testuser'});
    test.throws(function () {
        fn({}, {}, 'newVal', 'oldVal', {name: ''});
    });
    test.throws(function () {
        fn({}, {}, 'newVal', 'oldVal', {});
    });
    test.throws(function () {
        fn({}, {}, 'newVal', 'oldVal', undefined);
    });
    test.done();
};

exports['all - pass'] = function (test) {
    var calls = [];
    var fn = permissions.all([
        function () {
            calls.push('one');
        },
        function () {
            calls.push('two');
        }
    ]);
    test.equal(fn().length, 0);
    test.same(calls, ['one', 'two']);
    test.done();
};

exports['all - fail'] = function (test) {
    var calls = [];
    var fn = permissions.all([
        function () {
            calls.push('one');
        },
        function () {
            calls.push('two');
            throw new Error('fail');
        }
    ]);
    test.equal(fn().length, 1);
    test.same(calls, ['one', 'two']);
    test.done();
};

exports['any - pass'] = function (test) {
    var calls = [];
    var fn = permissions.any([
        function () {
            calls.push('one');
        },
        function () {
            calls.push('two');
            throw new Error('fail');
        }
    ]);
    test.equal(fn().length, 0);
    test.same(calls, ['one']);
    test.done();
};

exports['any - fail'] = function (test) {
    var calls = [];
    var fn = permissions.any([
        function () {
            calls.push('one');
            throw new Error('fail');
        },
        function () {
            calls.push('two');
            throw new Error('fail');
        }
    ]);
    test.equal(fn().length, 2);
    test.same(calls, ['one', 'two']);
    test.done();
};

exports['inherit'] = function (test) {
    test.expect(4);
    var od = {test: 'olddoc'};
    var nd = {test: 'newdoc'};
    var user = {name: 'testuser'};

    var fn = permissions.inherit({
        authorize: function (newDoc, oldDoc, userCtx) {
            test.same(oldDoc, od);
            test.same(newDoc, nd);
            test.same(userCtx, user);
            return 'error list';
        }
    });
    test.equal(fn({}, {}, nd, od, user), 'error list');
    test.done();
};

exports['inherit - deleted doc'] = function (test) {
    test.expect(4);
    var od = {test: 'olddoc'};
    var nd = {test: 'newdoc'};
    var user = {name: 'testuser'};

    var fn = permissions.inherit({
        authorize: function (newDoc, oldDoc, userCtx) {
            test.same(oldDoc, od);
            test.same(newDoc, {_deleted: true});
            test.same(userCtx, user);
            return 'error list';
        }
    });
    test.equal(fn({}, {}, undefined, od, user), 'error list');
    test.done();
};

exports['hasRole'] = function (test) {
    var fn = permissions.hasRole('admin');

    fn({}, {}, 'newVal', 'oldVal', {name: 'testuser', roles: ['admin']});
    fn({}, {}, 'newVal', 'oldVal', {name: 'testuser', roles: [
        'test',
        'admin'
    ]});

    test.throws(function () {
        fn({}, {}, 'newVal', 'oldVal', {name: 'testuser', roles: []});
    });
    test.throws(function () {
        fn({}, {}, 'newVal', 'oldVal', {name: 'testuser', roles: [
            'test',
            'test2'
        ]});
    });
    test.throws(function () {
        fn({}, {}, 'newVal', 'oldVal', {});
    });
    test.throws(function () {
        fn({}, {}, 'newVal', 'oldVal', undefined);
    });

    test.done();
};

exports['hasAnyOfTheRoles'] = function (test) {
    var fn = permissions.hasAnyOfTheRoles(['a', 'b']);

    fn({}, {}, 'newVal', 'oldVal', {name: 'testuser', roles: ['c', 'a', 'd']});
    fn({}, {}, 'newVal', 'oldVal', {name: 'testuser', roles: ['b']});
    fn({}, {}, 'newVal', 'oldVal', {name: 'testuser', roles: ['b', 'a']});
    
    test.throws(function () {
        fn({}, {}, 'newVal', 'oldVal', {name: 'testuser', roles: []});
    });
    test.throws(function () {
        fn({}, {}, 'newVal', 'oldVal', {name: 'testuser', roles: ['c','d']});
    });
    test.throws(function () {
        fn({}, {}, 'newVal', 'oldVal', {});
    });
    test.throws(function () {
        fn({}, {}, 'newVal', 'oldVal', undefined);
    });

    test.done();    
};
