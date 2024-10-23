const commonPage = require('@page-objects/default/common/common.wdio.page');
const utils = require('@utils');
const moment = require('moment');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const { faker: Faker } = require('@faker-js/faker');
const userFactory = require('@factories/cht/users/users');
const searchPage = require('@page-objects/default/search/search.wdio.page');
const contactPage = require('@page-objects/default/contacts/contacts.wdio.page');
const { BRANCH, TAG } = process.env;

describe('Telemetry', () => {
  const DATE_FORMAT = 'YYYY-MM-DD';
  const TELEMETRY_PREFIX = 'telemetry';

  const places = placeFactory.generateHierarchy();
  const clinic = places.get('clinic');
  const patient = personFactory.build({
    phone: '+12068881234',
    parent: { _id: clinic._id, parent: clinic.parent },
  });

  const healthCenter = places.get('health_center');
  const contact = personFactory.build({
    name: Faker.person.firstName(),
    parent: { _id: healthCenter._id },
  });
  const user = userFactory.build({
    username: Faker.internet.userName().toLowerCase().replace(/[^0-9a-zA-Z_]/g, ''),
    password: 'Secret_1',
    place: healthCenter._id,
    contact: contact._id,
    known: true,
  });

  before(async () => {
    await utils.saveDocs([...places.values(), contact, patient]);
    await utils.createUsers([user]);
    await loginPage.login(user);
    await commonPage.waitForPageLoaded();
  });

  it('should record telemetry', async () => {
    const yesterday = moment().subtract(1, 'day');
    const yesterdayDBName = `${TELEMETRY_PREFIX}-${yesterday.format(DATE_FORMAT)}-${user.username}`;
    const telemetryRecord = {
      key: 'a-telemetry-record',
      value: 3,
      date_recorded: yesterday.toDate(),
    };
    await browser.execute(async (dbName, record) => {
      // eslint-disable-next-line no-undef
      await window.PouchDB(dbName).post(record);
    }, yesterdayDBName, telemetryRecord);

    // Some user activities to generate telemetry records
    await commonPage.goToReports();
    await commonPage.goToPeople();
    await commonPage.goToReports();
    await commonPage.sync();

    const clientDdoc = await utils.getDoc('_design/medic-client');

    const options = { auth: { username: user.username, password: user.password }, userName: user.username };
    const metaDocs = await utils.requestOnTestMetaDb({ ...options, path: '/_all_docs?include_docs=true' });

    const telemetryEntry = metaDocs.rows.find(row => row.id.startsWith(TELEMETRY_PREFIX));
    expect(telemetryEntry.doc).to.deep.nested.include({
      'metadata.year': yesterday.year(),
      'metadata.month': yesterday.month() + 1,
      'metadata.day': yesterday.date(),
      'metadata.user': user.username,
      'metadata.versions.app': clientDdoc.build_info.version,
    });

    const version = TAG || utils.escapeBranchName(BRANCH) || clientDdoc.build_info.base_version;
    expect(clientDdoc.build_info.version).to.include(version);
  });

  describe('search matches telemetry', () => {
    const getTelemetryEntryByKey = async (key) => {
      const todayDBName = `${TELEMETRY_PREFIX}-${moment().format(DATE_FORMAT)}-${user.username}`;
      const todayTelemetryDocs = await browser.execute(async (dbName) => {
        // eslint-disable-next-line no-undef
        const docs = await window.PouchDB(dbName).allDocs({ include_docs: true });
        return docs.rows.filter(row => row.doc.key.startsWith('search_match'));
      }, todayDBName);
      return todayTelemetryDocs.filter(row => row.doc.key === key);
    };

    it('should record telemetry for contact searches', async () => {
      await commonPage.goToPeople();

      const [firstName, lastName] = patient.name.split(' ');
      const phone = patient.phone;
      const patient_id = patient.patient_id;
      const searchTerms = [firstName, lastName, phone, patient_id, `patient_id:${patient_id}`];

      for (const searchTerm of searchTerms) {
        await searchPage.performSearch(searchTerm);
        await contactPage.selectLHSRowByText(patient.name, false);
        await searchPage.clearSearch();
      }

      expect(await getTelemetryEntryByKey('search_match:contacts_by_freetext:name')).to.have.lengthOf(2);
      expect(await getTelemetryEntryByKey('search_match:contacts_by_freetext:phone')).to.have.lengthOf(1);
      expect(await getTelemetryEntryByKey('search_match:contacts_by_freetext:patient_id')).to.have.lengthOf(1);
      expect(await getTelemetryEntryByKey('search_match:contacts_by_freetext:patient_id:$value')).to.have.lengthOf(1);
    });
  });
});
