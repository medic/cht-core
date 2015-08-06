var _ = require('underscore'),
    moment = require('moment'),
    sinon = require('sinon'),
    transition = require('../../transitions/ohw_notifications'),
    fakedb = require('../fake-db'),
    fakeaudit = require('../fake-audit'),
    utils = require('../../lib/utils'),
    now;

exports.setUp = function(callback) {
    process.env.TEST_ENV = true;
    now = moment();
    sinon.stub(utils, 'checkOHWDuplicates').callsArgWith(1, null, []);
    callback();
};

exports.tearDown = function(callback) {
    if (utils.getOHWRegistration.restore) {
        utils.getOHWRegistration.restore();
    }
    if (utils.checkOHWDuplicates.restore) {
        utils.checkOHWDuplicates.restore();
    }
    callback();
};

exports['mutes messages'] = function(test) {
    test.expect(2);
    var doc = {
        patient_id: 'abc',
        serial_number: '123',
        notifications: 'off'
    };
    var found = {
        scheduled_tasks: [
            {
                messages: [ { message: 'keep me' } ],
                type: 'anc_visit',
                state: 'scheduled',
                due: now.clone().add(22, 'days').valueOf()
            },
            {
                messages: [ { message: 'x' } ],
                type: 'anc_visit',
                state: 'scheduled',
                due: now.clone().add(20, 'days').valueOf()
            },
            {
                messages: [ { message: 'x' } ],
                type: 'anc_visit',
                state: 'scheduled',
                due: now.clone().subtract(3, 'days').valueOf()
            }
        ]
    };
    sinon.stub(utils, 'getOHWRegistration').callsArgWith(1, null, found);
    transition.onMatch({
        doc: doc
    }, fakedb, fakeaudit, function() {
        var message = _.first(_.first(doc.tasks).messages).message;

        test.ok(message.indexOf('deactivated') >= 0);
        test.equals(doc.notifications, 'off');
        test.done();
    });
};

exports['unmutes messages; discards old ones'] = function(test) {
    test.expect(2);
    var doc = {
        patient_id: 'muteme',
        notifications: 'on'
    };

    var found = {
        scheduled_tasks: [
            {
                messages: [ { message: 'keep me' } ],
                type: 'anc_visit',
                state: 'muted',
                due: now.clone().add(22, 'days').valueOf()
            },
            {
                messages: [ { message: 'x' } ],
                type: 'anc_visit',
                state: 'muted',
                due: now.clone().add(20, 'days').valueOf()
            },
            {
                messages: [ { message: 'x' } ],
                type: 'anc_visit',
                state: 'muted',
                due: now.clone().subtract(3, 'days').valueOf()
            }
        ]
    };
    sinon.stub(utils, 'getOHWRegistration').callsArgWith(1, null, found);

    transition.onMatch({
        doc: doc
    }, fakedb, fakeaudit, function() {
        var message = _.first(_.first(doc.tasks).messages).message;

        test.ok(message.indexOf('reactivated') >= 0);
        test.equals(doc.notifications, 'on');
        test.done();
    });
};
