process.env.TEST_ENV = 'hello'; // required for ../../db.js

var _ = require('underscore'),
    db = require('../../db'),
    sinon = require('sinon').sandbox.create(),
    utils = require('../../lib/utils'),
    uuid = require('uuid'),
    config = require('../../config');

exports.tearDown = function(callback) {
    sinon.restore();
    callback();
};

exports['getVal supports string keys'] = function(test) {
    var doc = {
        lmp_date: '8000001'
    };
    test.equals(utils.getVal(doc, 'lmp_date'), '8000001');
    test.equals(utils.getVal(doc, 'foo'), undefined);
    // non-string keys return undefined
    test.equals(utils.getVal(doc, 10), undefined);
    test.done();
};

exports['getVal supports dot notation'] = function(test) {
    var doc = {
        fields: {
            baz: '99938388',
            bim: {
              bop: 15,
              bam: [1,2,3]
            }
        }
    };
    test.equals(utils.getVal(doc, 'fields.baz'), '99938388');
    test.equals(utils.getVal(doc, 'fields.bim.bop'), 15);
    test.same(utils.getVal(doc, 'fields.bim.bam'), [1,2,3]);
    test.equals(utils.getVal(doc, 'fields.404'), undefined);
    test.done();
};

exports['updateable returns true when _rev the same'] = function(test) {
    test.ok(utils.updateable({ _rev: '1' }, { _rev: '1', x: 1 }));
    test.done();
};

exports['updateable returns false when _rev different'] = function(test) {
    test.equals(utils.updateable({ _rev: '1' }, { _rev: '2', x: 1 }), false);
    test.equals(utils.updateable({ _rev: '2' }, { _rev: '1', x: 1 }), false);
    test.done();
};

exports['updateable returns false when objects the same'] = function(test) {
    test.equals(utils.updateable({ _rev: '1', x: 1 }, { _rev: '1', x: 1 }), false);
    test.done();
};

exports['getClinicContactName gets name'] = function(test) {
    test.equal(utils.getClinicContactName({
        contact: {
            parent: {
                type: 'clinic',
                contact: {
                    name: 'Y'
                }
            }
        }
    }), 'Y');
    test.done();
};

exports['getClinicContactName gets returns health volunteer if miss'] = function(test) {
    test.equals(utils.getClinicContactName({
        contact: {
            parent: { }
        }
    }), 'health volunteer');
    test.done();
};

exports['getClinicContactName gets name if contact'] = function(test) {
    test.equals(utils.getClinicContactName({
        contact: {
            name: 'Y'
        }
    }), 'Y');
    test.done();
};

exports['getClinicName gets returns health volunteer if miss'] = function(test) {
    test.equal(utils.getClinicName({
        contact: {
            parent: { type: 'clinic' }
        }
    }), 'health volunteer');
    test.done();
};

exports['getClinicName gets name if contact'] = function(test) {
    test.equal(utils.getClinicName({
        name: 'Y'
    }), 'Y');
    test.done();
};

exports['getClinicName gets name'] = function(test) {
    test.equal(utils.getClinicName({
        contact: {
            parent: {
                type: 'clinic',
                name: 'Y'
            }
        }
    }), 'Y');
    test.done();
};

exports['addMessage adds uuid'] = function(test) {
    var doc = {},
        message,
        task;

    utils.addMessage(doc, {
        phone: '+1234',
        message: 'xxx'
    });

    test.ok(doc.tasks);
    task = _.first(doc.tasks);

    test.ok(_.isArray(task.messages));
    test.equals(task.state, 'pending');
    test.ok(!!task.state_history);
    test.equals(task.state_history.length, 1);
    test.equals(task.state_history[0].state, 'pending');
    test.ok(!!task.state_history[0].timestamp);

    message = _.first(task.messages);
    test.equals(message.to, '+1234');
    test.equals(message.message, 'xxx');
    test.ok(message.uuid);
    test.done();
};

exports['getReportsWithSameClinicAndForm calls through to db view correctly'] = function(test) {

    var formName = 'someForm';
    var clinicId = 'someClinicId';
    var result = [{_id: 'someRowId'}];

    sinon.stub(db.medic, 'view')
        .withArgs(
            'medic',
            'reports_by_form_and_clinic',
            {
                startkey: [formName, clinicId],
                endkey: [formName, clinicId],
                include_docs: true
            }
        )
        .callsArgWith(3, null, { rows: result });

    test.expect(2);
    utils.getReportsWithSameClinicAndForm({
        formName: formName,
        doc: {
            contact: {
                parent: {
                    _id: clinicId,
                    type: 'clinic'
                }
            }
        }
    }, function(err, data) {
        test.equals(err, null);
        test.equals(data, result);
        test.done();
    });
};

