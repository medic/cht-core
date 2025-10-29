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
const targetInterval = utils.deepFreeze({
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
});

describe('Target Interval API', () => {
  before(async () => {
    await utils.saveDocs([targetInterval, place]);
    await utils.createUsers([offlineUser]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([offlineUser]);
  });

  describe('GET /api/v1/target-interval/:uuid', async () => {
    const endpoint = '/api/v1/target-interval';

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
});
