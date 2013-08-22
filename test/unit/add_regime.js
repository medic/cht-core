var _ = require('underscore'),
    transition = require('../../transitions/add_regimes');

exports['signature'] = function(test) {
    test.ok(_.isFunction(transition.addRegime));
    test.equals(transition.addRegime.length, 2);
    test.done();
};

exports['filter fails if regime not there'] = function(test) {
    test.equals(transition.filter({}), false);
    test.done();
};

exports['filter passes if regime exists and no matching scheduled_tasks'] = function(test) {
    test.equals(transition.filter({
        task_regimes: [ 'x' ]
    }), true);
    test.equals(transition.filter({
        task_regimes: [ 'x' ],
        scheduled_tasks: [
            {
                type: 'y'
            }
        ]
    }), true);
    test.done();
};

exports['filter fails if regime exists and matching scheduled_tasks'] = function(test) {
    test.equals(transition.filter({
        task_regimes: [ 'x' ],
        scheduled_tasks: [
            {
                type: 'x'
            }
        ]
    }), false);
    test.done();
};