exports['addScheduledMessage creates a new scheduled task'] = function(test) {


    test.expect(10);

    var message = 'xyz';
    var due = new Date();
    var phone = '+123';
    var testUuid = 'test-uuid';
    var doc = {};

    sinon.stub(uuid, 'v4').returns(testUuid);

    utils.addScheduledMessage(doc, {
        message: message,
        due: due,
        phone: phone
    });

    test.equals(doc.scheduled_tasks.length, 1);
    var task = doc.scheduled_tasks[0];
    test.equals(task.due, due.getTime());
    test.equals(task.messages.length, 1);
    test.equals(task.messages[0].to, phone);
    test.equals(task.messages[0].message, message);
    test.equals(task.messages[0].uuid, testUuid);
    test.equals(task.state, 'scheduled');
    test.equals(task.state_history.length, 1);
    test.equals(task.state_history[0].state, 'scheduled');
    test.ok(!!task.state_history[0].timestamp);

    test.done();
};

exports['clearScheduledMessages clears all matching tasks'] = function(test) {

    test.expect(6);

    var type = 'xyz';
    var doc = {
        scheduled_tasks: [
            {
                type: type,
                state: 'scheduled'
            }, {
                type: 'miss',
                state: 'scheduled'
            }
        ]
    };

    utils.clearScheduledMessages(doc, [type, 'othertype']);

    test.equals(doc.scheduled_tasks.length, 2);
    test.equals(doc.scheduled_tasks[0].state, 'cleared');
    test.equals(doc.scheduled_tasks[0].state_history.length, 1);
    test.equals(doc.scheduled_tasks[0].state_history[0].state, 'cleared');
    test.ok(!!doc.scheduled_tasks[0].state_history[0].timestamp);
    test.equals(doc.scheduled_tasks[1].state, 'scheduled');
    test.done();
};

exports['unmuteScheduledMessages schedules all muted tasks'] = function(test) {

    test.expect(5);

    var doc = {
        scheduled_tasks: [
            {
                due: Date.now().valueOf() + 1000,
                state: 'muted'
            }, {
                due: Date.now().valueOf() - 1000,
                state: 'muted'
            }
        ]
    };

    utils.unmuteScheduledMessages(doc);

    test.equals(doc.scheduled_tasks.length, 1);
    test.equals(doc.scheduled_tasks[0].state, 'scheduled');
    test.equals(doc.scheduled_tasks[0].state_history.length, 1);
    test.equals(doc.scheduled_tasks[0].state_history[0].state, 'scheduled');
    test.ok(!!doc.scheduled_tasks[0].state_history[0].timestamp);
    test.done();
};

exports['muteScheduledMessages mutes all scheduled tasks'] = function(test) {

    test.expect(5);

    var doc = {
        scheduled_tasks: [
            {
                state: 'scheduled'
            }
        ]
    };

    utils.muteScheduledMessages(doc);

    test.equals(doc.scheduled_tasks.length, 1);
    test.equals(doc.scheduled_tasks[0].state, 'muted');
    test.equals(doc.scheduled_tasks[0].state_history.length, 1);
    test.equals(doc.scheduled_tasks[0].state_history[0].state, 'muted');
    test.ok(!!doc.scheduled_tasks[0].state_history[0].timestamp);
    test.done();
};

exports['applyPhoneFilters performs replace'] = function(test) {

    var config = {
        get: function(prop) {
            if (prop === 'outgoing_phone_filters') {
                return [
                    { match: '0+', replace: '9' },
                    { }
                ];
            }
            if (prop === 'outgoing_phone_replace') {
                return { match: '15', replace: '2' };
            }
            test.ok(false, 'Unexpected property: ' + prop);
        }
    };

    test.equals(utils.applyPhoneFilters(config, '00101'), '9101');
    test.equals(utils.applyPhoneFilters(config, '456'), '456');
    test.equals(utils.applyPhoneFilters(config, '159841125'), '29841125');
    test.done();
};

exports['translate returns message if key found in translations'] = function(test) {
    sinon.stub(config, 'getTranslations').returns({
        en: { sms_received: 'got it!' }
    });
    test.equals(utils.translate('sms_received'), 'got it!');
    test.done();
};

