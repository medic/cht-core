var _ = require('underscore'),
    moment = require('moment'),
    schedules = require('../../lib/schedules');

exports['function signature'] = function(test) {
    test.ok(_.isFunction(schedules.assignSchedule));
    test.equals(schedules.assignSchedule.length, 2);
    test.done();
};

exports['getOffset returns false for bad syntax'] = function(test) {
    test.equals(schedules.getOffset('x'), false);
    test.equals(schedules.getOffset('2 muppets'), false);
    test.equals(schedules.getOffset('one week'), false);
    test.done();
};

exports['getOffset returns durations for good syntax'] = function(test) {
    test.equals(schedules.getOffset('2 weeks').asDays(), 14);
    test.equals(schedules.getOffset('81 days').asDays(), 81);
    test.done();
};

exports['support string on start_from setting'] = function(test) {
    var doc = {
        lmp_date: '8000001'
    };
    test.equals(schedules._getVal(doc, 'lmp_date'), '8000001');
    test.done();
};

exports['support dot notation on start_from setting'] = function(test) {
    var doc = {
        fields: {
            baz: '99938388',
            bim: {
              boop: '8773383'
            }
        }
    };
    test.equals(schedules._getVal(doc, 'fields.baz'), '99938388');
    test.equals(schedules._getVal(doc, 'fields.bim.boop'), '8773383');
    test.done();
};

exports['assignSchedule returns false if already has scheduled_task for that name'] = function(test) {

    var doc = {
        form: 'x',
        lmp_date: moment().valueOf(),
        scheduled_tasks: [
            {
                name: 'duckland'
            }
        ]
    };

    var added = schedules.assignSchedule(doc, {
        name: 'duckland',
        start_from: 'lmp_date',
        messages: [
            {
                group: 1,
                offset: '1 week',
                message: [{
                    content: 'This is for serial number {{serial_number}}.',
                    locale: 'en'
                }]
            },
            {
                group: 4,
                offset: '81 days',
                message: [{
                    content: 'This is for serial number {{serial_number}}.',
                    locale: 'en'
                }]
            }
        ]
    });

    test.equals(added, false);
    test.equals(doc.scheduled_tasks.length, 1);
    test.done();
};

exports['schedule generates two messages'] = function(test) {

    var doc = {
        form: 'x',
        serial_number: 'abc',
        reported_date: moment().valueOf()
    };

    var added = schedules.assignSchedule(doc, {
        name: 'duckland',
        start_from: 'reported_date',
        messages: [
            {
                group: 1,
                offset: '1 week',
                message: [{
                    content: 'This is for serial number {{serial_number}}.',
                    locale: 'en'
                }]
            },
            {
                group: 4,
                offset: '81 days',
                message: [{
                    content: 'This is for serial number {{serial_number}}.',
                    locale: 'en'
                }]
            }
        ]
    });

    test.equals(added, true);
    test.ok(doc.scheduled_tasks);
    test.equals(doc.scheduled_tasks.length, 2);
    test.equals(moment(doc.scheduled_tasks[1].due).diff(doc.reported_date, 'days'), 81);

    test.done();
};

exports['scheduled due timestamp respects timezone'] = function(test) {
    var doc = {
        form: 'x',
        reported_date: '2050-03-13T13:06:22.002Z'
    };
    var added = schedules.assignSchedule(doc, {
        name: 'duckland',
        start_from: 'reported_date',
        messages: [
            {
                group: 1,
                offset: '1 day',
                send_time: '08:00 +00:00',
                message: [{
                    content: 'This is for serial number {{serial_number}}.',
                    locale: 'en'
                }]
            }
        ]
    });
    test.equals(added, true);
    test.equals(doc.scheduled_tasks.length, 1);
    test.equals(
        moment(doc.scheduled_tasks[0].due).toISOString(),
        '2050-03-14T08:00:00.000Z'
    );
    test.done();
};

exports['scheduled due timestamp respects send_day Monday'] = function(test) {
    var doc = {
        form: 'x',
        reported_date: '2050-03-13T13:06:22.002Z'
    };
    var added = schedules.assignSchedule(doc, {
        name: 'duckland',
        start_from: 'reported_date',
        messages: [
            {
                group: 1,
                offset: '2 weeks',
                send_day: 'Monday',
                message: [{
                    content: 'Woot',
                    locale: 'en'
                }]
            }
        ]
    });
    test.equals(added, true);
    test.equals(doc.scheduled_tasks.length, 1);
    test.equals(
        moment(doc.scheduled_tasks[0].due).format('dddd'),
        'Monday'
    );
    test.done();
};

