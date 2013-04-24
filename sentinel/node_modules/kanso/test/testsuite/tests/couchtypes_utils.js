var utils = require('couchtypes/utils');


exports['getPropertyPath'] = function (test) {
    var obj = {some: {nested: {path: 'yay'}}};
    test.equal(utils.getPropertyPath(obj, ['some', 'nested', 'path']), 'yay');
    test.same(utils.getPropertyPath(obj, ['some', 'nested']), {path: 'yay'});
    test.strictEqual(
        utils.getPropertyPath(obj, ['some', 'nested', 'missing']),
        undefined
    );
    test.strictEqual(
        utils.getPropertyPath(obj, ['blah', 'blah', 'blah']),
        undefined
    );
    utils.isBrowser = function () {
        return true;
    };
    test.done();
};

exports['isSubPath'] = function (test) {
    test.strictEqual(utils.isSubPath(['one'], ['one']), true);
    test.strictEqual(utils.isSubPath(['one'], ['one', 'two']), true);
    test.strictEqual(utils.isSubPath(['one', 'two'], ['one', 'two']), true);
    test.strictEqual(utils.isSubPath(['1', '2'], ['1', '2', '3', '4']), true);
    test.strictEqual(utils.isSubPath(['one'], ['two']), false);
    test.strictEqual(utils.isSubPath(['one', 'two'], ['one']), false);
    test.strictEqual(utils.isSubPath(['one', 'two'], ['two', 'three']), false);
    test.done();
};
