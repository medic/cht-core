const db = require('../../src/db');
const sinon = require('sinon');
const assert = require('chai').assert;
const utils = require('../../src/lib/utils');
const config = require('../../src/config');
const registrationUtils = require('@medic/registration-utils');

describe('utils', () => {
  beforeEach(() => {
    config.init({
      getAll: sinon.stub(),
      get: sinon.stub(),
      getTranslations: sinon.stub()
    });
    sinon.stub(db.medic, 'query');
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  it('getReportsWithSameClinicAndForm calls through to db view correctly', () => {

    const formName = 'someForm';
    const clinicId = 'someClinicId';
    const result = [{_id: 'someRowId'}];

    db.medic.query
      .withArgs('medic/reports_by_form_and_parent', {
        startkey: [formName, clinicId],
        endkey: [formName, clinicId],
        include_docs: true,
        reduce: false,
      })
      .resolves({ rows: result });

    return utils.getReportsWithSameParentAndForm({
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
    config.getTranslations.returns({
      en: { sms_received: 'got it!' }
    });
    assert.equal(utils.translate('sms_received'), 'got it!');
  });

  it('translate returns key if translations not found', () => {
    config.getTranslations.returns({});
    assert.equal(utils.translate('sms_received'), 'sms_received');
  });

  describe('getContactUuid', () => {

    it('returns the ID for the given short code', () => {
      const expected = 'abc123';
      const given = '55998';
      const patients = [ { id: expected } ];
      const query = db.medic.query.resolves({ rows: patients });
      return utils.getContactUuid(given).then((actual) => {
        assert.equal(actual, expected);
        assert.equal(query.callCount, 1);
        assert.equal(query.args[0][0], 'medic-client/contacts_by_reference');
        assert.equal(query.args[0][1].key[0], 'shortcode');
        assert.equal(query.args[0][1].key[1], given);
        assert.equal(query.args[0][1].include_docs, false);
      });
    });

    it('returns empty when no patient found', () => {
      const given = '55998';
      const patients = [ ];
      const query = db.medic.query.resolves({ rows: patients });
      return utils.getContactUuid(given).then((actual) => {
        assert.equal(actual, null);
        assert.equal(query.callCount, 1);
      });
    });

    it('returns empty when no shortcode given', () => {
      const query = db.medic.query;
      return utils.getContactUuid(null).then((actual) => {
        assert.equal(actual, null);
        assert.equal(query.callCount, 0);
      });
    });

  });

  describe('getContact', () => {

    it('returns the patient for the given short code', () => {
      const expected = 'abc123';
      const given = '55998';
      const patients = [ { id: expected, doc: { _id: expected, name: 'jim', patient_id: given } } ];
      const query = db.medic.query.resolves({ rows: patients });
      return utils.getContact(given).then(actual => {
        assert.equal(actual.name, 'jim');
        assert.equal(query.callCount, 1);
        assert.equal(query.args[0][0], 'medic-client/contacts_by_reference');
        assert.equal(query.args[0][1].key[0], 'shortcode');
        assert.equal(query.args[0][1].key[1], given);
        assert.equal(query.args[0][1].include_docs, true);
      });
    });

    it('returns empty when no patient found', () => {
      const given = '55998';
      const patients = [ ];
      const query = db.medic.query.resolves({ rows: patients });
      return utils.getContact(given).then(actual => {
        assert.equal(actual, null);
        assert.equal(query.callCount, 1);
      });
    });

    it('returns empty when no shortcode given', () => {
      const query = db.medic.query;
      return utils.getContact(null).then(actual => {
        assert.equal(actual, null);
        assert.equal(query.callCount, 0);
      });
    });
  });

  describe('getRegistrations', () => {

    it('queries by id if given', () => {
      sinon.stub(registrationUtils, 'isValidRegistration').returns(true);
      config.getAll.returns({ config: 'all' });
      const expectedDoc = { _id: 'a' };
      const expected = [ { doc: expectedDoc } ];
      const given = '22222';
      const query = db.medic.query.resolves({ rows: expected });
      return utils.getRegistrations({ id: given }).then((actual) => {
        assert.deepEqual(actual, [ expectedDoc ]);
        assert.equal(query.callCount, 1);
        assert.equal(registrationUtils.isValidRegistration.callCount, 1);
        assert.deepEqual(registrationUtils.isValidRegistration.args[0], [expectedDoc, { config: 'all' }]);
        assert.equal(query.args[0][0], 'medic-client/registered_patients');
        assert.equal(query.args[0][1].key, given);
        assert.equal(query.args[0][1].include_docs, true);
      });
    });

    it('queries by ids if given', () => {
      sinon.stub(registrationUtils, 'isValidRegistration').returns(true);
      config.getAll.returns({ config: 'all' });
      const expectedDoc1 = { id: 'a' };
      const expectedDoc2 = { id: 'b' };
      const expected = [ { doc: expectedDoc1 }, { doc: expectedDoc2 } ];
      const given = ['11111', '22222'];
      const view = db.medic.query.resolves({ rows: expected });
      return utils.getRegistrations({ ids: given }).then((actual) => {
        assert.equal(registrationUtils.isValidRegistration.callCount, 2);
        assert.deepEqual(registrationUtils.isValidRegistration.args[0], [expectedDoc1, { config: 'all' }]);
        assert.deepEqual(registrationUtils.isValidRegistration.args[1], [expectedDoc2, { config: 'all' }]);
        assert.deepEqual(actual, [expectedDoc1, expectedDoc2 ]);
        assert.equal(view.callCount, 1);
        assert.equal(view.args[0][0], 'medic-client/registered_patients');
        assert.equal(view.args[0][1].keys, given);
        assert.equal(view.args[0][1].include_docs, true);
      });
    });

    it('returns empty array if id or ids', () => {
      const query = db.medic.query;
      return utils.getRegistrations({ }).then((actual) => {
        assert.deepEqual(actual, []);
        assert.equal(query.callCount, 0);
      });
    });

    it('only returns valid registrations', () => {
      sinon.stub(registrationUtils, 'isValidRegistration');
      config.getAll.returns({ config: 'all' });
      const docs = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }, { _id: 'd' }, { _id: 'e' }, { _id: 'f' }];
      db.medic.query.resolves({ rows: docs.map(doc => ({ doc: doc })) });

      registrationUtils.isValidRegistration
        .withArgs({ _id: 'a' }).returns(true)
        .withArgs({ _id: 'b' }).returns(false)
        .withArgs({ _id: 'c' }).returns(false)
        .withArgs({ _id: 'd' }).returns(true)
        .withArgs({ _id: 'e' }).returns(false)
        .withArgs({ _id: 'f' }).returns(false);

      return utils.getRegistrations({ ids: ['111', '222'] }).then((actual) => {
        assert.equal(registrationUtils.isValidRegistration.callCount, 6);
        assert.deepEqual(actual, [{ _id: 'a' }, { _id: 'd' }]);
      });
    });
  });

  describe('isValidSubmission', () => {
    it('should return false with invalid params', () => {
      assert(!utils.isValidSubmission());
      assert(!utils.isValidSubmission(false));
    });

    it('returns false for reports for unknown json form', () => {
      const doc = { form: 'R', type: 'data_record' };
      config.get.withArgs('forms').resolves({ F: { public_form: true } });
      sinon.spy(utils, 'getForm');
      assert(!utils.isValidSubmission(doc));
      assert.equal(utils.getForm.callCount, 1);
      assert.equal(utils.getForm.args[0][0], 'R');

    });

    it('returns false for reports from unknown clinic', () => {
      const doc = { form: 'R', type: 'data_record' };
      config.get.withArgs('forms').returns({ R: { public_form: false }});
      sinon.spy(utils, 'hasKnownSender');
      assert(!utils.isValidSubmission(doc));
      assert.equal(config.get.callCount, 1);
      assert.equal(config.get.args[0][0], 'forms');
      assert.equal(utils.hasKnownSender.callCount, 1);
      assert.deepEqual(utils.hasKnownSender.args[0], [doc]);
    });

    it('returns true for reports for public forms from unknown clinic', () => {
      const doc = { form: 'R', type: 'data_record' };
      config.get.withArgs('forms').returns({ R: { public_form: true } });
      sinon.spy(utils, 'hasKnownSender');
      assert(utils.isValidSubmission(doc));
      assert.equal(config.get.callCount, 1);
      assert.equal(config.get.args[0][0], 'forms');
      assert.equal(utils.hasKnownSender.callCount, 0);
    });

    it('returns true for xforms reports', () => {
      const doc = { form: 'R', content_type: 'xml', type: 'data_record' };
      config.get.withArgs('forms').returns({ OTHER: {} });
      assert(utils.isValidSubmission(doc));
      assert.equal(config.get.callCount, 1);
      assert.equal(config.get.args[0][0], 'forms');
    });

    it('returns true for reports for non-public forms from known clinics', () => {
      const doc = { form: 'R', type: 'data_record' };
      config.get.withArgs('forms').returns({ R: { public_form: false } });
      sinon.stub(utils, 'hasKnownSender').returns(true);
      assert(utils.isValidSubmission(doc));
      assert.equal(config.get.callCount, 1);
      assert.equal(utils.hasKnownSender.callCount, 1);
    });

    it('returns true for reports for non-public forms from known submitters', () => {
      const doc = { form: 'R', type: 'data_record', contact: { phone: '12345' } };
      config.get.withArgs('forms').returns({ R: { public_form: false } });
      sinon.spy(utils, 'hasKnownSender');
      assert(utils.isValidSubmission(doc));
      assert.equal(config.get.callCount, 1);
      assert.equal(utils.hasKnownSender.callCount, 1);
    });
  });
});
