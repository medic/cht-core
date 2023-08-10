const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const { pregnancyHomeVisitScenarios } = require('../form-inputs');

const harness = new TestRunner();
const TODAY = '2000-01-01';

describe('Pregnancy home visit form', () => {
  before(() => harness.start());

  after(() => harness.stop());

  beforeEach(
    async() => {
      await harness.clear();
      await harness.setNow(new Date(TODAY));
    });

  afterEach(() => expect(harness.consoleErrors).to.be.empty);

  describe('Tetanus Toxoid (TT) Immunizations', () => {

    it('asks about tetanus immunizations if the patient has unreported ANC visits', async() => {
      await harness.setNow('1999-10-17');
      const pregnancyHomeVisitForm = {
        form: 'pregnancy_home_visit',
        contactSummary: {
          context: {
            is_active_pregnancy: true,
            lmp_date_8601: '1999-08-01',
          }
        }
      };
      const result = await harness.fillForm(pregnancyHomeVisitForm, ...pregnancyHomeVisitScenarios.riskDangerMultipleVisits);

      expect(result.errors).to.be.empty;
      const { fields } = result.report;
      const { safe_pregnancy_practices, context_vars, data, tt_received } = fields;
      expect(safe_pregnancy_practices).to.deep.include({
        tetanus: {
          tt_imm_received: 'yes',
          tt_note_1: '',
          tt_note_2: ''
        }
      });
      expect(context_vars.tt_received_ctx).to.equal('');
      expect(tt_received).to.equal('yes');
      expect(data.__received_tetanus_toxoid_this_pregnancy).to.equal('yes');
    });

    it('asks about tetanus immunizations if the patient attended their last ANC visit', async() => {
      const pregnancyHomeVisitForm = {
        form: 'pregnancy_home_visit',
        contactSummary: {
          context: {
            is_active_pregnancy: true,
            lmp_date_8601: '1999-08-01',
            pregnancy_follow_up_date_recent: '2000-01-20',
          }
        }
      };
      const result = await harness.fillForm(pregnancyHomeVisitForm, ...pregnancyHomeVisitScenarios.attendedLastANCVisit());

      expect(result.errors).to.be.empty;
      const { fields } = result.report;
      const { safe_pregnancy_practices, context_vars, data, tt_received } = fields;
      expect(safe_pregnancy_practices).to.deep.include({
        tetanus: {
          tt_imm_received: 'yes',
          tt_note_1: '',
          tt_note_2: ''
        }
      });
      expect(context_vars.tt_received_ctx).to.equal('');
      expect(tt_received).to.equal('yes');
      expect(data.__received_tetanus_toxoid_this_pregnancy).to.equal('yes');
    });

    it('does not ask about tetanus immunizations if the patient has already received one', async() => {
      const pregnancyHomeVisitForm = {
        form: 'pregnancy_home_visit',
        contactSummary: {
          context: {
            is_active_pregnancy: true,
            lmp_date_8601: '1999-08-01',
            pregnancy_follow_up_date_recent: '2000-01-20',
            tt_received_past: 'yes',
          }
        }
      };
      const result = await harness.fillForm(pregnancyHomeVisitForm, ...pregnancyHomeVisitScenarios.attendedLastANCVisit({ ttReceivedPast: true }));

      expect(result.errors).to.be.empty;
      const { fields } = result.report;
      const { safe_pregnancy_practices, context_vars, data, tt_received } = fields;
      expect(safe_pregnancy_practices.tetanus).to.not.exist;
      expect(context_vars.tt_received_ctx).to.equal('yes');
      expect(tt_received).to.equal('yes');
      expect(data.__received_tetanus_toxoid_this_pregnancy).to.equal('');
    });
  });
});
