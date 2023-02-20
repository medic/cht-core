const utils = require('../../../utils');
const sentinelUtils = require('../../../utils/sentinel');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const deliveryFactory = require('../../../factories/cht/reports/delivery');
const pregnancyFactory = require('../../../factories/cht/reports/pregnancy');
const pregnancyVisitFactory = require('../../../factories/cht/reports/pregnancy-visit');
const contactPage = require('../../../page-objects/default/contacts/contacts.wdio.page');
const reportsPage = require('../../../page-objects/default/reports/reports.wdio.page');

/* global window */

const places = placeFactory.generateHierarchy();
const healthCenter = places.get('health_center');
const offlineUser = userFactory.build({ place: healthCenter._id, roles: ['chw'] });

const clinics = Array
  .from({ length: 100 })
  .map((_, idx) => placeFactory.place().build({
    type: 'clinic',
    parent: { _id: healthCenter._id, parent: healthCenter.parent },
    name: `clinic_${idx}`
  }));
const persons = [
  ...clinics.map(clinic => Array
    .from({ length: 10 })
    .map((_, idx) => personFactory.build({
      parent: { _id: clinic._id, parent: clinic.parent },
      name: `person_${clinic.name}_${idx}`,
    }))),
].flat();

const getReportContext = (patient) => ({
  fields: { patient_id: patient._id, patient_uuid: patient._id },
  contact: {
    _id: offlineUser.contact._id,
    parent: { _id: healthCenter._id, parent: healthCenter.parent },
  }
});

const reports = [
  ...persons.map(person => [
    deliveryFactory.build(getReportContext(person)),
    pregnancyFactory.build(getReportContext(person)),
    pregnancyVisitFactory.build(getReportContext(person)),
  ]),
].flat();

const getServerDocs = async (docIds) => {
  const result = await utils.requestOnMedicDb({ path: '/_all_docs', qs: { keys: JSON.stringify(docIds) } });
  return result.rows;
};

const getLocalDocIds = async () => {
  const { err, result } = await browser.executeAsync((callback) => {
    const db = window.CHTCore.DB.get();
    return db
      .allDocs()
      .then(result => callback({ result }))
      .catch(err => callback({ err }));
  });

  if (err) {
    throw err;
  }

  return result.rows;
};

const getLocalDocs = async (docIds) => {
  const { err, result } = await browser.executeAsync((docIds, callback) => {
    const db = window.CHTCore.DB.get();
    return db
      .allDocs({
        keys: docIds,
        include_docs: true,
        attachments: true,
      })
      .then(result => callback({ result }))
      .catch(err => callback({ err }));
  }, docIds);

  if (err) {
    throw err;
  }

  return result.rows;
};

const requiredDocs = [
  '_design/medic_client',
  'settings',
  `org.couchdb.user:${offlineUser.name}`,
  'service-worker-meta',
  'settings',
  'resources',
  'branding',
  'partners',
];

const isTombstone = (id) => id.endsWith('tombstone');

const getTranslationIds = async () => {
  const translationDocs = await utils.db.allDocs({
    start_key: 'messages-',
    end_key: 'messages-\ufff0',
  });
  const docIds = translationDocs
    .rows.map(row => row.id)
    .filter(id => !isTombstone(id));
  return docIds;
};

const getFormIds = async () => {
  const formDocs = await utils.db.allDocs({
    start_key: 'form:',
    end_key: 'form:\ufff0',
  });
  const docIds = formDocs
    .rows.map(row => row.id)
    .filter(id => !isTombstone(id));
  return docIds;
};

describe('initial-replication', () => {
  before(async () => {
    // we're creating ~4000 docs
    await utils.stopSentinel();

    await utils.saveDocs([...places.values()]);
    await utils.createUsers([offlineUser]);

    await utils.saveDocs(clinics);
    await utils.saveDocs(persons);
    await utils.saveDocs(reports);
  });

  after(async () => {
    await utils.startSentinel();
  });

  it('should log user in', async () => {
    await loginPage.login(offlineUser);

    await commonPage.sync(false, 3000);

    const localAllDocs = await getLocalDocIds();
    const docIds = localAllDocs.map(row => row.id);
    const serverAllDocs = await getServerDocs(docIds);

    // docs revs are the same
    expect(localAllDocs).to.deep.equal(serverAllDocs);

    // docs have downloaded necessary attachments
    const localDocIds = localAllDocs.map(row => row.id);

    const translationIds = await getTranslationIds();
    const formIds = await getFormIds();
    expect(localDocIds).to.include.members([...requiredDocs, ...translationIds, ...formIds]);

    const localForms = await getLocalDocs(formIds);
    console.log(JSON.stringify(localForms, null, 2));
  });
});
