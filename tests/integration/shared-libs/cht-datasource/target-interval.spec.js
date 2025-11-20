const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const { expect } = require('chai');
const { setAuth, removeAuth } = require('./auth');
const { getRemoteDataContext, TargetInterval, Qualifier } = require('@medic/cht-datasource');

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

describe('cht-datasource Target Interval', () => {
  const dataContext = getRemoteDataContext(utils.getOrigin());

  before(async () => {
    setAuth();
    await utils.saveDocs([targetInterval, place]);
    await utils.createUsers([offlineUser]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([offlineUser]);
    removeAuth();
  });

  describe('v1',  () => {
    describe('get', async () => {
      const getTargetInterval = TargetInterval.v1.get(dataContext);

      it('returns the target interval matching the provided UUID', async () => {
        const result = await getTargetInterval(Qualifier.byUuid(targetInterval._id));
        expect(result)
          .excluding(['_rev'])
          .to
          .deep
          .equal(targetInterval);
      });

      it('returns null when no target interval is found for the UUID', async () => {
        const result = await getTargetInterval(Qualifier.byUuid('invalid-target'));
        expect(result).to.be.null;
      });
    });
  });
});
