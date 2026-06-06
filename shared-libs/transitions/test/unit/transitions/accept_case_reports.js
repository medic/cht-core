require('chai').should();
const { expect } = require('chai');

const sinon = require('sinon');
const utils = require('../../../src/lib/utils');
const config = require('../../../src/config');
const messagesMod = require('../../../src/lib/messages');
const { DOC_TYPES } = require('@medic/constants');

describe('accept_case_reports', () => {
  let transition;
  let transitionUtils;

  beforeEach(() => {
    config.init({
      getAll: sinon.stub().returns({}),
      get: sinon.stub(),
      getTranslations: sinon.stub().returns({})
    });
    transitionUtils = require('../../../src/transitions/utils');
    transition = require('../../../src/transitions/accept_case_reports');
  });

  afterEach(done => {
    sinon.reset();
    sinon.restore();
    done();
  });

  describe('filter', () => {
    it('empty doc returns false', () => {
      transition.filter({ doc: {} }).should.equal(false);
    });
    it('no type returns false', () => {
      transition.filter({ doc: { form: 'x' } }).should.equal(false);
    });
    it('invalid submission returns false', () => {
      config.get.returns([{ form: 'x' }, { form: 'z' }]);
      sinon.stub(utils, 'isValidSubmission').returns(false);
      transition
        .filter({
          doc: {
            form: 'x',
            type: DOC_TYPES.DATA_RECORD,
            reported_date: 1,
          },
          info: {}
        })
        .should.equal(false);
      utils.isValidSubmission.callCount.should.equal(1);
      utils.isValidSubmission.args[0].should.deep.equal([{ form: 'x', type: DOC_TYPES.DATA_RECORD, reported_date: 1 }]);
    });
    it('returns true', () => {
      config.get.returns([{ form: 'x' }, { form: 'z' }]);
      sinon.stub(utils, 'isValidSubmission').returns(true);
      transition
        .filter({
          doc: {
            form: 'x',
            type: DOC_TYPES.DATA_RECORD,
            reported_date: 1,
          },
          info: {}
        })
        .should.equal(true);
      utils.isValidSubmission.callCount.should.equal(1);
      utils.isValidSubmission.args[0].should.deep.equal([{ form: 'x', type: DOC_TYPES.DATA_RECORD, reported_date: 1 }]);
    });
  });

  describe('onMatch', () => {
    it('return nothing if form not included', () => {
      config.get.returns([{ form: 'x' }, { form: 'z' }]);
      const change = {
        doc: {
          form: 'y',
        },
      };
      return transition.onMatch(change).then(changed => {
        (typeof changed).should.equal('undefined');
      });
    });

    it('with no patient id adds error msg and response', () => {
      config.get.returns([{ form: 'x' }, { form: 'z' }]);
      sinon.stub(utils, 'getReportsBySubject').resolves([]);

      const doc = {
        form: 'x',
        fields: { patient_id: 'x' },
      };

      return transition.onMatch({ doc }).then(() => {
        doc.errors.length.should.equal(1);
        doc.errors[0].message.should.equal(
          'messages.generic.registration_not_found'
        );
      });
    });

    it('adds configured messages', () => {
      config.get.returns([{
        form: 'x',
        messages: [{
          event_type: 'report_accepted',
          message: [{
            content: 'Thanks {{contact.name}}',
            locale: 'en',
          }],
          recipient: 'reporting_unit',
        }]
      }]);
      sinon.stub(utils, 'getReportsBySubject').resolves([{
        fields: { place_uuid: 'abc' }
      }]);

      const doc = {
        form: 'x',
        fields: { patient_id: 'x' },
        case_id: '123',
        contact: { name: 'jane' }
      };

      return transition.onMatch({ doc }).then(() => {
        doc.tasks.length.should.equal(1);
        doc.tasks[0].messages.length.should.equal(1);
        doc.tasks[0].messages[0].message.should.equal('Thanks jane');
      });
    });

    it('skips messages with non report_accepted event_type', () => {
      config.get.returns([{
        form: 'x',
        messages: [{
          event_type: 'registration_not_found',
          message: [{ content: 'Not found', locale: 'en' }],
          recipient: 'reporting_unit',
        }]
      }]);
      sinon.stub(utils, 'getReportsBySubject').resolves([{
        fields: { place_uuid: 'abc' }
      }]);

      const doc = {
        form: 'x',
        fields: { patient_id: 'x' },
        case_id: '123',
      };

      return transition.onMatch({ doc }).then(() => {
        expect(doc.tasks).to.be.undefined;
      });
    });

    it('evaluates bool_expr when present on message', () => {
      config.get.returns([{
        form: 'x',
        messages: [{
          event_type: 'report_accepted',
          bool_expr: 'doc.fields.status === "active"',
          message: [{ content: 'Active case', locale: 'en' }],
          recipient: 'reporting_unit',
        }]
      }]);
      sinon.stub(utils, 'getReportsBySubject').resolves([{
        fields: { place_uuid: 'abc' }
      }]);

      const doc = {
        form: 'x',
        fields: { patient_id: 'x', status: 'active' },
        case_id: '123',
        contact: { name: 'jane' },
      };

      return transition.onMatch({ doc }).then(() => {
        doc.tasks.length.should.equal(1);
        doc.tasks[0].messages.length.should.equal(1);
        doc.tasks[0].messages[0].message.should.equal('Active case');
      });
    });

    it('skips adding messages when config has no messages property', () => {
      config.get.returns([{ form: 'x' }]);
      sinon.stub(utils, 'getReportsBySubject').resolves([{
        fields: { place_uuid: 'abc' }
      }]);

      const doc = {
        form: 'x',
        fields: { patient_id: 'x' },
        case_id: '123',
      };

      return transition.onMatch({ doc }).then(() => {
        expect(doc.tasks).to.be.undefined;
      });
    });

    it('handles registrations with no place_uuid', () => {
      config.get.returns([{ form: 'x' }]);
      sinon.stub(utils, 'getReportsBySubject').resolves([{
        fields: {}
      }]);

      const doc = {
        form: 'x',
        fields: { patient_id: 'x' },
        case_id: '123',
      };

      return transition.onMatch({ doc }).then(() => {
        expect(doc.fields.place_uuid).to.be.undefined;
        expect(doc.tasks).to.equal(undefined);
      });
    });

    it('initializes doc.fields when not present during place uuid update', () => {
      config.get.returns([{ form: 'x' }]);
      sinon.stub(utils, 'getReportsBySubject').resolves([{
        fields: { place_uuid: 'abc' }
      }]);

      const doc = {
        form: 'x',
        case_id: '123',
      };

      return transition.onMatch({ doc }).then(() => {
        doc.fields.place_uuid.should.equal('abc');
        expect(doc.tasks).to.equal(undefined);
      });
    });

    it('returns true and adds errors when validation fails', () => {
      config.get.returns([{
        form: 'x',
        validations: { list: [{ property: 'patient_id', rule: 'required' }] },
        messages: [{ event_type: 'report_accepted', message: [{ content: 'ok', locale: 'en' }] }],
      }]);
      sinon.stub(transitionUtils, 'validate').resolves([{ message: 'patient_id is required' }]);
      sinon.stub(messagesMod, 'addErrors');

      const doc = { form: 'x', fields: {} };

      return transition.onMatch({ doc }).then(changed => {
        changed.should.equal(true);
        messagesMod.addErrors.callCount.should.equal(1);
        expect(doc.tasks).to.equal(undefined);
      });
    });

    it('adds place id from registration', () => {
      config.get.returns([{
        form: 'x',
        messages: [{
          event_type: 'report_accepted',
          message: [{
            content: 'Thank you. ANC visit for {{patient_id}} has been recorded.',
            locale: 'en',
          }],
          recipient: 'reporting_unit',
        }]
      }]);
      sinon.stub(utils, 'getReportsBySubject').resolves([{
        fields: { place_uuid: 'abc' }
      }]);

      const doc = {
        form: 'x',
        fields: {
          patient_id: 'x',
          case_id: '123',
        }
      };

      return transition.onMatch({ doc }).then(() => {
        doc.fields.place_uuid.should.equal('abc');
        doc.tasks.length.should.equal(1);
        doc.tasks[0].messages.length.should.equal(1);
        doc.tasks[0].messages[0].message.should.equal('Thank you. ANC visit for x has been recorded.');
      });
    });

  });

});