exports['translate returns key if translations not found'] = function(test) {
    sinon.stub(config, 'getTranslations').returns({});
    test.equals(utils.translate('sms_received'), 'sms_received');
    test.done();
};

exports['describe isOutgoingAllowed'] = function(test) {
    /*
     * Support comma separated string config to match an outgoing phone number
     * or MNO (mobile network operator) defined string.
     */
    var tests = [
      // denied
      ['+123', '+123', false],
      ['+123', '+123999999', false],
      ['SAFARI', 'SAFARICOM', false],
      ['Safari', 'SAFARICOM', false],
      ['+123,+456,+789', '+456', false],
      ['+123,+456,+789', '+4569999999', false],
      ['SAFARI, ORANGE', 'ORANGE NET', false],
      ['0', '0000123', false],
      ['0', '0', false],
      // allowed
      ['+123', '+999', true],
      ['SAFARI, ORANGE NET', 'ORANGE', true],
      ['VIVO', 'EM VIVO', true],
      ['0', '-1', true],
      // allow falsey inputs
      ['snarf', undefined, true],
      ['snarf', null, true],
      ['', '+123', true],
      ['', '', true]
    ];
    _.each(tests, function(t) {
      var s = sinon.stub(config, 'get');
      s.withArgs('outgoing_deny_list').returns(t[0]);
      test.equals(utils.isOutgoingAllowed(t[1]), t[2]);
      s.restore();
    });
    test.done();
};

exports['describe _isMessageFromGateway'] = function(test) {
    var tests = [
      ['+774455558888', '77-44-5555-8888', true],
      ['+774455558889', '77-44-5555-8888', false],
      // missing country code matches
      ['+41446681800', '446681800', true]
    ];
    _.each(tests, function(t) {
      var s = sinon.stub(config, 'get');
      s.withArgs('gateway_number').returns(t[0]);
      test.equals(utils._isMessageFromGateway(t[1]), t[2]);
      s.restore();
    });
    test.done();
};

var generateMessage = function(length, unicode) {
    var result = [];
    for (var i = 0; i < length; i++) {
        result[i] = unicode ? '☃' : 'o';
    }
    return result.join('');
};

var MAX_GSM_LENGTH = 160;
var MAX_UNICODE_LENGTH = 70;

exports['addMessage does not truncate short sms'] = function(test) {
    var doc = {};
    var sms = generateMessage(MAX_GSM_LENGTH);
    sinon.stub(config, 'get').withArgs('multipart_sms_limit').returns(10);

    utils.addMessage(doc, { phone: '+1234', message: sms });

    test.ok(doc.tasks);
    var task = _.first(doc.tasks);
    var message = _.first(task.messages);
    test.equals(message.message, sms);
    test.equals(message.original_message, undefined);
    test.done();
};

exports['addMessage does not truncate short unicode sms'] = function(test) {
    var doc = {};
    var sms = generateMessage(MAX_UNICODE_LENGTH, true);
    sinon.stub(config, 'get').withArgs('multipart_sms_limit').returns(10);

    utils.addMessage(doc, { phone: '+1234', message: sms });

    test.ok(doc.tasks);
    var task = _.first(doc.tasks);
    var message = _.first(task.messages);
    test.equals(message.message, sms);
    test.equals(message.original_message, undefined);
    test.done();
};

exports['addMessage truncates long sms'] = function(test) {
    var doc = {};
    var sms = generateMessage(1000);
    var expected = sms.substr(0, 150) + '...';
    sinon.stub(config, 'get').withArgs('multipart_sms_limit').returns(1);

    utils.addMessage(doc, { phone: '+1234', message: sms });

    test.ok(doc.tasks);
    var task = _.first(doc.tasks);
    var message = _.first(task.messages);
    test.equals(message.message, expected);
    test.equals(message.original_message, sms);
    test.done();
};

exports['addMessage truncates long unicode sms'] = function(test) {
    var doc = {};
    var sms = generateMessage(1000, true);
    var expected = sms.substr(0, 64) + '...';
    sinon.stub(config, 'get').withArgs('multipart_sms_limit').returns(1);

    utils.addMessage(doc, { phone: '+1234', message: sms });

    test.ok(doc.tasks);
    var task = _.first(doc.tasks);
    var message = _.first(task.messages);
    test.equals(message.message, expected);
    test.equals(message.original_message, sms);
    test.done();
};

