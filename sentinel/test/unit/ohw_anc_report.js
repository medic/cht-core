var _ = require('underscore'),
    moment = require('moment'),
    transition = require('../../transitions/ohw_anc_report'),
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
            scheduled_tasks: [
                {
                    messages: [ { message: 'keep me' } ],
                    type: 'anc_visit',
                    due: now.clone().add('days', 22).valueOf()
                },
                {
                    messages: [ { message: 'x' } ],
                    type: 'anc_visit',
                    due: now.clone().add('days', 20).valueOf()
                },
                {
                    messages: [ { message: 'x' } ],
                    type: 'anc_visit',
                    due: now.clone().subtract('days', 3).valueOf()
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

exports['adds acknowledgement'] = function(test) {
    var doc = {
        patient_id: 'abc'
    };
    transition.onMatch({
        doc: doc
    }, function(err, complete) {
        debugger;
        test.ok(doc.tasks);
        test.equals(doc.tasks.length, 1);
        test.ok(_.first(_.first(doc.tasks).messages).message.indexOf('ANC') >= 0);
        test.ok(_.first(_.first(doc.tasks).messages).message.indexOf('abc') >= 0);
        test.done();
    });
};

exports['obsoletes old scheduled reminders'] = function(test) {
    var doc = {
        patient_id: 'abc'
    };
    transition.onMatch({
        doc: doc
    }, function(err, complete) {
        test.ok(registration.scheduled_tasks);
        test.equals(registration.scheduled_tasks.length, 1);
        test.equals(_.first(_.first(registration.scheduled_tasks).messages).message, 'keep me');
        test.done();
    });
}
