var _ = require('underscore'),
    moment = require('moment'),
    sinon = require('sinon'),
    transition = require('../../transitions/ohw_counseling'),
    fakedb = require('../fake-db'),
    fakeaudit = require('../fake-audit'),
    utils = require('../../lib/utils'),
    registration;

exports.setUp = function(callback) {
    var now = moment();

    process.env.TEST_ENV = true;

    registration = {
        patient_id: '123',
        serial_number: 'FOO',
        scheduled_tasks: [
            {
                messages: [ { message: 'x' } ],
                type: 'anc_visit',
                state: 'scheduled',
                group: 1,
                due: now.clone().add(3, 'days').valueOf()
            },
            {
                messages: [ { message: 'x' } ],
                type: 'anc_visit',
                state: 'scheduled',
                group: 1,
                due: now.clone().add(7, 'days').valueOf()
            },
            {
                messages: [ { message: 'x' } ],
                type: 'anc_visit',
                state: 'scheduled',
                group: 2,
                due: now.clone().add(15, 'days').valueOf()
            },
            {
                messages: [ { message: 'x' } ],
                type: 'anc_visit',
                state: 'scheduled',
                group: 3,
                due: now.clone().add(17, 'days').valueOf()
            },
            {
                messages: [ { message: 'x' } ],
                type: 'anc_visit',
                state: 'scheduled',
                group: 3,
                due: now.clone().add(25, 'days').valueOf()
            },
            {
                messages: [ { message: 'x' } ],
                type: 'anc_visit',
                state: 'scheduled',
                group: 3,
                due: now.clone().add(31, 'days').valueOf()
            },
            {
                messages: [ { message: 'x' } ],
                state: 'scheduled',
                type: 'upcoming_delivery'
            },
            {
                messages: [ { message: 'x' } ],
                state: 'scheduled',
                type: 'counseling_reminder',
                group: 1,
                due: now.clone().add(10, 'days').valueOf()
            },
            {
                messages: [ { message: 'x' } ],
                state: 'scheduled',
                type: 'counseling_reminder',
                group: 1,
                due: now.clone().add(12, 'days').valueOf()
            },
            {
                messages: [ { message: 'x' } ],
                state: 'scheduled',
                type: 'counseling_reminder',
                group: 2,
                due: now.clone().add(14, 'days').valueOf()
            },
            {
                messages: [ { message: 'x' } ],
                state: 'scheduled',
                type: 'counseling_reminder',
                group: 2,
                due: now.clone().add(25, 'days').valueOf()
            },
            {
                messages: [ { message: 'x' } ],
                state: 'scheduled',
                type: 'counseling_reminder',
                group: 3,
                due: now.clone().add(34, 'days').valueOf()
            }
        ]
    };
    sinon.stub(utils, 'checkOHWDuplicates').callsArgWith(1, null, []);
    sinon.stub(utils, 'getOHWRegistration').callsArgWith(1, null, registration);

    callback();
};

exports.tearDown = function(callback) {
    if (utils.checkOHWDuplicates.restore) {
        utils.checkOHWDuplicates.restore();
    }
    if (utils.getOHWRegistration.restore) {
        utils.getOHWRegistration.restore();
    }
    callback();
};

exports['ANC acknowledgement'] = function(test) {
    test.expect(3);
    var doc = {
        patient_id: '123',
        anc_pnc: 'ANC',
        contact: {
            phone: '123',
            name: 'qqq',
            parent: {
                contact: {
                    phone: '123',
                    name: 'qqq'
                }
            }
        }
    };
    transition.onMatch({
        doc: doc
    }, fakedb, fakeaudit, function() {
        test.ok(doc.tasks);
        test.equals(doc.tasks.length, 1);
        test.same(
            _.first(_.first(doc.tasks).messages).message,
            'Thank you, qqq. ANC Visit for FOO has been recorded.'
        );
        test.done();
    });
};

exports['ANC report right now clears group 1'] = function(test) {
    var doc = {
        reported_date: new Date().valueOf(),
        patient_id: '123',
        anc_pnc: 'ANC'
    };
    transition.onMatch({
        doc: doc
    }, fakedb, fakeaudit, function() {
        var st = registration.scheduled_tasks;
        test.ok(st);
        test.equals(st.length, 12);
        test.equals(st[0].state, 'cleared');
        test.equals(st[1].state, 'cleared');
        test.equals(st[2].state, 'scheduled');
        test.equals(st[3].state, 'scheduled');
        test.equals(st[4].state, 'scheduled');
        test.equals(st[5].state, 'scheduled');
        test.done();
    });
};

