require('chai').should();

const sinon = require('sinon');
const utils = require('../../../src/lib/utils');
const config = require('../../../src/config');

describe('accept_case_reports', () => {
  let transition;

  beforeEach(() => {
    config.init({
      getAll: sinon.stub().returns({}),
      get: sinon.stub(),
      getTranslations: sinon.stub().returns({})
    });
    transition = require('../../../src/transitions/accept_case_reports');
  });

  afterEach(done => {
    sinon.reset();
    sinon.restore();
    done();
  });

  describe('filter', () => {
    it('empty doc returns false', () => {
      transition.filter({}).should.equal(false);
    });
    it('no type returns false', () => {
      transition.filter({ form: 'x' }).should.equal(false);
    });
    it('invalid submission returns false', () => {
      config.get.returns([{ form: 'x' }, { form: 'z' }]);
      sinon.stub(utils, 'isValidSubmission').returns(false);
      transition
        .filter({
          form: 'x',
          type: 'data_record',
          reported_date: 1,
        })
        .should.equal(false);
      utils.isValidSubmission.callCount.should.equal(1);
      utils.isValidSubmission.args[0].should.deep.equal([{ form: 'x', type: 'data_record', reported_date: 1 }]);
    });
    it('returns true', () => {
      config.get.returns([{ form: 'x' }, { form: 'z' }]);
      sinon.stub(utils, 'isValidSubmission').returns(true);
      transition
        .filter({
          form: 'x',
          type: 'data_record',
          reported_date: 1,
        })
        .should.equal(true);
      utils.isValidSubmission.callCount.should.equal(1);
      utils.isValidSubmission.args[0].should.deep.equal([{ form: 'x', type: 'data_record', reported_date: 1 }]);
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

    it('adds place id from registration', () => {
      config.get.returns([{
        form: 'x',
        messages: [{
          event_type: 'report_accepted',
          message: [{
            content: 'Thank you, {{contact.name}}. ANC visit for {{patient_name}} ({{patient_id}}) has been recorded.',
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
      });
    });

  });

});
