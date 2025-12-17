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

const createTargetInterval = ({
  owner,
  reporting_period,
  user = 'org.couchdb.user:chw',
  updated_date = 1758690000000
}) => {
  return {
    _id: `target~${reporting_period}~${owner}~${user}`,
    type: 'target',
    user,
    owner,
    reporting_period,
    targets: [],
    updated_date
  };
};

const targetIntervals = utils.deepFreeze([
  {
    ...createTargetInterval({
      owner: '7de6849e-e6e5-4a8d-9b6d-71c9eaa23415',
      reporting_period: '2025-09',
    }),
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
  },
  {
    ...createTargetInterval({
      owner: '9998989-e6e5-4a8d-9b6d-71c9eaa23999',
      reporting_period: '2025-09',
    }),
    targets: [
      {
        id: 'deaths-this-month',
        value: {
          pass: 0,
          total: 2
        }
      },
    ],
  },
  createTargetInterval({
    owner: 'c3f6b91e-b095-48ef-a524-705e29fd9f6d',
    reporting_period: '2025-09',
    user: 'org.couchdb.user:supervisor'
  })
]);

const targetIntervalDifferentReportingPeriod = utils.deepFreeze(createTargetInterval({
  owner: targetIntervals[0].owner,
  reporting_period: '2025-10',
}));

describe('Target Interval API', () => {
  
  before(async () => {
    await utils.saveDocs([
      ...targetIntervals,
      place,
      targetIntervalDifferentReportingPeriod,
    ]);
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
    
    it('returns a page of target intervals for multiple contact UUIDs', async () => {
      const { data, cursor } = await utils.request({
        path: `${endpoint}`,
        qs: {
          contact_uuids: [
            targetIntervals[0].owner,
            targetIntervals[1].owner,
            targetIntervals[2].owner,
          ].join(','),
          reporting_period: '2025-09'
        }
      });

      expect(data).excludingEvery(['_rev']).to.deep.equal(targetIntervals);
      expect(cursor).to.be.equal(null);
    });

    it('returns a page of target intervals for single contact UUID', async () => {
      const { data, cursor } = await utils.request({
        path: `${endpoint}`,
        qs: {
          contact_uuid: targetIntervals[0].owner,
          reporting_period: '2025-09'
        }
      });

      expect(data).excludingEvery(['_rev']).to.deep.equal([targetIntervals[0]]);
      expect(cursor).to.be.equal(null);
    });

    it('returns a page of target intervals when limit and cursor is passed', async () => {
      const { data, cursor } = await utils.request({
        path: endpoint, 
        qs: { 
          contact_uuids: [
            targetIntervals[0].owner,
            targetIntervals[1].owner,
            targetIntervals[2].owner,
          ].join(','),
          reporting_period: '2025-09',
          cursor: '1',
          limit: 1
        } 
      });

      expect(data).excludingEvery(['_rev']).to.deep.equal([targetIntervals[1]]);
      expect(cursor).to.be.equal('2');
    });

    it(`throws error when user is not an online user`, async () => {
      const opts = {
        path: `/api/v1/target-interval`,
        qs: {
          contact_uuids: targetIntervals[0].owner,
          reporting_period: '2025-09'
        },
        auth: { username: offlineUser.username, password: offlineUser.password },
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });

    it('throws 400 error when limit is invalid', async () => {
      const opts = {
        path: `/api/v1/target-interval`,
        qs: {
          contact_uuids: targetIntervals[0].owner,
          reporting_period: '2025-07',
          limit: -1
        },
      };

      await expect(utils.request(opts)).to.be.rejectedWith(
        `400 - {"code":400,"error":"The limit must be a positive integer: [\\"-1\\"]."}`
      );
    });

    it('throws 400 error when cursor is invalid', async () => {
      const opts = {
        path: `/api/v1/target-interval`,
        qs: {
          contact_uuids: targetIntervals[0].owner,
          reporting_period: '2025-07',
          cursor: '-1'
        },
      };

      await expect(utils.request(opts))
        .to.be.rejectedWith(
          `400 - {"code":400,"error":"The cursor must be a string or null for first page: [\\"-1\\"]."}`
        );
    });
  });
});
