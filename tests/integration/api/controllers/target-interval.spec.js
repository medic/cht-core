const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const { expect } = require('chai');

const place = utils.deepFreeze(placeFactory.place().build({ type: 'district_hospital' }));
const offlineUser = utils.deepFreeze(userFactory.build({
  username: 'offline-has-perms',
  place: place._id,
  contact: {
    _id: 'fixture:user:offline-has-perms',
    name: 'Offline User',
  },
  roles: ['chw']
}));
const targetIntervals = utils.deepFreeze([
  {
    _id: 'target~2025-09~c3f6b91e-b095-48ef-a524-705e29fd9f6d~org.couchdb.user:chw',
    type: 'target',
    user: 'org.couchdb.user:chw',
    owner: 'c3f6b91e-b095-48ef-a524-705e29fd9f6d',
    reporting_period: '2025-09',
    targets: [
      {
        id: 'deaths-this-month',
        value: {
          pass: 2,
          total: 2
        }
      },
      {
        id: 'births-this-month',
        value: {
          pass: 5,
          total: 10
        }
      },
      {
        id: 'facility-deliveries',
        value: {
          pass: 1,
          total: 10,
          percent: 10
        }
      },
    ],
    updated_date: 1758690000000
  },
  {
    _id: 'target~2025-09~7de6849e-e6e5-4a8d-9b6d-71c9eaa23415~org.couchdb.user:chw',
    type: 'target',
    user: 'org.couchdb.user:chw',
    owner: '7de6849e-e6e5-4a8d-9b6d-71c9eaa23415',
    reporting_period: '2025-09',
    targets: [
      {
        id: 'deaths-this-month',
        value: {
          pass: 2,
          total: 2
        }
      },
      {
        id: 'births-this-month',
        value: {
          pass: 5,
          total: 13
        }
      },
      {
        id: 'facility-deliveries',
        value: {
          pass: 1,
          total: 12,
          percent: 10
        }
      },
    ],
    updated_date: 1758690000000
  },
]);

describe('Target Interval API', () => {
  
  before(async () => {
    await utils.saveDocs([...targetIntervals, place]);
    await utils.createUsers([offlineUser]);
  });
  
  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([offlineUser]);
  });
  
  describe('GET /api/v1/target-interval/:uuid', async () => {
    const endpoint = '/api/v1/target-interval';
    const targetInterval = targetIntervals[0];
    
    it('returns the target interval matching the provided UUID', async () => {
      const opts = {
        path: `${endpoint}/${targetInterval._id}`,
      };
      const result = await utils.request(opts);
      expect(result).excluding([ '_rev' ]).to.deep.equal(targetInterval);
    });

    it('throws 404 error when no target interval is found for the UUID', async () => {
      const opts = {
        path: `${endpoint}/invalid-uuid`,
      };
      await expect(utils.request(opts)).to.be.rejectedWith('404 - {"code":404,"error":"Target interval not found"}');
    });

    it(`throws error when user is not an online user`, async () => {
      const opts = {
        path: `${endpoint}/${targetInterval._id}`,
        auth: {username: offlineUser.username, password: offlineUser.password},
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });
  });

  describe('GET /api/v1/target-interval', async () => {
    const endpoint = '/api/v1/target-interval';
    
    it('returns a page of target intervals for no limit and cursor passed', async () => {
      const opts = {
        path: `${endpoint}`,
        qs: {
          contact_uuids: '7de6849e-e6e5-4a8d-9b6d-71c9eaa23415,c3f6b91e-b095-48ef-a524-705e29fd9f6d',
          reporting_period: '2025-07'
        }
      };
      const responsePage = await utils.request(opts);
      const responseTargetIntervals = responsePage.data;
      const responseCursor = responsePage.cursor;

      expect(responseTargetIntervals).excludingEvery(['_rev']).to.deep.equalInAnyOrder(targetIntervals);
      expect(responseCursor).to.be.equal(null);
    });

    it('returns a page of people when limit and cursor is passed and cursor can be reused', async () => {
      const firstPage = await utils.request({ 
        path: endpoint, 
        qs: { 
          contact_uuids: '7de6849e-e6e5-4a8d-9b6d-71c9eaa23415,c3f6b91e-b095-48ef-a524-705e29fd9f6d',
          reporting_period: '2025-07',
          limit 
        } 
      });
      const secondPage = await utils.request({
        path: endpoint,
        qs: {
          contact_uuids: '7de6849e-e6e5-4a8d-9b6d-71c9eaa23415,c3f6b91e-b095-48ef-a524-705e29fd9f6d',
          reporting_period: '2025-07',
          cursor: firstPage.cursor, 
          limit 
        }
      });

      const allTargetIntervals = [...firstPage.data, ...secondPage.data];

      expect(allTargetIntervals).excludingEvery(['_rev']).to.deep.equalInAnyOrder(expectedPeople);
      expect(firstPage.data.length).to.be.equal(4);
      expect(secondPage.data.length).to.be.equal(3);
      expect(firstPage.cursor).to.be.equal('4');
      expect(secondPage.cursor).to.be.equal(null);
    });

    it(`throws error when user does not have can_view_contacts permission`, async () => {
      const opts = {
        path: `/api/v1/target-interval`,
        auth: { username: userNoPerms.username, password: userNoPerms.password },
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it(`throws error when user is not an online user`, async () => {
      const opts = {
        path: `/api/v1/target-interval`,
        auth: { username: offlineUser.username, password: offlineUser.password },
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    t('throws 400 error when reporting period is invalid', async () => {
      const queryParams = {
        contact_uuids: null,
        reporting_period: '2025-07',
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `/api/v1/target-interval?${queryString}`,
      };
      await expect(utils.request(opts))
        .to.be.rejectedWith(`400 - {"code":400,"error":"Invalid contact type [${invalidContactType}]."}`);
    });

    it('throws 400 error when reporting period is invalid', async () => {
      const queryParams = {
        contact_uuids: '7de6849e-e6e5-4a8d-9b6d-71c9eaa23415,c3f6b91e-b095-48ef-a524-705e29fd9f6d',
        reporting_period: 'INVALID_PERIOD',
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `/api/v1/target-interval?${queryString}`,
      };
      await expect(utils.request(opts))
        .to.be.rejectedWith(`400 - {"code":400,"error":"Invalid contact type [${invalidContactType}]."}`);
    });

    it('throws 400 error when limit is invalid', async () => {
      const queryParams = {
        contact_uuids: '7de6849e-e6e5-4a8d-9b6d-71c9eaa23415,c3f6b91e-b095-48ef-a524-705e29fd9f6d',
        reporting_period: '2025-07',
        limit: -1
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `/api/v1/target-interval?${queryString}`,
      };

      await expect(utils.request(opts)).to.be.rejectedWith(
        `400 - {"code":400,"error":"The limit must be a positive integer: [\\"-1\\"]."}`
      );
    });

    it('throws 400 error when cursor is invalid', async () => {
      const queryParams = {
        contact_uuids: '7de6849e-e6e5-4a8d-9b6d-71c9eaa23415,c3f6b91e-b095-48ef-a524-705e29fd9f6d',
        reporting_period: '2025-07',
        cursor: '-1'
      };
      const queryString = new URLSearchParams(queryParams).toString();
      const opts = {
        path: `/api/v1/target-interval?${queryString}`,
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(
          `400 - {"code":400,"error":"The cursor must be a string or null for first page: [\\"-1\\"]."}`
        );
    });
  });
});
