var _ = require('underscore'),
    moment = require('moment'),
    transition = require('../../transitions/ohw_counseling'),
    fakedb = require('../fake-db'),
    utils = require('../../lib/utils'),
    date = require('../../date'),
    registration,
    _getOHWRegistration;

exports.setUp = function(callback) {
    var now = moment();

    transition.db = fakedb;
    _getOHWRegistration = utils.getOHWRegistration;
    utils.getOHWRegistration = function(id, callback) {
        registration = {
            patient_id: "123",
            serial_number: "FOO",
            scheduled_tasks: [
                {
                    messages: [ { message: 'keep me' } ],
                    type: 'anc_visit',
                    state: 'scheduled',
                    due: now.clone().add('days', 22).valueOf()
                },
                {
                    messages: [ { message: 'x' } ],
                    type: 'anc_visit',
                    state: 'scheduled',
                    due: now.clone().add('days', 20).valueOf()
                },
                {
                    messages: [ { message: 'x' } ],
                    type: 'anc_visit',
                    state: 'scheduled',
                    due: now.clone().subtract('days', 3).valueOf()
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
                    due: now.clone().add('days', 10).valueOf()
                },
                {
                    messages: [ { message: 'x' } ],
                    state: 'scheduled',
                    type: 'counseling_reminder',
                    due: now.clone().add('days', 30).valueOf()
                }
            ]
        };

        callback(null, registration);
    };
    callback();
};
exports.tearDown = function(callback) {
    utils.getOHWRegistration = _getOHWRegistration;
    callback();
}

exports['ANC acknowledgement'] = function(test) {
    test.expect(3);
    var doc = {
        patient_id: '123',
        anc_pnc: 'ANC',
        related_entities: {
            clinic: {
                contact: {
                    phone: '123'
                },
                name: 'qqq'
            }
        }
    };
    transition.onMatch({
        doc: doc
    }, function(err, complete) {
        test.ok(doc.tasks);
        test.equals(doc.tasks.length, 1);
        test.same(
            _.first(_.first(doc.tasks).messages).message,
            'Thank you, qqq. ANC Visit for FOO has been recorded.'
        );
        test.done();
    });
};

exports['ANC obsoletes old scheduled reminders'] = function(test) {
    test.expect(5);
    var doc = {
        patient_id: '123',
        anc_pnc: 'ANC'
    };
    transition.onMatch({
        doc: doc
    }, function(err, complete) {
        var st = registration.scheduled_tasks;
        test.ok(st);
        test.equals(st.length, 6);
        test.equals(st[0].state, 'scheduled');
        test.equals(st[1].state, 'cleared');
        test.equals(st[2].state, 'cleared');
        test.done();
    });
};


exports['PNC normal acknowledgement'] = function(test) {
    test.expect(3);
    var doc = {
        patient_id: '123',
        anc_pnc: 'PNC',
        weight: 'Green',
        related_entities: {
            clinic: {
                name: 'qqq'
            }
        }
    };
    transition.onMatch({
        doc: doc
    }, function(err, complete) {
        test.ok(doc.tasks);
        test.equals(doc.tasks.length, 1);
        test.same(
            _.first(_.first(doc.tasks).messages).message,
            'Thank you, qqq! PNC Visit has been recorded for FOO.'
        );
        test.done();
    });
};

exports['PNC clears obsolete counseling_reminder task from registration'] = function(test) {
    test.expect(5);
    var doc = {
        patient_id: '123',
        anc_pnc: 'PNC',
        related_entities: {
            clinic: {
                contact: {
                    phone: 'clinic'
                }
            }
        }
    };
    transition.onMatch({
        doc: doc
    }, function(err, complete) {
        var st = registration.scheduled_tasks;
        test.equal(doc.tasks.length, 1);
        test.ok(registration);
        test.equals(st.length, 6);
        test.equals(st[4].state, 'cleared');
        test.equals(st[5].state, 'scheduled');

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


