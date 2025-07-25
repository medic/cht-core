const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const harness = new TestRunner();
const { getRiskFactorsFromPregnancy } = require('../../contact-summary-extras');
let report = {};
describe('Tests for getRiskFactorsFromPregnancy() method.', () => {
  before(() => harness.start());
  after(async () => { return await harness.stop(); });
  beforeEach(async () => {
    await harness.clear();
    // initialize report
    report = {
      form: 'pregnancy',
      fields: {
        risk_factors: {
          risk_factors_history: {

          },
          r_risk_factor_present: 'yes',
          risk_factors_present: {
            primary_condition: '',
            secondary_condition: ''
          }
        }
      }
    };
  });
  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });

  it(`getRiskFactorsFromPregnancy() returns empty if both primary and secondary risk factors are not present.`, () => {
    expect(getRiskFactorsFromPregnancy(report)).to.be.empty;
  });

  it(`getRiskFactorsFromPregnancy() returns empty if the form is not pregnancy form.`, () => {
    report.fields.risk_factors.risk_factors_present.primary_condition = 'p1';
    report.form = 'family_planning';
    expect(getRiskFactorsFromPregnancy(report).length).to.equal(0);
  });

  it(`getRiskFactorsFromPregnancy() returns primary factors only when secondary factors are empty.`, () => {
    const primary_conditions = 'p1 p2';
    report.fields.risk_factors.risk_factors_present.primary_condition = primary_conditions;
    expect(getRiskFactorsFromPregnancy(report)).to.have.members(['p1', 'p2']);
  });

  it(`getRiskFactorsFromPregnancy() returns secondary factors only when primary factors are empty.`, () => {
    const conditions = 'p1 p2';
    report.fields.risk_factors.risk_factors_present.secondary_condition = conditions;
    expect(getRiskFactorsFromPregnancy(report)).to.have.members(['p1', 'p2']);
  });

  it(`getRiskFactorsFromPregnancy() returns both primary and secondary risk factor.`, () => {
    const conditions = ['p1', 'p2'];
    report.fields.risk_factors.risk_factors_present.primary_condition = conditions[0];
    report.fields.risk_factors.risk_factors_present.secondary_condition = conditions[1];
    expect(getRiskFactorsFromPregnancy(report)).to.have.members(conditions);
  });

  it(`getRiskFactorsFromPregnancy() returns first_pregnancy when it's present.`, () => {
    report.fields.risk_factors.risk_factors_history.first_pregnancy = 'yes';
    expect(getRiskFactorsFromPregnancy(report)).to.have.members(['first_pregnancy']);
  });

  it(`getRiskFactorsFromPregnancy() returns previous_miscarriage when it's present.`, () => {
    report.fields.risk_factors.risk_factors_history.previous_miscarriage = 'yes';
    expect(getRiskFactorsFromPregnancy(report)).to.have.members(['previous_miscarriage']);
  });

  it(`getRiskFactorsFromPregnancy() returns all combination of risk factors when they are present.`, () => {
    const conditions = ['previous_miscarriage', 'first_pregnancy', 'p1', 'p2'];
    report.fields.risk_factors.risk_factors_history.previous_miscarriage = 'yes';
    report.fields.risk_factors.risk_factors_history.first_pregnancy = 'yes';
    report.fields.risk_factors.risk_factors_present.primary_condition = conditions[2];
    report.fields.risk_factors.risk_factors_present.secondary_condition = conditions[3];

    expect(getRiskFactorsFromPregnancy(report)).to.have.members(conditions);
  });

});
