const Faker = require('@faker-js/faker').faker;
const _ = require('lodash');

const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');

const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const userFactory = require('../../../factories/cht/users/users');
const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');

const setupUser = () => {
  const places = placeFactory.generateHierarchy();
  const districtHospital = places.get('district_hospital');
  const contact = personFactory.build({
    role: 'chw',
    parent: { _id: districtHospital._id },
  });
  const user = userFactory.build({
    username: Faker.internet.userName(),
    password: 'Secret_1',
    place: districtHospital._id,
    contact: contact._id,
    known: true,
  });
  const healthCenters = Array
    .from({ length: 10 })
    .map(() => placeFactory.place({
      type: 'health_center',
      parent: { _id: districtHospital._id },
      name: Faker.name.firstName(),
    }));

  return {
    docs: [
      ...places.values(),
      ...healthCenters,
      contact,
    ],
    user,
  };
};

const getLocalDocsIds = async () => {
  const result = await utils.requestOnTestDb('/_local_docs');
  const ids = result.rows.map(row => row.id);
  return ids;
};

const getLocalDocs = async (ids) => {

}

describe('Storing checkpointer on target migration', () => {
  let user;
  let docs;

  beforeEach(async () => {
    ({ docs, user } = setupUser());
    await utils.saveDocs(docs);
    await utils.createUser(user);
    await sentinelUtils.waitForSentinel();
  });

  afterEach(async () => {
    await browser.reloadSession();
    await browser.url('/');

    await utils.deleteUsers([user]);
    await utils.revertDb([], true);
  });

  it('should store replication checkpointers on target', async () => {
    const localDocIdsSnapshot = await getLocalDocsIds();

    await loginPage.login(user);
    await commonPage.sync();

    const localDocIds = await getLocalDocsIds();
    const checkpointerDocIds = _.difference(localDocIds, localDocIdsSnapshot);
    expect(checkpointerDocIds.length).to.equal(2);

    const checkpointerDocs = [

    ]
  });
});

