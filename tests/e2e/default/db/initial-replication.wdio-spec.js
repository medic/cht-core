const _ = require('lodash');

const utils = require('../../../utils');
const browserUtils = require('../../../utils/browser');
const sentinelUtils = require('../../../utils/sentinel');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const userFactory = require('../../../factories/cht/users/users');
const placeFactory = require('../../../factories/cht/contacts/place');
const personFactory = require('../../../factories/cht/contacts/person');
const deliveryFactory = require('../../../factories/cht/reports/delivery');
const pregnancyFactory = require('../../../factories/cht/reports/pregnancy');
const pregnancyVisitFactory = require('../../../factories/cht/reports/pregnancy-visit');

const LOCAL_LOG = '_local/initial-replication';

const getReportContext = (patient, submitter) => {
  const context = {
    fields:
      {
        patient_id: patient._id,
        patient_uuid: patient._id,
        patient_name: patient.name,
      },
  };
  if (submitter) {
    context.contact = {
      _id: submitter.contact._id,
      parent: submitter.contact.parent,
    };
  }
  return context;
};
const createHierarchy = (name, user=false) => {
  const hierarchy = placeFactory.generateHierarchy();
  const healthCenter = hierarchy.get('health_center');
  user = user && userFactory.build({ place: healthCenter._id, roles: ['chw'] });

  const clinics = Array
    .from({ length: 50 })
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

  const reports = [
    ...persons.map(person => [
      deliveryFactory.build(getReportContext(person, user)),
      pregnancyFactory.build(getReportContext(person, user)),
      pregnancyVisitFactory.build(getReportContext(person, user)),
    ]),
  ].flat();

  const places = [...hierarchy.values()].map(place => {
    place.name = `${name} ${place.type}`;
    return place;
  });

  return {
    user,
    places,
    clinics,
    persons,
    reports,
  };
};

const getServerDocs = async (docIds) => {
  const result = await utils.db.allDocs({ keys: docIds });
  return result.rows;
};

const userAllowedDocs = createHierarchy('base', true);
const userDeniedDocs = createHierarchy('other');

const requiredDocs = [
  '_design/medic-client',
  'settings',
  `org.couchdb.user:${userAllowedDocs.user.username}`,
  'service-worker-meta',
  'resources',
  'branding',
  userAllowedDocs.user.place,
  userAllowedDocs.user.contact._id,
];

const isTombstone = (id) => id.endsWith('tombstone');
const ids = docs => docs.map(doc => doc._id);

const getTranslationIds = async () => {
  const translationDocs = await utils.db.allDocs({
    start_key: 'messages-',
    end_key: 'messages-\ufff0',
  });
  const docIds = translationDocs.rows
    .map(row => row.id)
    .filter(id => !isTombstone(id));
  return docIds;
};

const getForms = async () => {
  const formDocs = await utils.db.allDocs({
    start_key: 'form:',
    end_key: 'form:\ufff0',
    include_docs: true,
    attachments: true,
  });
  return formDocs.rows.filter(row => !isTombstone(row.id));
};

const validateReplication = async () => {
  const localAllDocsPreSync = await browserUtils.getDocs();
  const docIdsPreSync = localAllDocsPreSync.map(row => row.id);

  await commonPage.sync(false, 5000);

  const localAllDocs = await browserUtils.getDocs();
  const localDocIds = localAllDocs.map(row => row.id);

  // no additional docs to download
  expect(docIdsPreSync).to.have.members(localDocIds);

  const serverAllDocs = await getServerDocs(localDocIds);

  // docs revs are the same
  expect(localAllDocs).to.deep.equal(serverAllDocs);

  const translationIds = await getTranslationIds();
  const forms = await getForms();
  const formIds = forms.map(row => row.id);

  expect(localDocIds).to.include.members(requiredDocs);
  expect(localDocIds).to.include.members(translationIds);

  const localForms = await browserUtils.getDocs(formIds);
  const expectedAttachments = ['model.xml', 'form.html', 'xml'];
  localForms.forEach(form => {
    const attachments = form._attachments;
    const serverForm = forms.find(serverForm => form._id === serverForm.id);

    expect(Object.keys(attachments)).to.have.members(expectedAttachments, `${form._id} has incorrect attachments`);
    expectedAttachments.forEach(attName =>
      expect(attachments[attName].data).to.deep.equal(serverForm.doc._attachments[attName].data)
    );
  });

  expect(localDocIds).to.include.members(ids(userAllowedDocs.clinics));
  expect(localDocIds).to.include.members(ids(userAllowedDocs.persons));
  expect(localDocIds).to.include.members(ids(userAllowedDocs.reports));

  const replicatedDeniedDocs = _.intersection(
    localDocIds,
    ids([...userDeniedDocs.clinics, ...userDeniedDocs.persons, ...userDeniedDocs.reports])
  );
  expect(replicatedDeniedDocs).to.deep.equal([]);

  const initalReplicationLog = await browserUtils.getDoc(LOCAL_LOG);
  expect(initalReplicationLog.complete).to.equal(true);
};

const refreshAndWaitForAngular = async () => {
  await browser.refresh();
  await commonPage.waitForAngularLoaded(3000);
};

describe('initial-replication', () => {
  before(async () => {
    // we're creating ~2000 docs
    await utils.saveDocs([...userAllowedDocs.places, ...userDeniedDocs.places]);
    await utils.createUsers([userAllowedDocs.user]);

    await sentinelUtils.waitForSentinel();
    await utils.stopSentinel();

    await utils.saveDocs(userAllowedDocs.clinics);
    await utils.saveDocs(userDeniedDocs.clinics);

    await utils.saveDocs(userAllowedDocs.persons);
    await utils.saveDocs(userDeniedDocs.persons);

    await utils.saveDocs(userAllowedDocs.reports);
    await utils.saveDocs(userDeniedDocs.reports);
  });

  after(async () => {
    await sentinelUtils.skipToSeq();
    await utils.startSentinel();
  });

  afterEach(async () => {
    await browser.reloadSession();
    await browser.url('/');
  });

  it('should log user in', async () => {
    await loginPage.login(userAllowedDocs.user);

    await validateReplication();

    // does not restart initial replication on refresh
    await browser.refresh();
    await commonPage.waitForAngularLoaded(3000);

    // supports reloading the page while offline
    await browser.throttle('offline');
    await refreshAndWaitForAngular();
    await browser.throttle('online');

    // it should not restart initial replication if the local doc is missing on refresh
    await browserUtils.deleteDoc(LOCAL_LOG);
    await refreshAndWaitForAngular();

    // it should support reloading the page while offline
    await browser.throttle('offline');
    await refreshAndWaitForAngular();
  });

  it('should support "disconnects"', async () => {
    loginPage.login({ ...userAllowedDocs.user, loadPage: false });
    setTimeout(() => browser.refresh(), 1000);
    setTimeout(() => browser.refresh(), 3000);
    setTimeout(() => browser.refresh(), 5000);

    await commonPage.waitForPageLoaded();
    await validateReplication();
  });
});
