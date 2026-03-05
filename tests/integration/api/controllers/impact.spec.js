const chai = require('chai').use(require('deep-equal-in-any-order'));
const utils = require('@utils');
const reportFactory = require('@factories/cht/reports/generic-report');
const placeFactory = require('@factories/cht/contacts/place');
const dataFactory = require('@factories/cht/generate');
const { CONTACT_TYPES } = require('@medic/constants');

describe('impact', () => {

  const createReports = (count, form) => {
    const docs = [];
    for (let i = 0; i < count; i++) {
      docs.push(utils.deepFreeze(reportFactory.report().build({ form })));
    }
    return docs;
  };

  afterEach(() => utils.revertDb([], true));

  describe('v1', () => {
    it('return impact data on expected format', async () => {
      const result = await utils.request({ path: '/api/v1/impact' });
      chai.expect(result).to.deep.equal({
        contacts: {
          count: 1,
          by_type: [
            { type: 'person', count: 1 }
          ]
        },
        users: { count: 0 },
        reports: {
          by_form: [],
          count: 0
        }
      });
    });

    it('adding users adds user count on api', async () => {
      const docs = dataFactory.createHierarchy({ name: 'impact', user: true, nbrClinics: 1, nbrPersons: 1 });
      await utils.saveDocs([...docs.places, ...docs.persons]);
      await utils.createUsers([docs.user]);

      const result = await utils.request({ path: '/api/v1/impact' });
      chai.expect(result).to.deep.equal({
        contacts: {
          count: 6,
          by_type: [
            { type: 'clinic', count: 1 },
            { type: 'district_hospital', count: 1 },
            { type: CONTACT_TYPES.HEALTH_CENTER, count: 1 },
            { type: 'person', count: 3 }
          ]
        },
        users: { count: 1 },
        reports: {
          by_form: [],
          count: 0
        }
      });
      await utils.deleteUsers([docs.user]);
    });

    it('all contact types are aggregated and returned', async () => {
      const places = [
        placeFactory.place().build({ type: 'contact', contact_type: 'person' }),
        placeFactory.place().build({ type: 'contact', contact_type: 'p10_province' }),
        placeFactory.place().build({ type: 'contact', contact_type: 'p20_district' })
      ];
      await utils.saveDocs(places);

      const result = await utils.request({ path: '/api/v1/impact' });
      chai.expect(result).to.deep.equal({
        users: { count: 0 },
        contacts:
        {
          count: 4,
          by_type: [
            { type: 'p10_province', count: 1 },
            { type: 'p20_district', count: 1 },
            { type: 'person', count: 2 }
          ]
        },
        reports: {
          count: 0,
          by_form: []
        }
      });
    });

    it('all reports are aggregated and returned', async () => {
      const reports = [
        ...createReports(1, 'L'),
        ...createReports(2, 'pregnancy')
      ];

      await utils.saveDocs(reports);
      const result = await utils.request({ path: '/api/v1/impact' });
      chai.expect(result).to.deep.equal({
        users: { count: 0 },
        contacts: {
          count: 1,
          by_type: [
            { type: 'person', count: 1 }
          ]
        },
        reports: {
          count: reports.length,
          by_form: [
            { form: 'L', count: 1 },
            { form: 'pregnancy', count: 2 }
          ]
        }
      });
    });

    it('unicode reports are also returned correctly', async () => {
      const reports = [
        ...createReports(3, 'ल'),
        ...createReports(2, 'pregnancy')
      ];
      await utils.saveDocs(reports);

      const result = await utils.request({ path: '/api/v1/impact' });
      chai.expect(result).to.deep.equalInAnyOrder({
        users: {
          count: 0
        },
        contacts: {
          count: 1,
          by_type: [
            { type: 'person', count: 1 }
          ]
        },
        reports: {
          count: reports.length,
          by_form: [
            { form: 'ल', count: 3 },
            { form: 'pregnancy', count: 2 }
          ]
        }
      });
    });
  });
});