exports['ANC report right now clears group 1'] = function(test) {
    test.expect(3);
    var doc = {
        reported_date: new Date().valueOf(),
        patient_id: '123',
        anc_pnc: 'ANC'
    };
    transition.onMatch({
        doc: doc
    }, fakedb, fakeaudit, function() {
        var st = registration.scheduled_tasks;
        test.ok(st);
        test.equals(st.length, 12);
        test.ok(_.all(registration.scheduled_tasks, function(task) {
            if (task.type === 'anc_visit' && task.group === 1) {
                return task.state === 'cleared';
            }
            return task.state !== 'cleared';
        }));
        test.done();
    });
};

exports['ANC report in 14 days clears group 1 and 2'] = function(test) {
    test.expect(3);
    var doc = {
        reported_date: moment(new Date()).add(14, 'days').valueOf(),
        patient_id: '123',
        anc_pnc: 'ANC'
    };
    transition.onMatch({
        doc: doc
    }, fakedb, fakeaudit, function() {
        var st = registration.scheduled_tasks;
        test.ok(st);
        test.equals(st.length, 12);
        test.ok(_.all(registration.scheduled_tasks, function(task) {
            if (task.type === 'anc_visit' && [1,2].indexOf(task.group) !== -1) {
                return task.state === 'cleared';
            }
            return task.state !== 'cleared';
        }));
        test.done();
    });
};

exports['PNC normal acknowledgement'] = function(test) {
    test.expect(3);
    var doc = {
        patient_id: '123',
        anc_pnc: 'PNC',
        weight: 'Green',
        contact: {
            name: 'qqq',
            parent: {
                contact: {
                    name: 'qqq'
                }
            }
        }
    };
    transition.onMatch({
        doc: doc
    }, fakedb, fakeaudit, function() {
        test.ok(doc.tasks);
        test.equals(doc.tasks.length, 1);
        test.same(
            _.first(_.first(doc.tasks).messages).message,
            'Thank you, qqq! PNC Visit has been recorded for FOO.'
        );
        test.done();
    });
};

exports['PNC report now clears group 1'] = function(test) {
    test.expect(4);
    var doc = {
        reported_date: new Date().valueOf(),
        patient_id: '123',
        anc_pnc: 'PNC'
    };
    transition.onMatch({
        doc: doc
    }, fakedb, fakeaudit, function() {
        var st = registration.scheduled_tasks;
        test.equal(doc.tasks.length, 1);
        test.ok(registration);
        test.equals(st.length, 12);
        test.ok(_.all(registration.scheduled_tasks, function(task) {
            if (task.type === 'counseling_reminder' && task.group === 1) {
                return task.state === 'cleared';
            } else if (task.state) {
                return task.state !== 'cleared';
            }
        }));

        //
        // clears upcoming_delivery?
        // Should PNC report clear 'counseling_reminder' alerts even if
        // outcome_request is not cleared?  Should we send outcome_request
        // response in that case?
        //
        //test.ok(_.all(registration.scheduled_tasks, function(task) {
        //    if (task.type === 'upcoming_delivery')
        //        return task.state === 'obsoleted';
        //}));
        test.done();
    });
};


exports['PNC report in 36 days clears all counseling reminders'] = function(test) {
    test.expect(4);
    var doc = {
        reported_date: moment(new Date()).add(36, 'days').valueOf(),
        patient_id: '123',
        anc_pnc: 'PNC'
    };
    transition.onMatch({
        doc: doc
    }, fakedb, fakeaudit, function() {
        var st = registration.scheduled_tasks;
        test.equal(doc.tasks.length, 1);
        test.ok(registration);
        test.equals(st.length, 12);
        test.ok(_.all(registration.scheduled_tasks, function(task) {
            if (task.type === 'counseling_reminder') {
                return task.state === 'cleared';
            } else if (task.state) {
                return task.state !== 'cleared';
            }
        }));
        test.done();
    });
};
