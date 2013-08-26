var _ = require('underscore'),
    sinon = require('sinon'),
    moment = require('moment'),
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

exports['getOffset returns false for bad syntax'] = function(test) {
    test.equals(transition.getOffset('x'), false);
    test.equals(transition.getOffset('2 muppets'), false);
    test.equals(transition.getOffset('one week'), false);
    test.done();
};

exports['getOffset returns durations for good syntax'] = function(test) {
    test.equals(transition.getOffset('2 weeks').asDays(), 14);
    test.equals(transition.getOffset('81 days').asDays(), 81);
    test.done();
};

exports['regime generates two scheduled messages'] = function(test) {
    var doc = {
        serial_number: 'abc',
        lmp_date: moment().valueOf()
    };

    sinon.stub(transition, 'getRegime').returns({
        key: 'duckland',
        messages: [
            {
                group: 1,
                offset: '1 week',
                message: "This is for serial number {{serial_number}}."
            },
            {
                group: 4,
                offset: '81 days',
                message: "This is for serial number {{serial_number}}."
            }
        ],
        start_from: 'lmp_date'
    });

    transition.addRegime(doc, 'duckland');

    test.ok(doc.scheduled_tasks);
    test.equals(doc.scheduled_tasks.length, 2);
    test.equals(moment(doc.scheduled_tasks[1].due).diff(doc.lmp_date, 'days'), 81);

    transition.getRegime.restore();

    test.done();
}
