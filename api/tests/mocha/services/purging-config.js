// const chai = require('chai');
// const sinon = require('sinon');
// const _ = require('lodash');
//
// const db = require('../../../src/db');
// const environment = require('../../../src/environment');
// const purgingUtils = require('@medic/purging-utils');
const service = require('../../../src/services/purging-config');

describe('Purging Config service', () => {
  /*beforeEach(() => {

  });

  afterEach(() => {
    sinon.restore();
  });*/

  describe('dryRun', () => {
    it('should return the count of purgeable documents and when the next run would happen', async () => {
      const purgeFn = (userCtx, contact, reports) => {
        // purge documents older than 7 days old
        const daysToPurge = 7;
        const oldReportedDate = Date.now() - (1000 * 60 * 60 * 24 * daysToPurge);

        return reports
          .filter(r => r.reported_date <= oldReportedDate)
          .map(report => report._id);
      };
      const appSettingsPurge = {
        run_every_days: 7,
        cron: '0 22 * * SAT',
        fn: purgeFn.toString(),
      };

      const { wontChangeCount, willPurgeCount, willUnpurgeCount, nextRun } = await service.dryRun(appSettingsPurge);
      chai.expect(wontChangeCount).to.equal(0);
      chai.expect(willPurgeCount).to.equal(0);
      chai.expect(willUnpurgeCount).to.equal(0);
      chai.expect(nextRun).to.equal(new Date().toISOString());
    });
  });
});
