const sinon = require('sinon');
const assert = require('chai').assert;
const config = require('../../../src/config');
const { DOC_TYPES } = require('@medic/constants');

const types = [
  { id: 'person', person: true },
  { id: 'place' }
];

describe('generate_shortcode_on_contacts transition', () => {
  let transitionUtils;
  let utils;
  let db;
  let transition;

  beforeEach(() => {
    config.init({ getAll: sinon.stub().returns({ contact_types: types }), });
    transitionUtils = require('../../../src/transitions/utils');
    utils = require('../../../src/lib/utils');
    db = require('../../../src/db');
    transition = require('../../../src/transitions/generate_shortcode_on_contacts');
  });

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  it('adds patient_id to people', () => {
    sinon.stub(transitionUtils, 'getUniqueId').resolves('something');
    transition.onMatch({ doc: {} });
    assert.equal(transitionUtils.getUniqueId.callCount, 1);
  });

  describe('filter', () => {

    it('accepts person contact types', () => {
      const doc = { type: 'person' };
      assert.equal(!!transition.filter({ doc }), true);
    });

    it('should accept place contact types', () => {
      const doc = { type: 'contact', contact_type: 'place' };
      assert.equal(!!transition.filter({ doc }), true);
    });

    it('ignores persons that already have a patient_id', () => {
      const doc = { type: 'person', patient_id: '12345' };
      assert.equal(!!transition.filter({ doc }), false);
    });

    it('ignores places that already have a patient_id', () => {
      const doc = { type: 'place', place_id: '12345' };
      assert.equal(!!transition.filter({ doc }), false);
    });

    it('ignores docs with unknown type', () => {
      const doc = { };
      assert.equal(!!transition.filter({ doc }), false);
    });

    it('accepts reports with a patient uuid and hydrated patient_id but no patient_id', () => {
      const doc = {
        type: DOC_TYPES.DATA_RECORD,
        form: 'pregnancy',
        fields: { patient_uuid: 'patient-uuid' },
        patient: { _id: 'patient-uuid', patient_id: '12345' },
      };

      assert.equal(!!transition.filter({ doc }), true);
    });

    it('ignores reports that already have patient_id', () => {
      const reportWithFieldPatientId = {
        type: DOC_TYPES.DATA_RECORD,
        form: 'pregnancy',
        fields: { patient_uuid: 'patient-uuid', patient_id: '12345' },
        patient: { _id: 'patient-uuid', patient_id: '12345' },
      };
      const reportWithPatientId = {
        type: DOC_TYPES.DATA_RECORD,
        form: 'pregnancy',
        patient_id: '12345',
        fields: { patient_uuid: 'patient-uuid' },
        patient: { _id: 'patient-uuid', patient_id: '12345' },
      };

      assert.equal(!!transition.filter({ doc: reportWithFieldPatientId }), false);
      assert.equal(!!transition.filter({ doc: reportWithPatientId }), false);
    });

    it('ignores reports when the hydrated patient does not have patient_id', () => {
      const doc = {
        type: DOC_TYPES.DATA_RECORD,
        form: 'pregnancy',
        fields: { patient_uuid: 'patient-uuid' },
        patient: { _id: 'patient-uuid' },
      };

      assert.equal(!!transition.filter({ doc }), false);
    });
  });

  describe('onMatch', () => {
    it('should add patient_id to people', () => {
      const doc = { type: 'contact', contact_type: 'person' };
      sinon.stub(transitionUtils, 'getUniqueId').resolves('the_unique_id');
      return transition.onMatch({ doc }).then(result => {
        assert.equal(result, true);
        assert.deepEqual(doc, { type: 'contact', contact_type: 'person', patient_id: 'the_unique_id' });
      });
    });

    it('should add place_id to places', () => {
      const doc = { type: 'contact', contact_type: 'place' };
      sinon.stub(transitionUtils, 'getUniqueId').resolves('the_unique_id');
      return transition.onMatch({ doc }).then(result => {
        assert.equal(result, true);
        assert.deepEqual(doc, { type: 'contact', contact_type: 'place', place_id: 'the_unique_id' });
      });
    });

    it('should add patient_id to late-arriving reports with patient_uuid', () => {
      const doc = {
        type: DOC_TYPES.DATA_RECORD,
        form: 'pregnancy',
        fields: { patient_uuid: 'patient-uuid' },
        patient: { _id: 'patient-uuid', patient_id: '12345' },
      };
      sinon.stub(transitionUtils, 'getUniqueId');
      sinon.stub(db.medic, 'bulkDocs');

      return transition.onMatch({ doc }).then(result => {
        assert.equal(result, true);
        assert.deepEqual(doc, {
          type: DOC_TYPES.DATA_RECORD,
          form: 'pregnancy',
          fields: { patient_uuid: 'patient-uuid', patient_id: '12345' },
          patient: { _id: 'patient-uuid', patient_id: '12345' },
        });
        assert.equal(transitionUtils.getUniqueId.callCount, 0);
        assert.equal(db.medic.bulkDocs.callCount, 0);
      });
    });

    it('should add generated patient_id to existing reports for the person', () => {
      const doc = { _id: 'patient-uuid', type: 'contact', contact_type: 'person' };
      const reportWithoutPatientId = {
        _id: 'report-without-patient-id',
        type: DOC_TYPES.DATA_RECORD,
        form: 'pregnancy',
        fields: { patient_uuid: 'patient-uuid' },
      };
      const reportWithPatientId = {
        _id: 'report-with-patient-id',
        type: DOC_TYPES.DATA_RECORD,
        form: 'pregnancy',
        fields: { patient_uuid: 'patient-uuid', patient_id: 'existing' },
      };
      const reportWithTopLevelPatientId = {
        _id: 'report-with-top-level-patient-id',
        type: DOC_TYPES.DATA_RECORD,
        form: 'pregnancy',
        patient_id: 'existing',
        fields: { patient_uuid: 'patient-uuid' },
      };
      const reportWithoutPatientUuid = {
        _id: 'report-without-patient-uuid',
        type: DOC_TYPES.DATA_RECORD,
        form: 'pregnancy',
        fields: { place_uuid: 'patient-uuid' },
      };

      sinon.stub(transitionUtils, 'getUniqueId').resolves('the_unique_id');
      sinon
        .stub(utils, 'getReportsBySubject')
        .withArgs({ id: 'patient-uuid' })
        .resolves([
          reportWithoutPatientId,
          reportWithPatientId,
          reportWithTopLevelPatientId,
          reportWithoutPatientUuid,
        ]);
      sinon.stub(db.medic, 'bulkDocs').resolves();

      return transition.onMatch({ doc }).then(result => {
        assert.equal(result, true);
        assert.deepEqual(doc, {
          _id: 'patient-uuid',
          type: 'contact',
          contact_type: 'person',
          patient_id: 'the_unique_id',
        });
        assert.equal(utils.getReportsBySubject.callCount, 1);
        assert.deepEqual(utils.getReportsBySubject.args[0], [{ id: 'patient-uuid' }]);
        assert.equal(db.medic.bulkDocs.callCount, 1);
        assert.deepEqual(db.medic.bulkDocs.args[0], [[{
          _id: 'report-without-patient-id',
          type: DOC_TYPES.DATA_RECORD,
          form: 'pregnancy',
          fields: { patient_uuid: 'patient-uuid', patient_id: 'the_unique_id' },
        }]]);
        assert.equal(reportWithPatientId.fields.patient_id, 'existing');
        assert.equal(reportWithTopLevelPatientId.fields.patient_id, undefined);
        assert.equal(reportWithoutPatientUuid.fields.patient_id, undefined);
      });
    });

    it('should not update reports when generating place_id', () => {
      const doc = { _id: 'place-uuid', type: 'contact', contact_type: 'place' };
      sinon.stub(transitionUtils, 'getUniqueId').resolves('the_unique_id');
      sinon.stub(utils, 'getReportsBySubject');
      sinon.stub(db.medic, 'bulkDocs');

      return transition.onMatch({ doc }).then(result => {
        assert.equal(result, true);
        assert.deepEqual(doc, { _id: 'place-uuid', type: 'contact', contact_type: 'place', place_id: 'the_unique_id' });
        assert.equal(utils.getReportsBySubject.callCount, 0);
        assert.equal(db.medic.bulkDocs.callCount, 0);
      });
    });

    it('should skip report bulk update when all reports already have patient_id', () => {
      const doc = { _id: 'patient-uuid', type: 'contact', contact_type: 'person' };
      const reportWithPatientId = {
        _id: 'report-with-patient-id',
        type: DOC_TYPES.DATA_RECORD,
        form: 'pregnancy',
        fields: { patient_uuid: 'patient-uuid', patient_id: 'existing' },
      };

      sinon.stub(transitionUtils, 'getUniqueId').resolves('the_unique_id');
      sinon.stub(utils, 'getReportsBySubject').resolves([reportWithPatientId]);
      sinon.stub(db.medic, 'bulkDocs').resolves();

      return transition.onMatch({ doc }).then(result => {
        assert.equal(result, true);
        assert.deepEqual(doc, {
          _id: 'patient-uuid',
          type: 'contact',
          contact_type: 'person',
          patient_id: 'the_unique_id',
        });
        assert.equal(utils.getReportsBySubject.callCount, 1);
        assert.equal(db.medic.bulkDocs.callCount, 0);
        assert.equal(reportWithPatientId.fields.patient_id, 'existing');
      });
    });
  });

});
