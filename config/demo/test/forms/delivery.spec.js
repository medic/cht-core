const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const { deliveryReportScenarios } = require('../form-inputs');

const harness = new TestRunner();
const TODAY = '2000-01-01';

describe('Delivery form', () => {
  before(() => harness.start());

  after(() => harness.stop());

  beforeEach(
    async() => {
      await harness.clear();
      await harness.setNow(new Date(TODAY));
    });

  afterEach(() => expect(harness.consoleErrors).to.be.empty);

  describe('PNC Visits', () => {
    ['within_24_hrs', '3_days', '7_days', 'none'].forEach(pncVisitsAttended => {
      it(`shows summary when the the PNC Visits attended is [${pncVisitsAttended}]`, async() => {
        const result = await harness.fillForm('delivery', ...deliveryReportScenarios.pncVisits('1999-12-12', pncVisitsAttended, 2));

        expect(result.errors).to.be.empty;
        expect(result.report.fields.pnc_visits).to.deep.include({
          days: '20',
          pnc_visits_additional: '2',
          pnc_visits_attended: pncVisitsAttended,
        });
        const { summary } = result.report.fields;
        expect(summary.r_pnc_visits).to.exist;
        expect(summary.r_pnc_visits_completed).to.exist;
        expect(summary.r_pnc_visit_24hrs).to.equal('within_24_hrs' === pncVisitsAttended ? '' : undefined);
        expect(summary.r_pnc_visit_3days).to.equal('3_days' === pncVisitsAttended ? '' : undefined);
        expect(summary.r_pnc_visit_7days).to.equal('7_days' === pncVisitsAttended ? '' : undefined);
        expect(summary.r_pnc_visit_6weeks).to.equal('6_weeks' === pncVisitsAttended ? '' : undefined);
        expect(summary.r_pnc_visit_none).to.equal('none' === pncVisitsAttended ? '' : undefined);
        expect(summary.r_pnc_visits_add).to.exist;
      });
    });

    ['alive_well', 'alive_unwell'].forEach(motherOutcome => {
      it(`shows summary when the baby is deceased but the mother is [${motherOutcome}]`, async() => {
        const result = await harness.fillForm('delivery', ...deliveryReportScenarios.babyDeceased(TODAY, motherOutcome));

        expect(result.errors).to.be.empty;
        expect(result.report.fields.pnc_visits).to.deep.include({
          days: '0',
          pnc_visits_additional: '',
          pnc_visits_attended: 'none',
        });
        const { summary } = result.report.fields;
        expect(summary.r_pnc_visits).to.exist;
        expect(summary.r_pnc_visits_completed).to.exist;
        expect(summary.r_pnc_visit_24hrs).to.not.exist;
        expect(summary.r_pnc_visit_3days).to.not.exist;
        expect(summary.r_pnc_visit_7days).to.not.exist;
        expect(summary.r_pnc_visit_6weeks).to.not.exist;
        expect(summary.r_pnc_visit_none).to.exist;
        expect(summary.r_pnc_visits_add).to.not.exist;
      });
    });

    it('shows summary when the mother is deceased but the baby is alive and no PNC visits have happened', async() => {
      const result = await harness.fillForm('delivery', ...deliveryReportScenarios.motherDeceased(TODAY));

      expect(result.errors).to.be.empty;
      expect(result.report.fields.pnc_visits).to.deep.include({
        days: '0',
        pnc_visits_additional: '',
        pnc_visits_attended: 'none',
      });
      const { summary } = result.report.fields;
      expect(summary.r_pnc_visits).to.exist;
      expect(summary.r_pnc_visits_completed).to.exist;
      expect(summary.r_pnc_visit_24hrs).to.not.exist;
      expect(summary.r_pnc_visit_3days).to.not.exist;
      expect(summary.r_pnc_visit_7days).to.not.exist;
      expect(summary.r_pnc_visit_6weeks).to.not.exist;
      expect(summary.r_pnc_visit_none).to.exist;
      expect(summary.r_pnc_visits_add).to.not.exist;
    });

    it('does not show summary when the baby and the mother are deceased', async() => {
      const result = await harness.fillForm('delivery', ...deliveryReportScenarios.babyDeceased_motherDeceased(TODAY));

      expect(result.errors).to.be.empty;
      expect(result.report.fields.pnc_visits).to.not.exist;
      const { summary } = result.report.fields;
      expect(summary.r_pnc_visits).to.not.exist;
      expect(summary.r_pnc_visits_completed).to.not.exist;
      expect(summary.r_pnc_visit_24hrs).to.not.exist;
      expect(summary.r_pnc_visit_3days).to.not.exist;
      expect(summary.r_pnc_visit_7days).to.not.exist;
      expect(summary.r_pnc_visit_6weeks).to.not.exist;
      expect(summary.r_pnc_visit_none).to.not.exist;
      expect(summary.r_pnc_visits_add).to.not.exist;
    });
  });
});
