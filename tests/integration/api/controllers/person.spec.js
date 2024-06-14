const utils = require('@utils');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const { getRemoteDataContext, Person, Qualifier } = require('@medic/cht-datasource');
const { expect } = require('chai');
const userFactory = require('@factories/cht/users/users');

describe('Person API', () => {
  const places = utils.deepFreeze(placeFactory.generateHierarchy());
  const patient = utils.deepFreeze(personFactory.build({
    parent: {
      _id: places.get('clinic')._id,
      parent: {
        _id: places.get('health_center')._id,
        parent: {
          _id: places.get('district_hospital')._id
        }
      },
    },
    phone: '1234567890',
    reported_date: '2024-05-24T18:40:34.694Z',
    role: 'patient',
    short_name: 'Mary'
  }));
  const userNoPerms = utils.deepFreeze(userFactory.build({
    place: places.get('clinic')._id,
    roles: ['no_perms']
  }));
  const dataContext = getRemoteDataContext(utils.getOrigin());

  before(async () => {
    await utils.saveDocs([...places.values(), patient]);
    await utils.createUsers([userNoPerms]);
  });

  after(async () => {
    await utils.revertDb([], true);
    await utils.deleteUsers([userNoPerms]);
  });

  describe('GET /api/v1/person/:uuid', async () => {
    const getPerson = Person.v1.get(dataContext);

    it('returns the person matching the provided UUID', async () => {
      const person = await getPerson(Qualifier.byUuid(patient._id));
      expect(person).excluding('_rev').to.deep.equal(patient);
    });

    it('returns null when no user is found for the UUID', async () => {
      const person = await getPerson(Qualifier.byUuid('invalid-uuid'));
      expect(person).to.be.null;
    });

    it('throws error when user does not have can_view_contacts permission', async () => {
      const opts = {
        path: `/api/v1/person/${patient._id}`,
        auth: { username: userNoPerms.username, password: userNoPerms.password },
      };
      await expect(utils.request(opts)).to.be.rejectedWith('403 - {"code":403,"error":"Insufficient privileges"}');
    });
  });
});
