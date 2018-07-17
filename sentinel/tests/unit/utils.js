var db = require('../../src/db-nano'),
    sinon = require('sinon'),
    assert = require('chai').assert,
    utils = require('../../src/lib/utils'),
    config = require('../../src/config');

describe('utils', () => {
    afterEach(() => sinon.restore());

    it('getVal supports string keys', () => {
        var doc = {
            lmp_date: '8000001'
        };
        assert.equal(utils.getVal(doc, 'lmp_date'), '8000001');
        assert.equal(utils.getVal(doc, 'foo'), undefined);
        // non-string keys return undefined
        assert.equal(utils.getVal(doc, 10), undefined);

    });

    it('getVal supports dot notation', () => {
        var doc = {
            fields: {
                baz: '99938388',
                bim: {
                  bop: 15,
                  bam: [1,2,3]
                }
            }
        };
        assert.equal(utils.getVal(doc, 'fields.baz'), '99938388');
        assert.equal(utils.getVal(doc, 'fields.bim.bop'), 15);
        assert.deepEqual(utils.getVal(doc, 'fields.bim.bam'), [1,2,3]);
        assert.equal(utils.getVal(doc, 'fields.404'), undefined);
    });

    it('getReportsWithSameClinicAndForm calls through to db view correctly', done => {

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
            assert.equal(err, null);
            assert.equal(data, result);
            done();
        });
    });

    it('unmuteScheduledMessages schedules all muted tasks', () => {

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

        assert.equal(doc.scheduled_tasks.length, 1);
        assert.equal(doc.scheduled_tasks[0].state, 'scheduled');
        assert.equal(doc.scheduled_tasks[0].state_history.length, 1);
        assert.equal(doc.scheduled_tasks[0].state_history[0].state, 'scheduled');
        assert(!!doc.scheduled_tasks[0].state_history[0].timestamp);
    });

    it('muteScheduledMessages mutes all scheduled tasks', () => {

        var doc = {
            scheduled_tasks: [
                {
                    state: 'scheduled'
                }
            ]
        };

        utils.muteScheduledMessages(doc);

        assert.equal(doc.scheduled_tasks.length, 1);
        assert.equal(doc.scheduled_tasks[0].state, 'muted');
        assert.equal(doc.scheduled_tasks[0].state_history.length, 1);
        assert.equal(doc.scheduled_tasks[0].state_history[0].state, 'muted');
        assert(!!doc.scheduled_tasks[0].state_history[0].timestamp);
    });

    it('translate returns message if key found in translations', () => {
        sinon.stub(config, 'getTranslations').returns({
            en: { sms_received: 'got it!' }
        });
        assert.equal(utils.translate('sms_received'), 'got it!');
    });

    it('translate returns key if translations not found', () => {
        sinon.stub(config, 'getTranslations').returns({});
        assert.equal(utils.translate('sms_received'), 'sms_received');
    });

    it('getPatientContactUuid returns the ID for the given short code', () => {
        const expected = 'abc123';
        const given = '55998';
        const patients = [ { id: expected } ];
        const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: patients });
        utils.getPatientContactUuid(db, given, (err, actual) => {
            assert.equal(err, null);
            assert.equal(actual, expected);
            assert.equal(view.callCount, 1);
            assert.equal(view.args[0][0], 'medic-client');
            assert.equal(view.args[0][1], 'contacts_by_reference');
            assert.equal(view.args[0][2].key[0], 'shortcode');
            assert.equal(view.args[0][2].key[1], given);
            assert.equal(view.args[0][2].include_docs, false);

        });
    });

    it('getPatientContactUuid returns empty when no patient found', () => {
        const given = '55998';
        const patients = [ ];
        const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: patients });
        utils.getPatientContactUuid(db, given, (err, actual) => {
            assert.equal(err, null);
            assert.equal(actual, null);
            assert.equal(view.callCount, 1);

        });
    });

    it('getPatientContactUuid returns empty when no shortcode given', () => {
        const view = sinon.stub(db.medic, 'view');
        utils.getPatientContactUuid(db, null, (err, actual) => {
            assert.equal(err, null);
            assert.equal(actual, null);
            assert.equal(view.callCount, 0);

        });
    });

    it('getPatientContact returns the patient for the given short code', () => {
        const expected = 'abc123';
        const given = '55998';
        const patients = [ { id: expected, doc: { _id: expected, name: 'jim', patient_id: given } } ];
        const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: patients });
        utils.getPatientContact(db, given, (err, actual) => {
            assert.equal(err, null);
            assert.equal(actual.name, 'jim');
            assert.equal(view.callCount, 1);
            assert.equal(view.args[0][0], 'medic-client');
            assert.equal(view.args[0][1], 'contacts_by_reference');
            assert.equal(view.args[0][2].key[0], 'shortcode');
            assert.equal(view.args[0][2].key[1], given);
            assert.equal(view.args[0][2].include_docs, true);

        });
    });

    it('getPatientContact returns empty when no patient found', () => {
        const given = '55998';
        const patients = [ ];
        const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: patients });
        utils.getPatientContact(db, given, (err, actual) => {
            assert.equal(err, null);
            assert.equal(actual, null);
            assert.equal(view.callCount, 1);

        });
    });

    it('getPatientContact returns empty when no shortcode given', () => {
        const view = sinon.stub(db.medic, 'view');
        utils.getPatientContact(db, null, (err, actual) => {
            assert.equal(err, null);
            assert.equal(actual, null);
            assert.equal(view.callCount, 0);

        });
    });

    it('getRegistrations queries by id if given', () => {
        const expectedDoc = { _id: 'a' };
        const expected = [ { doc: expectedDoc } ];
        const given = '22222';
        const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: expected });
        utils.getRegistrations({ db: db, id: given }, (err, actual) => {
            assert.equal(err, null);
            assert.deepEqual(actual, [ expectedDoc ]);
            assert.equal(view.callCount, 1);
            assert.equal(view.args[0][0], 'medic-client');
            assert.equal(view.args[0][1], 'registered_patients');
            assert.equal(view.args[0][2].key, given);
            assert.equal(view.args[0][2].include_docs, true);

        });
    });

    it('getRegistrations queries by ids if given', () => {
        const expectedDoc1 = { id: 'a' };
        const expectedDoc2 = { id: 'b' };
        const expected = [ { doc: expectedDoc1 } , { doc: expectedDoc2 } ];
        const given = ['11111', '22222'];
        const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: expected });
        return utils.getRegistrations({ db: db, ids: given }, (err, actual) => {
            assert.equal(err, null);
            assert.deepEqual(actual, [expectedDoc1, expectedDoc2 ]);
            assert.equal(view.callCount, 1);
            assert.equal(view.args[0][0], 'medic-client');
            assert.equal(view.args[0][1], 'registered_patients');
            assert.equal(view.args[0][2].keys, given);
            assert.equal(view.args[0][2].include_docs, true);
        });
    });

    it('getRegistrations returns empty array if id or ids', () => {
        const view = sinon.stub(db.medic, 'view');
        return utils.getRegistrations({ db: db }, (err, actual) => {
            assert.equal(err, null);
            assert.deepEqual(actual, []);
            assert.equal(view.callCount, 0);
        });
    });
});