exports['scheduled due timestamp respects send_day Wednesday'] = function(test) {
    var doc = {
        form: 'x',
        reported_date: '2050-03-13T13:06:22.002Z'
    };
    var added = schedules.assignSchedule(doc, {
        name: 'duckland',
        start_from: 'reported_date',
        messages: [
            {
                group: 1,
                offset: '2 weeks',
                send_day: 'Wednesday',
                message: [{
                    content: 'Woot',
                    locale: 'en'
                }]
            }
        ]
    });
    test.equals(added, true);
    test.equals(doc.scheduled_tasks.length, 1);
    test.equals(
        moment(doc.scheduled_tasks[0].due).format('dddd'),
        'Wednesday'
    );
    test.done();
};

exports['scheduled due timestamp respects send_day and send_time'] = function(test) {
    var doc = {
        form: 'x',
        reported_date: '2050-03-13T13:06:22.002Z'
    };
    var added = schedules.assignSchedule(doc, {
        name: 'duckland',
        start_from: 'reported_date',
        messages: [
            {
                group: 1,
                offset: '2 weeks',
                send_day: 'Wednesday',
                send_time: '08:00 +0000',
                message: [{
                    content: 'Woot',
                    locale: 'en'
                }]
            }
        ]
    });
    test.equals(added, true);
    test.equals(doc.scheduled_tasks.length, 1);
    test.equals(
        moment(doc.scheduled_tasks[0].due).toISOString(),
        '2050-03-30T08:00:00.000Z'
    );
    test.equals(
        moment(doc.scheduled_tasks[0].due).format('dddd'),
        'Wednesday'
    );
    test.done();
};

exports['scheduled item without message is skipped'] = function(test) {
    var doc = {
        form: 'x',
        reported_date: '2050-03-13T13:06:22.002Z'
    };
    var added = schedules.assignSchedule(doc, {
        name: 'duckland',
        start_from: 'reported_date',
        messages: [
            {
                group: 1,
                offset: '1 day',
                send_time: '08:00 +00:00',
                message: ''
            }
        ]
    });
    test.equals(added, false);
    test.ok(!doc.scheduled_tasks);
    test.done();
};

exports['scheduled item with only spaces message is skipped'] = function(test) {
    var doc = {
        form: 'x',
        reported_date: '2050-03-13T13:06:22.002Z'
    };
    var added = schedules.assignSchedule(doc, {
        name: 'duckland',
        start_from: 'reported_date',
        messages: [
            {
                group: 1,
                offset: '1 day',
                send_time: '08:00 +00:00',
                message: [{
                    content: '  ',
                    locale: 'en'
                }]
            }
        ]
    });
    test.equals(added, false);
    test.ok(!doc.scheduled_tasks);
    test.done();
};

exports['schedule does not generate messages in past'] = function(test) {
    var added,
        doc;

    doc = {
        form: 'x',
        serial_number: 'abc',
        some_date: moment().subtract(12, 'weeks').toISOString()
    };

    added = schedules.assignSchedule(doc, {
        name: 'duckland',
        start_from: 'some_date',
        messages: [
            {
                group: 1,
                offset: '1 week',
                message: [{
                    content: 'This is for serial number {{serial_number}}.',
                    locale: 'en'
                }]
            },
            {
                group: 4,
                offset: '20 weeks',
                message: [{
                    content: 'This is for serial number {{serial_number}}.',
                    locale: 'en'
                }]
            }
        ]
    });

    test.equals(added, true);
    test.ok(doc.scheduled_tasks);
    test.equals(doc.scheduled_tasks.length, 1);
    test.equals(moment(doc.scheduled_tasks[0].due).diff(doc.some_date, 'weeks'), 20);

    test.done();
};

exports['when start from is null skip schedule creation'] = function(test) {
    var added;

    var doc = {
        form: 'x',
        reported_date: null
    };

    added = schedules.assignSchedule(doc, {
        name: 'duckland',
        start_from: 'reported_date',
        messages: [
            {
                group: 1,
                offset: '1 week',
                message: [{
                    content: 'This is for serial number {{serial_number}}.',
                    locale: 'en'
                }]
            },
            {
                group: 4,
                offset: '81 days',
                message: [{
                    content: 'This is for serial number {{serial_number}}.',
                    locale: 'en'
                }]
            }
        ]
    });

    test.equals(added, true);
    test.ok(!doc.scheduled_tasks);
    test.done();
};

exports['alreadyRun validation'] = function(test) {
    test.equals(schedules.alreadyRun({}, 'x'), false);
    test.equals(schedules.alreadyRun({
        scheduled_tasks: [
            {
                name: 'y'
            }
        ]
    }, 'x'), false);
    test.equals(schedules.alreadyRun({
        scheduled_tasks: [
            {
                name: 'x'
            }
        ]
    }, 'x'), true);
    test.equals(schedules.alreadyRun({
        tasks: [
            {
                name: 'y'
            }
        ],
        scheduled_tasks: [
            {
                name: 'y'
            }
        ]
    }, 'x'), false);
    test.equals(schedules.alreadyRun({
        tasks: [
            {
                name: 'x'
            }
        ],
        scheduled_tasks: [
            {
                name: 'y'
            }
        ]
    }, 'x'), true);
    test.done();
};
