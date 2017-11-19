var db = require('../../db'),
    sinon = require('sinon').sandbox.create(),
    utils = require('../../lib/utils'),
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
        test.equals(view.args[0][0], 'medic-client');
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
        test.equals(view.args[0][0], 'medic-client');
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
