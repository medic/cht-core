const chai = require('chai');
const utils = require('@utils');
const reportFactory = require('@factories/cht/reports/generic-report');
const placeFactory = require('@factories/cht/contacts/place');

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
          person: 1
        },        
        users: 1,
        reports: {
          report: {},
          total: 0
        }
      });
    });

    it('all contact types are aggregated and returned', async () => {
      const places = [
        utils.deepFreeze(placeFactory.place().build({ contact_type: 'person' })),
        utils.deepFreeze(placeFactory.place().build({ contact_type: 'p10_province' })),
        utils.deepFreeze(placeFactory.place().build({ contact_type: 'p20_district' }))
      ];
      await utils.saveDocs(places);

      const result = await utils.request({ path: '/api/v1/impact' });
      chai.expect(result).to.deep.equal({
        users: 1,
        contacts: {
          p10_province: 1,
          p20_district: 1,
          person: 2
        },
        reports: {
          report: {},
          total: 0
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
        users: 1,
        contacts: {
          person: 1
        },
        reports: {
          report: {
            L: 1,
            pregnancy: 2
          },
          total: reports.length
        }
      });
    });

    it('unicode reports are also returned correctly', async () => {
      const reports = [
        ...createReports(2, 'ल'),
        ...createReports(1, 'pregnancy'),
        ...createReports(1, 'न')
      ];
      await utils.saveDocs(reports);

      const result = await utils.request({ path: '/api/v1/impact' });
      chai.expect(result).to.deep.equal({
        users: 1,
        contacts: {
          person: 1
        },
        reports: {
          report: {
            pregnancy: 1,
            ल: 2,
            न: 1
          },
          total: reports.length
        }
      });
    });
  });
});
