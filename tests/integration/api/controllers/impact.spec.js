const chai = require('chai');
const utils = require('@utils');

describe('impact', () => {
  afterEach(() => utils.revertDb([], true));

  describe('v1', () => {
    it('return impact data on expected format', async () => {
      const result = await utils.request({ path: '/api/v1/impact' });
      chai.expect(result).to.deep.equal({
        contactsByType: {
          person: 1
        },
        totalReports: 0,
        totalUsers: 1,
        reportsByForm: {}
      });
    });

    it('when extra contact is added, person count is increased', async () => {
      const doc = { type: 'contact', contact_type: 'person', _id: 'p1' };
      await utils.saveDoc(doc);

      const result = await utils.request({ path: '/api/v1/impact' });
      chai.expect(result).to.deep.equal({
        totalReports: 0,
        totalUsers: 1,
        contactsByType: {
          person: 2
        },        
        reportsByForm: {}
      });
    });

    it('all contact types are aggregated and returned', async () => {
      const docs = [
        { type: 'contact', contact_type: 'person', _id: 'p1' },
        { type: 'contact', contact_type: 'p10_province', _id: 'gandaki' },
        { type: 'contact', contact_type: 'p20_district', _id: 'kaski' },
      ];
      await utils.saveDocs(docs);

      const result = await utils.request({ path: '/api/v1/impact' });
      chai.expect(result).to.deep.equal({
        totalReports: 0,
        totalUsers: 1,
        contactsByType: {
          p10_province: 1,
          p20_district: 1,
          person: 2
        },
        reportsByForm: {}
      });
    });


    it('all reports are aggregated and returned', async () => {
      const docs = [
        { type: 'data_record', form: 'L', _id: 'r1' },
        { type: 'data_record', form: 'pregnancy', _id: 'r2' },
        { type: 'data_record', form: 'pregnancy', _id: 'r3' },
      ];
      await utils.saveDocs(docs);

      const result = await utils.request({ path: '/api/v1/impact' });
      chai.expect(result).to.deep.equal({
        totalReports: docs.length,
        totalUsers: 1,
        contactsByType: {
          person: 1
        },
        reportsByForm: {
          L: 1,
          pregnancy: 2
        }
      });
    });

    it('unicode reports are also returned correctly', async () => {
      const docs = [
        { type: 'data_record', form: 'ल', _id: 'r1' },
        { type: 'data_record', form: 'ल', _id: 'r2' },
        { type: 'data_record', form: 'pregnancy', _id: 'r3' },
        { type: 'data_record', form: 'न', _id: 'r4' },
      ];
      await utils.saveDocs(docs);

      const result = await utils.request({ path: '/api/v1/impact' });
      chai.expect(result).to.deep.equal({
        totalReports: docs.length,
        totalUsers: 1,
        contactsByType: {
          person: 1
        },
        reportsByForm: {
          pregnancy: 1,
          ल: 2,
          न: 1
        }
      });
    });
  });
});
