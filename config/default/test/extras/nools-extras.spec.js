const chai = require('chai');
const expect = chai.expect;
const moment = require('moment');
const sinon = require('sinon');
const extras = require('../../nools-extras');

describe('Date related tests', () => {
  beforeEach(() => {
    sinon.useFakeTimers(new Date());
  });
  afterEach(() => {
    sinon.restore();
  });

  it('today is correct', () => {
    expect(moment().startOf('day').valueOf()).to.equal(extras.today);
  });

  it('method addDays', () => {
    for (let i = 1; i < 100; i++) {
      expect(moment().startOf('day').add(i, 'days').valueOf()).to.equal(extras.addDays(extras.today, i).getTime());
    }
  });

  it('method getTimeForMidnight', () => {
    expect(moment().startOf('day').valueOf()).to.equal(extras.getTimeForMidnight(Date.now()).getTime());
  });

  it('method getDateMS', () => {
    expect(moment('2000-01-01').valueOf()).to.equal(extras.getDateMS('2000-01-01'));//String format
    expect(moment('2000-01-01').valueOf()).to.equal(extras.getDateMS(new Date('2000-01-01')));//Date format
    expect(moment('2000-01-01').valueOf()).to.equal(extras.getDateMS((new Date('2000-01-01').getTime())));//MS since epoch
  });

  it('method getMostRecentReport', () => {
    const reports = [
      { _id: 'r1', reported_date: 2, form: 'a' },
      { _id: 'r2', reported_date: 3, form: 'b' },
      { _id: 'r3', reported_date: 1, form: 'a' },
      { _id: 'r4', reported_date: 2, form: 'b' },
    ];
    expect(extras.getMostRecentReport(reports, 'a')._id).to.equal('r1');
    expect(extras.getMostRecentReport(reports, 'b')._id).to.equal('r2');
  });
});

describe('Test method getField', () => {
  const { getField } = extras;

  const nestedValue = { fields: { a: { b: 'value' } } };
  it('get undefined field', () => expect(getField(nestedValue, undefined)).to.eq(undefined));
  it('get empty field', () => expect(getField(nestedValue, '')).to.eq(undefined));
  it('get nested', () => expect(getField(nestedValue, 'a.b')).to.eq('value'));
  it('leaf undefined', () => expect(getField(nestedValue, 'a.c')).to.be.undefined);
  it('root undefined', () => expect(getField(nestedValue, 'x')).to.be.undefined);
  it('empty string input', () => expect(getField(nestedValue, '')).to.be.undefined);
  it('get node', () => expect(getField(nestedValue, 'a')).to.deep.eq({ b: 'value' }));
  it('undefined input', () => expect(getField(undefined, 'a')).to.be.undefined);
  it('leaf + 1 level undefined', () => expect(getField(nestedValue, 'a.b.c')).to.be.undefined);
  it('leaf + 2 levels undefined', () => expect(getField(nestedValue, 'a.b.c.d')).to.be.undefined);
});

describe('Test method countANCFacilityVisits', () => {
  const { countANCFacilityVisits } = extras;
  it('Count ANC facility visits', () => {
    const contact = {
      reports: [
        {
          form: 'pregnancy',
          reported_date: 0,
          fields: {}
        }
      ]
    };
    expect(countANCFacilityVisits(contact, contact.reports[0])).to.eq(0);
    contact.reports[0].fields.anc_visits_hf = { anc_visits_hf_past: { visited_hf_count: 1 } };
    expect(countANCFacilityVisits(contact, contact.reports[0])).to.eq(1);
    contact.reports.push({
      form: 'pregnancy_home_visit',
      reported_date: 1,
      fields: {
        anc_visits_hf: {}
      }
    });
    expect(countANCFacilityVisits(contact, contact.reports[0])).to.eq(1);
    contact.reports.push({
      form: 'pregnancy_home_visit',
      reported_date: 2,
      fields: {
        anc_visits_hf: {
          anc_visits_hf_past: {
            last_visit_attended: 'yes'
          }
        }
      }
    });
    expect(countANCFacilityVisits(contact, contact.reports[0])).to.eq(2);

    contact.reports.push({
      form: 'pregnancy_home_visit',
      reported_date: 3,
      fields: {
        anc_visits_hf: {
          anc_visits_hf_past: {
            report_other_visits: 'yes',
            visited_hf_count: '3'
          }
        }
      }
    });
    expect(countANCFacilityVisits(contact, contact.reports[0])).to.eq(5);

    contact.reports.push({
      form: 'pregnancy_home_visit',
      reported_date: 4,
      fields: {
        anc_visits_hf: {
          anc_visits_hf_past: {
            last_visit_attended: 'yes',
            report_other_visits: 'yes',
            visited_hf_count: '2'
          }
        }
      }
    });
    expect(countANCFacilityVisits(contact, contact.reports[0])).to.eq(8);
  });
});
