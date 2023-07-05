const commonPage = require('@page-objects/default/common/common.wdio.page');
const utils = require('@utils');
const moment = require('moment');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const { faker: Faker } = require('@faker-js/faker');
const userFactory = require('@factories/cht/users/users');

const setupUser = () => {
  const places = placeFactory.generateHierarchy();
  const districtHospital = places.get('district_hospital');
  const contact = personFactory.build({
    name: Faker.name.firstName(),
    parent: { _id: districtHospital._id },
  });
  const user = userFactory.build({
    username: Faker.internet.userName().toLowerCase().replace(/[^0-9a-zA-Z_]/g, ''),
    password: 'Secret_1',
    place: districtHospital._id,
    contact: contact._id,
    known: true,
  });

  return {
    docs: [
      ...places.values(),
      contact,
    ],
    user,
  };
};

const setOldTelemetryDate = async (user) => {
  const yesterday = moment().subtract(1, 'day').valueOf();
  const telemetryDateStorageKey = `medic-${user.username}-telemetry-date`;
  await browser.execute((telemetryDateStorageKey, yesterday) => {
    // eslint-disable-next-line no-undef
    window.localStorage.setItem(telemetryDateStorageKey, yesterday);
  }, telemetryDateStorageKey, yesterday);
};

describe('Telemetry', () => {
  let user;
  let docs;

  before(async () => {
    ({ docs, user } = setupUser());
    await utils.saveDocs(docs);
    await utils.createUsers([user]);
    await loginPage.login(user);
  });

  it('should record telemetry', async () => {
    await commonPage.goToReports();
    await commonPage.goToPeople();
    await setOldTelemetryDate(user);

    // generate telemetry aggregate
    await commonPage.goToReports();
    await commonPage.sync();

    const clientDdoc = await utils.getDoc('_design/medic-client');

    const options = { auth: { username: user.username, password: user.password }, userName: user.username };
    const metaDocs = await utils.requestOnTestMetaDb({ ...options, path: '/_all_docs?include_docs=true' });

    const telemetryEntry = metaDocs.rows.find(row => row.id.startsWith('telemetry'));
    expect(telemetryEntry.doc).to.deep.nested.include({
      'metadata.year': moment().year(),
      'metadata.month': moment().month() + 1,
      'metadata.day': moment().day() + 1,
      'metadata.user': user.username,
      'metadata.versions.app': clientDdoc.build_info.version,
    });
    expect(clientDdoc.build_info.version).to.include(clientDdoc.build_info.base_version);
  });
});
