const db = require('../../src/db'),
      sinon = require('sinon'),
      assert = require('chai').assert,
      utils = require('../../src/lib/utils'),
      config = require('../../src/config'),
      registrationUtils = require('@medic/registration-utils');

describe('utils', () => {
  beforeEach(() => {
    sinon.stub(db.medic, 'query');
  });
  afterEach(() => sinon.restore());

  it('getReportsWithSameClinicAndForm calls through to db view correctly', () => {

    const formName = 'someForm';
    const clinicId = 'someClinicId';
    const result = [{_id: 'someRowId'}];

    db.medic.query
      .withArgs('medic/reports_by_form_and_clinic', {
        startkey: [formName, clinicId],
        endkey: [formName, clinicId],
        include_docs: true
      })
      .resolves({ rows: result });

    return utils.getReportsWithSameClinicAndForm({
      formName: formName,
      doc: {
        contact: {
          parent: {
            _id: clinicId,
            type: 'clinic'
          }
        }
      }
    }).then(data => {
      assert.equal(data, result);
    });
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

  describe('getPatientContactUuid', () => {

    it('returns the ID for the given short code', done => {
      const expected = 'abc123';
      const given = '55998';
      const patients = [ { id: expected } ];
      const query = db.medic.query.resolves({ rows: patients });
      utils.getPatientContactUuid(given, (err, actual) => {
        assert.equal(err, null);
        assert.equal(actual, expected);
        assert.equal(query.callCount, 1);
        assert.equal(query.args[0][0], 'medic-client/contacts_by_reference');
        assert.equal(query.args[0][1].key[0], 'shortcode');
        assert.equal(query.args[0][1].key[1], given);
        assert.equal(query.args[0][1].include_docs, false);
        done();
      });
    });

    it('returns empty when no patient found', done => {
      const given = '55998';
      const patients = [ ];
      const query = db.medic.query.resolves({ rows: patients });
      utils.getPatientContactUuid(given, (err, actual) => {
        assert.equal(err, null);
        assert.equal(actual, null);
        assert.equal(query.callCount, 1);
        done();
      });
    });

    it('returns empty when no shortcode given', done => {
      const query = db.medic.query;
      utils.getPatientContactUuid(null, (err, actual) => {
        assert.equal(err, null);
        assert.equal(actual, null);
        assert.equal(query.callCount, 0);
        done();
      });
    });

  });

  describe('getPatientContact', () => {

    it('returns the patient for the given short code', done => {
      const expected = 'abc123';
      const given = '55998';
      const patients = [ { id: expected, doc: { _id: expected, name: 'jim', patient_id: given } } ];
      const query = db.medic.query.resolves({ rows: patients });
      utils.getPatientContact(given, (err, actual) => {
        assert.equal(err, null);
        assert.equal(actual.name, 'jim');
        assert.equal(query.callCount, 1);
        assert.equal(query.args[0][0], 'medic-client/contacts_by_reference');
        assert.equal(query.args[0][1].key[0], 'shortcode');
        assert.equal(query.args[0][1].key[1], given);
        assert.equal(query.args[0][1].include_docs, true);
        done();
      });
    });

    it('returns empty when no patient found', done => {
      const given = '55998';
      const patients = [ ];
      const query = db.medic.query.resolves({ rows: patients });
      utils.getPatientContact(given, (err, actual) => {
        assert.equal(err, null);
        assert.equal(actual, null);
        assert.equal(query.callCount, 1);
        done();
      });
    });

    it('returns empty when no shortcode given', done => {
      const query = db.medic.query;
      utils.getPatientContact(null, (err, actual) => {
        assert.equal(err, null);
        assert.equal(actual, null);
        assert.equal(query.callCount, 0);
        done();
      });
    });
  });

  describe('getRegistrations', () => {

    it('queries by id if given', done => {
      sinon.stub(registrationUtils, 'isValidRegistration').returns(true);
      sinon.stub(config, 'getAll').returns({ config: 'all' });
      const expectedDoc = { _id: 'a' };
      const expected = [ { doc: expectedDoc } ];
      const given = '22222';
      const query = db.medic.query.resolves({ rows: expected });
      utils.getRegistrations({ id: given }, (err, actual) => {
        assert.equal(err, null);
        assert.deepEqual(actual, [ expectedDoc ]);
        assert.equal(query.callCount, 1);
        assert.equal(registrationUtils.isValidRegistration.callCount, 1);
        assert.deepEqual(registrationUtils.isValidRegistration.args[0], [expectedDoc, { config: 'all' }]);
        assert.equal(query.args[0][0], 'medic-client/registered_patients');
        assert.equal(query.args[0][1].key, given);
        assert.equal(query.args[0][1].include_docs, true);
        done();
      });
    });

    it('queries by ids if given', done => {
      sinon.stub(registrationUtils, 'isValidRegistration').returns(true);
      sinon.stub(config, 'getAll').returns({ config: 'all' });
      const expectedDoc1 = { id: 'a' };
      const expectedDoc2 = { id: 'b' };
      const expected = [ { doc: expectedDoc1 } , { doc: expectedDoc2 } ];
      const given = ['11111', '22222'];
      const view = db.medic.query.resolves({ rows: expected });
      utils.getRegistrations({ ids: given }, (err, actual) => {
        assert.equal(err, null);
        assert.equal(registrationUtils.isValidRegistration.callCount, 2);
        assert.deepEqual(registrationUtils.isValidRegistration.args[0], [expectedDoc1, { config: 'all' }]);
        assert.deepEqual(registrationUtils.isValidRegistration.args[1], [expectedDoc2, { config: 'all' }]);
        assert.deepEqual(actual, [expectedDoc1, expectedDoc2 ]);
        assert.equal(view.callCount, 1);
        assert.equal(view.args[0][0], 'medic-client/registered_patients');
        assert.equal(view.args[0][1].keys, given);
        assert.equal(view.args[0][1].include_docs, true);
        done();
      });
    });

    it('returns empty array if id or ids', done => {
      const query = db.medic.query;
      utils.getRegistrations({ }, (err, actual) => {
        assert.equal(err, null);
        assert.deepEqual(actual, []);
        assert.equal(query.callCount, 0);
        done();
      });
    });

    it('only returns valid registrations', done => {
      sinon.stub(registrationUtils, 'isValidRegistration');
      sinon.stub(config, 'getAll').returns({ config: 'all' });
      const docs = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }, { _id: 'd' }, { _id: 'e' }, { _id: 'f' }];
      db.medic.query.resolves({ rows: docs.map(doc => ({ doc: doc })) });

      registrationUtils.isValidRegistration
        .withArgs({ _id: 'a' }).returns(true)
        .withArgs({ _id: 'b' }).returns(false)
        .withArgs({ _id: 'c' }).returns(false)
        .withArgs({ _id: 'd' }).returns(true)
        .withArgs({ _id: 'e' }).returns(false)
        .withArgs({ _id: 'f' }).returns(false);

      utils.getRegistrations({ ids: ['111', '222'] }, (err, actual) => {
        assert.equal(err, null);
        assert.equal(registrationUtils.isValidRegistration.callCount, 6);
        assert.deepEqual(actual, [{ _id: 'a' }, { _id: 'd' }]);
        done();
      });
    });
  });
});
