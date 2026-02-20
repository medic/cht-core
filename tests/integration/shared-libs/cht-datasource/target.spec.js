const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const userFactory = require('@factories/cht/users/users');
const { expect } = require('chai');
const { setAuth, removeAuth } = require('./auth');
const { getRemoteDataContext, Target, Qualifier } = require('@medic/cht-datasource');

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

const createTarget = ({
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

const targets = utils.deepFreeze([
  {
    ...createTarget({
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
    ...createTarget({
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
  createTarget({
    owner: 'c3f6b91e-b095-48ef-a524-705e29fd9f6d',
    reporting_period: '2025-09',
    user: 'org.couchdb.user:supervisor'
  })
]);

const targetDifferentReportingPeriod = utils.deepFreeze(createTarget({
  owner: targets[0].owner,
  reporting_period: '2025-10',
}));


describe('cht-datasource Target', () => {
  const dataContext = getRemoteDataContext(utils.getOrigin());

  before(async () => {
    setAuth();
    await utils.saveDocs([
      ...targets,
      place,
      targetDifferentReportingPeriod,
    ]);
    await utils.createUsers([offlineUser]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([offlineUser]);
    removeAuth();
  });

  describe('v1',  () => {
    describe('get', async () => {
      const getTarget = Target.v1.get(dataContext);

      it('returns the target matching the provided id', async () => {
        const result = await getTarget(Qualifier.byId(targets[0]._id));
        expect(result)
          .excluding(['_rev'])
          .to
          .deep
          .equal(targets[0]);
      });

      it('returns null when no target is found for the id', async () => {
        const result = await getTarget(Qualifier.byId('invalid-target'));
        expect(result).to.be.null;
      });
    });

    describe('getPage', async () => {
      const getPage = Target.v1.getPage(dataContext);

      it('returns a page of targets for multiple contact ids', async () => {
        const { data, cursor } = await getPage(Qualifier.and(
          Qualifier.byReportingPeriod('2025-09'),
          Qualifier.byContactIds([
            targets[0].owner,
            targets[1].owner,
            targets[2].owner,
          ])
        ));

        expect(data).excludingEvery(['_rev']).to.deep.equal(targets);
        expect(cursor).to.be.equal(null);
      });

      it('returns a page of targets for single contact id', async () => {
        const { data, cursor } = await getPage(Qualifier.and(
          Qualifier.byReportingPeriod('2025-09'),
          Qualifier.byContactId(targets[0].owner)
        ));

        expect(data).excludingEvery(['_rev']).to.deep.equal([targets[0]]);
        expect(cursor).to.be.equal(null);
      });

      it('returns a page of targets when limit and cursor is passed', async () => {
        const { data, cursor } = await getPage(
          Qualifier.and(
            Qualifier.byReportingPeriod('2025-09'),
            Qualifier.byContactIds([
              targets[0].owner,
              targets[1].owner,
              targets[2].owner,
            ])
          ),
          '1',
          1
        );

        expect(data).excludingEvery(['_rev']).to.deep.equal([targets[1]]);
        expect(cursor).to.be.equal('2');
      });

      it('throws error when limit is invalid', async () => {
        const qualifier = Qualifier.and(
          Qualifier.byReportingPeriod('2025-09'),
          Qualifier.byContactIds([targets[0].owner])
        );
        await expect(getPage(qualifier, null, -1)).to.be.rejectedWith(
          `The limit must be a positive integer: [-1].`
        );
      });

      it('throws error when cursor is invalid', async () => {
        const qualifier = Qualifier.and(
          Qualifier.byReportingPeriod('2025-09'),
          Qualifier.byContactIds([targets[0].owner])
        );
        await expect(getPage(qualifier, -1)).to.be.rejectedWith(
          `The cursor must be a string or null for first page: [-1].`
        );
      });
    });
  });
});
