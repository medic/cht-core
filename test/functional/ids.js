var _ = require('underscore'),
    sinon = require('sinon'),
    testUtils = require('../test_utils'),
    ids = require('../../lib/ids');

exports.tearDown = function(callback) {
    testUtils.restore([
        Math.random
    ]);
    callback();
};

exports['generates an id of the given length'] = function(test) {
    [1,2,3,4,5,6,7,8,9,10].forEach(function(l) {
        test.equal(ids.generate(l).length, l);
    });

    test.done();
};

exports['ids can start with 0, will be correct length'] = function(test) {
    sinon.stub(Math, 'random').returns(0.00001);

    test.equal(ids.generate(5), '00000');
    test.done();
};

exports['ids should be suffiently random'] = function(test) {
    var TOTAL = 1000,
        MAX_RETRIES = 100;

    var generated = _.map(Array(TOTAL), _.partial(ids.generate, 5));

    var collisions = TOTAL - _.uniq(generated).length;

    test.ok(
        collisions <= MAX_RETRIES,
        'Should have at most ' + MAX_RETRIES + ' collisions, had: ' + collisions);
    test.done();
};