exports['getPatientContactUuid returns the ID for the given short code'] = test => {
    const expected = 'abc123';
    const given = '55998';
    const patients = [ { id: expected } ];
    const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: patients });
    utils.getPatientContactUuid(db, given, (err, actual) => {
        test.equals(err, null);
        test.equals(actual, expected);
        test.equals(view.callCount, 1);
        test.equals(view.args[0][0], 'medic-client');
        test.equals(view.args[0][1], 'contacts_by_reference');
        test.equals(view.args[0][2].key[0], 'shortcode');
        test.equals(view.args[0][2].key[1], given);
        test.equals(view.args[0][2].include_docs, false);
        test.done();
    });
};

exports['getPatientContactUuid returns empty when no patient found'] = test => {
    const given = '55998';
    const patients = [ ];
    const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: patients });
    utils.getPatientContactUuid(db, given, (err, actual) => {
        test.equals(err, null);
        test.equals(actual, null);
        test.equals(view.callCount, 1);
        test.done();
    });
};

exports['getPatientContactUuid returns empty when no shortcode given'] = test => {
    const view = sinon.stub(db.medic, 'view');
    utils.getPatientContactUuid(db, null, (err, actual) => {
        test.equals(err, null);
        test.equals(actual, null);
        test.equals(view.callCount, 0);
        test.done();
    });
};

exports['getPatientContact returns the patient for the given short code'] = test => {
    const expected = 'abc123';
    const given = '55998';
    const patients = [ { id: expected, doc: { _id: expected, name: 'jim', patient_id: given } } ];
    const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: patients });
    utils.getPatientContact(db, given, (err, actual) => {
        test.equals(err, null);
        test.equals(actual.name, 'jim');
        test.equals(view.callCount, 1);
        test.equals(view.args[0][0], 'medic-client');
        test.equals(view.args[0][1], 'contacts_by_reference');
        test.equals(view.args[0][2].key[0], 'shortcode');
        test.equals(view.args[0][2].key[1], given);
        test.equals(view.args[0][2].include_docs, true);
        test.done();
    });
};

exports['getPatientContact returns empty when no patient found'] = test => {
    const given = '55998';
    const patients = [ ];
    const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: patients });
    utils.getPatientContact(db, given, (err, actual) => {
        test.equals(err, null);
        test.equals(actual, null);
        test.equals(view.callCount, 1);
        test.done();
    });
};

exports['getPatientContact returns empty when no shortcode given'] = test => {
    const view = sinon.stub(db.medic, 'view');
    utils.getPatientContact(db, null, (err, actual) => {
        test.equals(err, null);
        test.equals(actual, null);
        test.equals(view.callCount, 0);
        test.done();
    });
};

exports['getRegistrations queries by id if given'] = test => {
    const expectedDoc = { _id: 'a' };
    const expected = [ { doc: expectedDoc } ];
    const given = '22222';
    const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: expected });
    utils.getRegistrations({ db: db, id: given }, (err, actual) => {
        test.equals(err, null);
        test.deepEqual(actual, [ expectedDoc ]);
        test.equals(view.callCount, 1);
        test.equals(view.args[0][0], 'medic');
        test.equals(view.args[0][1], 'registered_patients');
        test.equals(view.args[0][2].key, given);
        test.equals(view.args[0][2].include_docs, true);
        test.done();
    });
};

exports['getRegistrations queries by ids if given'] = test => {
    const expectedDoc1 = { id: 'a' };
    const expectedDoc2 = { id: 'b' };
    const expected = [ { doc: expectedDoc1 } , { doc: expectedDoc2 } ];
    const given = ['11111', '22222'];
    const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: expected });
    utils.getRegistrations({ db: db, ids: given }, (err, actual) => {
        test.equals(err, null);
        test.deepEqual(actual, [expectedDoc1, expectedDoc2 ]);
        test.equals(view.callCount, 1);
        test.equals(view.args[0][0], 'medic');
        test.equals(view.args[0][1], 'registered_patients');
        test.equals(view.args[0][2].keys, given);
        test.equals(view.args[0][2].include_docs, true);
        test.done();
    });
};

exports['getRegistrations returns empty array if id or ids'] = test => {
    const view = sinon.stub(db.medic, 'view');
    utils.getRegistrations({ db: db }, (err, actual) => {
        test.equals(err, null);
        test.deepEqual(actual, []);
        test.equals(view.callCount, 0);
        test.done();
    });
};
