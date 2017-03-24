var _ = require('underscore'),
    ids = require('../../lib/ids');

exports['ids should be suffiently random'] = function(test) {
    var TOTAL = 1000,
        MAX_RETRIES = 100;

    var generated = _.map(Array(TOTAL), _.partial(ids._generate, 5));

    var collisions = TOTAL - _.uniq(generated).length;

    test.ok(
        collisions <= MAX_RETRIES,
        'Should have at most ' + MAX_RETRIES + ' collisions, had: ' + collisions);
    test.done();
};
