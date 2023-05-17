const _ = require('lodash');
const { expect } = require('chai');

const commonElements = require('../../../page-objects/protractor/common/common.po.js');
const utils = require('../../../utils');
const loginPage = require('../../../page-objects/protractor/login/login.po.js');
const contactsObjects = require('../../../page-objects/protractor/contacts/contacts.po');
const sentinelUtils = require('../../../utils/sentinel');
const formsUtils = require('./forms');
const constants = require('../../../constants.js');

/* global window */

describe('Muting', () => {
  let originalTimeout;

  const password = 'Sup3rSecret!';
  const DISTRICT = {
    _id: 'DISTRICT',
    type: 'district_hospital',
    name: 'DISTRICT'
  };

  const HEALTH_CENTER = {
    _id: 'HEALTH_CENTER',
    type: 'health_center',
    name: 'Health Center',
    parent: { _id: DISTRICT._id },
  };

  const contact1 = {
    _id: 'contact1',
    name: 'contact1',
    type: 'person',
    parent: { _id: HEALTH_CENTER._id, parent: { _id: DISTRICT._id } },
  };
  const clinic1 = {
    _id: 'clinic1',
    name: 'clinic one',
    type: 'clinic',
    place_id: 'clinic_1',
    parent: { _id: HEALTH_CENTER._id, parent: { _id: DISTRICT._id } },
    contact: { _id: 'contact1' },
  };
  const clinic2 = {
    _id: 'clinic2',
    name: 'clinic two',
    type: 'clinic',
    place_id: 'clinic_2',
    parent: { _id: HEALTH_CENTER._id, parent: { _id: DISTRICT._id } },
    contact: { _id: 'contact1' },
  };
  const patient1 = {
    _id: 'patient1',
    name: 'patient one',
    type: 'person',
    patient_id: 'patient_1',
    parent: { _id: 'clinic1', parent: { _id: HEALTH_CENTER._id, parent: { _id: DISTRICT._id } } },
  };
  const patient2 = {
    _id: 'patient2',
    name: 'patient two',
    type: 'person',
    patient_id: 'patient_2',
    parent: { _id: 'clinic2', parent: { _id: HEALTH_CENTER._id, parent: { _id: DISTRICT._id } } },
  };
  const patient3 = {
    _id: 'patient3',
    name: 'patient three',
    type: 'person',
    patient_id: 'patient_3',
    parent: { _id: 'clinic1', parent: { _id: HEALTH_CENTER._id, parent: { _id: DISTRICT._id } } },
  };

  const contacts = [
    contact1,
    clinic1,
    clinic2,
    patient1,
    patient2,
    patient3,
  ];

  const offlineUser = {
    username: 'offline_user',
    password: password,
    place: 'HEALTH_CENTER',
    contact: {
      _id: 'fixture:user:offline',
      name: 'Offline'
    },
    roles: ['district_admin'],
    known: true,
  };

  const onlineUser = {
    username: 'online',
    password: password,
    place: 'HEALTH_CENTER',
    contact: {
      _id: 'fixture:user:online',
      name: 'Offline'
    },
    roles: ['national_admin'],
    known: true,
  };

  const settings = {
    transitions: { muting: true },
    muting: {
      mute_forms: ['mute_person', 'mute_clinic'],
      unmute_forms: ['unmute_person', 'unmute_clinic'],
    },
  };

  const getLastSubmittedReport = () => {
    return browser.executeAsyncScript(() => {
      const callback = arguments[arguments.length - 1];
      const db = window.CHTCore.DB.get();
      return db
        .query('medic-client/reports_by_date', { descending: true, limit: 1, include_docs: true })
        .then(result => callback(result.rows[0].doc))
        .catch(err => callback(err));
    });
  };

  const getLocalDoc = (uuid) => {
    return browser.executeAsyncScript((uuid) => {
      const callback = arguments[arguments.length - 1];
      const db = window.CHTCore.DB.get();
      return db
        .get(uuid)
        .then(doc => callback(doc))
        .catch(err => callback(err));
    }, uuid);
  };

  const ensureSync = async (localDoc) => {
    await commonElements.syncNative();
    try {
      const onlineDoc = await utils.getDoc(localDoc._id, localDoc._rev);
      expect(onlineDoc).excludingEvery('_attachments').to.deep.equal(localDoc);
    } catch (err) {
      return utils.delayPromise(() => ensureSync(localDoc), 300);
    }
  };

  const submitMutingForm = async (contact, form, sync = false) =>  {
    await contactsObjects.loadContact(contact._id);

    await formsUtils.openForm(form);
    await formsUtils.submit();
    if (sync) {
      const lastSubmittedReport = await getLastSubmittedReport();
      await ensureSync(lastSubmittedReport);
    }
  };

  const muteClinic = (contact, sync = false) => {
    return submitMutingForm(contact, 'mute_clinic', sync);
  };

  const unmuteClinic = (contact, sync = false) => {
    return submitMutingForm(contact, 'unmute_clinic', sync);
  };

  const mutePerson = (contact, sync = false) => {
    return submitMutingForm(contact, 'mute_person', sync);
  };

  const unmutePerson = (contact, sync = false) => {
    return submitMutingForm(contact, 'unmute_person', sync);
  };

  const restartSentinel = async (sync = false) => {
    await utils.startSentinel();
    await sentinelUtils.waitForSentinel();
    await utils.resetBrowserNative();
    sync && await commonElements.syncNative();
  };

  const expectUnmutedNoHistory = (doc) => {
    expect(doc.muted).to.be.undefined;
    expect(doc.muting_history).to.be.undefined;
  };
  const expectMutedNoHistory = (doc) => {
    expect(doc.muted).to.be.ok;
    expect(doc.muting_history).to.be.undefined;
  };

  const setBrowserOffline = () => {
    return browser.driver.setNetworkConditions({ offline: true, latency: 0, throughput: 0 });
  };
  const setBrowserOnline = () => {
    return browser.driver.setNetworkConditions({ latency: 0, throughput: 1000 * 1000 }, 'No throttling');
  };

  beforeAll(async () => {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

    await utils.saveDocs([DISTRICT, HEALTH_CENTER]);
    await formsUtils.uploadForms();
  });

  afterAll(async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;

    await utils.startSentinel();
    await commonElements.goToLoginPageNative();
    await loginPage.loginNative(constants.USERNAME, constants.PASSWORD);
    await utils.revertDb();
    await commonElements.calmNative();
  });

  describe('for an online user',  () => {
    beforeAll(async () => {
      await utils.saveDocs(contacts);
      await utils.createUsers([onlineUser]);
      await commonElements.goToLoginPageNative();
      await loginPage.loginNative('online', password);
    });

    afterAll(async () => {
      await utils.deleteUsers([onlineUser]);
    });

    afterEach(async () => {
      await utils.revertDb([DISTRICT._id, HEALTH_CENTER._id, /^form:/]);
    });

    it('should not process client-side when muting as an online user', async () => {
      // turning off sentinel so it doesn't process muting
      await utils.stopSentinel();
      await utils.updateSettings(settings);

      await muteClinic(clinic1);

      expectUnmutedNoHistory(await utils.getDoc(clinic1._id));
      expectUnmutedNoHistory(await utils.getDoc(patient1._id));

      await restartSentinel();

      expectMutedNoHistory(await utils.getDoc(clinic1._id));
      expectMutedNoHistory(await utils.getDoc(patient1._id));
    });
  });

  describe('for an offline user', () => {
    beforeAll(async () => {
      await utils.saveDocs(contacts);
      await utils.createUsers([offlineUser]);
      await commonElements.goToLoginPageNative();
      await loginPage.loginNative(offlineUser.username, password);
      try {
        await commonElements.calmNative();
      } catch (err) {
        console.warn('Error when expecting page load', err);
        await browser.driver.navigate().refresh();
        await commonElements.calmNative();
      }
    });

    afterAll(async () => {
      await utils.deleteUsers([offlineUser]);
    });

    afterEach(async () => {
      await commonElements.syncNative();
      await setBrowserOffline();
      await utils.revertSettings(true);
      await unmuteContacts();
      await setBrowserOnline();
      await utils.refreshToGetNewSettings();
    });

    const updateSettings = async (settings) => {
      await setBrowserOffline();
      await utils.updateSettings(settings, true);
      await setBrowserOnline();
      try {
        await commonElements.syncNative();
        await utils.refreshToGetNewSettings();
      } catch (err) {
        // sometimes sync happens by itself, on timeout
        console.error('Error when trying to sync', err);
        await utils.refreshToGetNewSettings();
        await commonElements.syncNative();
      }
    };

    const unmuteContacts = () => {
      const ids = contacts.map(c => c._id);
      return browser.executeAsyncScript((ids) => {
        const callback = arguments[arguments.length - 1];
        const db = window.CHTCore.DB.get();
        return db
          .allDocs({ keys: ids, include_docs: true })
          .then(result => {
            const docs = [];
            result.rows.forEach(row => {
              if (!row.doc) {
                return;
              }
              delete row.doc.muted;
              delete row.doc.muting_history;
              docs.push(row.doc);
            });
            return db.bulkDocs(docs);
          })
          .then(callback)
          .catch(callback);
      }, ids);
    };

    it('should not process muting client-side if not enabled', async () => {
      const settingsWithDisabled = _.cloneDeep(settings);
      settingsWithDisabled.transitions.muting = { client_side: false };

      await utils.stopSentinel();
      await updateSettings(settingsWithDisabled);

      await muteClinic(clinic2, true);

      expectUnmutedNoHistory(await utils.getDoc(clinic2._id));
      expectUnmutedNoHistory(await utils.getDoc(patient2._id));

      await restartSentinel(true);

      expectMutedNoHistory(await utils.getDoc(clinic2._id));
      expectMutedNoHistory(await utils.getDoc(patient2._id));
    });

    // for simplicity, offline means sentinel is stopped
    it('should mute and unmute a person while "offline", with processing in between', async () => {
      await utils.stopSentinel();
      await updateSettings(settings);

      await mutePerson(patient1, true);

      const mutingReport = await getLastSubmittedReport();
      expect(mutingReport).to.deep.nested.include({
        form: 'mute_person',
        'fields.patient_uuid': patient1._id,
        client_side_transitions: { muting: true },
      });

      let updatedPatient1 = await utils.getDoc(patient1._id);
      expect(updatedPatient1.muted).to.be.ok;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: false },
        client_side: [{ muted: true, date: updatedPatient1.muted, report_id: mutingReport._id }],
      });
      const clientMutingDate = updatedPatient1.muted;

      expectUnmutedNoHistory(await utils.getDoc(clinic1._id));

      // other contacts are not muted
      expectUnmutedNoHistory(await utils.getDoc(patient2._id));
      expectUnmutedNoHistory(await utils.getDoc(clinic2._id));

      await restartSentinel(true);

      updatedPatient1 = await utils.getDoc(patient1._id);
      expect(updatedPatient1.muted).to.be.ok;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'server_side',
        server_side: { muted: true, date: updatedPatient1.muted },
        client_side: [{ muted: true, date: clientMutingDate, report_id: mutingReport._id }],
      });
      const serverMutedDate = updatedPatient1.muted;

      expectUnmutedNoHistory(await utils.getDoc(clinic1._id));

      await utils.stopSentinel();

      await unmutePerson(patient1, true);

      const unmutingReport = await getLastSubmittedReport();
      expect(unmutingReport).to.deep.nested.include({
        form: 'unmute_person',
        'fields.patient_uuid': patient1._id,
        client_side_transitions: { muting: true },
      });

      updatedPatient1 = await utils.getDoc(patient1._id);

      expect(updatedPatient1.muted).to.be.undefined;
      const unmutingDate = updatedPatient1.muting_history.client_side[1].date;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: true, date: serverMutedDate },
        client_side: [
          { muted: true, date: clientMutingDate, report_id: mutingReport._id },
          { muted: false, date: unmutingDate /* can't guess this date */, report_id: unmutingReport._id },
        ],
      });

      await restartSentinel(true);

      updatedPatient1 = await utils.getDoc(patient1._id);

      expect(updatedPatient1.muted).to.be.undefined;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'server_side',
        /* can't guess this date */
        server_side: { muted: false, date: updatedPatient1.muting_history.server_side.date },
        client_side: [
          { muted: true, date: clientMutingDate, report_id: mutingReport._id },
          { muted: false, date: unmutingDate, report_id: unmutingReport._id },
        ],
      });

      expectUnmutedNoHistory(await utils.getDoc(clinic1._id));

      const infodoc = await sentinelUtils.getInfoDoc(patient1._id);
      expect(infodoc.muting_history.slice(-2)).excludingEvery('date').to.deep.equal([
        { muted: true, report_id: mutingReport._id },
        { muted: false, report_id: unmutingReport._id },
      ]);
    });

    it('should mute and unmute a person while "offline", without processing in between', async () => {
      await utils.stopSentinel();
      await updateSettings(settings);

      await mutePerson(patient1, true);

      const mutingReport = await getLastSubmittedReport();
      expect(mutingReport).to.deep.nested.include({
        form: 'mute_person',
        'fields.patient_uuid': patient1._id,
        client_side_transitions: { muting: true },
      });

      let updatedPatient1 = await utils.getDoc(patient1._id);
      expect(updatedPatient1.muted).to.be.ok;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: false },
        client_side: [{ muted: true, date: updatedPatient1.muted, report_id: mutingReport._id }],
      });
      const clientMutingDate = updatedPatient1.muted;

      await unmutePerson(patient1, true);

      const unmutingReport = await getLastSubmittedReport();
      expect(unmutingReport).to.deep.nested.include({
        form: 'unmute_person',
        'fields.patient_uuid': patient1._id,
        client_side_transitions: { muting: true },
      });

      updatedPatient1 = await utils.getDoc(patient1._id);

      expect(updatedPatient1.muted).to.be.undefined;
      const unmutingDate = updatedPatient1.muting_history.client_side[1].date;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: false },
        client_side: [
          { muted: true, date: clientMutingDate, report_id: mutingReport._id },
          { muted: false, date: unmutingDate /* can't guess this date */, report_id: unmutingReport._id },
        ],
      });

      await restartSentinel(true);

      updatedPatient1 = await utils.getDoc(patient1._id);

      expect(updatedPatient1.muted).to.be.undefined;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'server_side',
        /* can't guess this date */
        server_side: { muted: false, date: updatedPatient1.muting_history.server_side.date },
        client_side: [
          { muted: true, date: clientMutingDate, report_id: mutingReport._id },
          { muted: false, date: unmutingDate, report_id: unmutingReport._id },
        ],
      });

      const infodoc = await sentinelUtils.getInfoDoc(patient1._id);
      expect(infodoc.muting_history.slice(-2)).excludingEvery('date').to.deep.equal([
        { muted: true, report_id: mutingReport._id },
        { muted: false, report_id: unmutingReport._id },
      ]);
    });

    it('should mute and unmute a clinic while "offline", with processing in between', async () => {
      await utils.stopSentinel();
      await updateSettings(settings);

      await muteClinic(clinic1, true);

      const mutingReport = await getLastSubmittedReport();
      expect(mutingReport).to.deep.nested.include({
        form: 'mute_clinic',
        'fields.place_id': clinic1._id,
        client_side_transitions: { muting: true },
      });

      let updatedClinic1 = await utils.getDoc(clinic1._id);
      expect(updatedClinic1.muted).to.be.ok;
      expect(updatedClinic1.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: false },
        client_side: [{ muted: true, date: updatedClinic1.muted, report_id: mutingReport._id }],
      });

      let updatedPatient1 = await utils.getDoc(patient1._id);
      expect(updatedPatient1.muted).to.be.ok;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: false },
        client_side: [{ muted: true, date: updatedPatient1.muted, report_id: mutingReport._id }],
      });
      expect(updatedClinic1.muted).to.equal(updatedPatient1.muted);

      let updatedPatient3 = await utils.getDoc(patient3._id);
      expect(updatedPatient3.muted).to.be.ok;
      expect(updatedPatient3.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: false },
        client_side: [{ muted: true, date: updatedPatient3.muted, report_id: mutingReport._id }],
      });

      expectUnmutedNoHistory(await utils.getDoc(clinic2._id));
      expectUnmutedNoHistory(await utils.getDoc(patient2._id));
      expectUnmutedNoHistory(await utils.getDoc(contact1._id));

      const clientMutingDate = updatedPatient1.muted;

      await restartSentinel(true);

      updatedPatient1 = await utils.getDoc(patient1._id);
      expect(updatedPatient1.muted).to.be.ok;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'server_side',
        server_side: { muted: true, date: updatedPatient1.muted },
        client_side: [{ muted: true, date: clientMutingDate, report_id: mutingReport._id }],
      });
      updatedPatient3 = await utils.getDoc(patient3._id);
      expect(updatedPatient3.muted).to.be.ok;
      expect(updatedPatient3.muting_history).to.deep.equal({
        last_update: 'server_side',
        server_side: { muted: true, date: updatedPatient3.muted },
        client_side: [{ muted: true, date: clientMutingDate, report_id: mutingReport._id }],
      });
      updatedClinic1 = await utils.getDoc(clinic1._id);
      expect(updatedClinic1.muted).to.be.ok;
      expect(updatedClinic1.muting_history).to.deep.equal({
        last_update: 'server_side',
        server_side: { muted: true, date: updatedClinic1.muted },
        client_side: [{ muted: true, date: clientMutingDate, report_id: mutingReport._id }],
      });

      const patient1ServerMutingDate = updatedPatient1.muted;
      const clinic1ServerMutingDate = updatedClinic1.muted;

      await utils.stopSentinel();

      await unmuteClinic(clinic1, true);

      const unmutingReport = await getLastSubmittedReport();
      expect(unmutingReport).to.deep.nested.include({
        form: 'unmute_clinic',
        'fields.place_id': clinic1._id,
        client_side_transitions: { muting: true },
      });

      updatedPatient1 = await utils.getDoc(patient1._id);
      expect(updatedPatient1.muted).to.be.undefined;
      const unmutingDate = updatedPatient1.muting_history.client_side[1].date;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: true, date: patient1ServerMutingDate },
        client_side: [
          { muted: true, date: clientMutingDate, report_id: mutingReport._id },
          { muted: false, date: unmutingDate, report_id: unmutingReport._id },
        ],
      });

      updatedClinic1 = await utils.getDoc(clinic1._id);
      expect(updatedClinic1.muted).to.be.undefined;
      expect(updatedClinic1.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: true, date: clinic1ServerMutingDate },
        client_side: [
          { muted: true, date: clientMutingDate, report_id: mutingReport._id },
          { muted: false, date: unmutingDate, report_id: unmutingReport._id },
        ],
      });

      await restartSentinel(true);

      updatedPatient1 = await utils.getDoc(patient1._id);

      expect(updatedPatient1.muted).to.be.undefined;
      let serverUnmutingDate = updatedPatient1.muting_history.server_side.date;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'server_side',
        server_side: { muted: false, date: serverUnmutingDate },
        client_side: [
          { muted: true, date: clientMutingDate, report_id: mutingReport._id },
          { muted: false, date: unmutingDate, report_id: unmutingReport._id },
        ],
      });

      updatedClinic1 = await utils.getDoc(clinic1._id);
      serverUnmutingDate = updatedClinic1.muting_history.server_side.date;
      expect(updatedClinic1.muting_history).to.deep.equal({
        last_update: 'server_side',
        server_side: { muted: false, date: serverUnmutingDate },
        client_side: [
          { muted: true, date: clientMutingDate, report_id: mutingReport._id },
          { muted: false, date: unmutingDate, report_id: unmutingReport._id },
        ],
      });

      const clinic1Infodoc = await sentinelUtils.getInfoDoc(clinic1._id);
      expect(clinic1Infodoc.muting_history.slice(-2)).excludingEvery('date').to.deep.equal([
        { muted: true, report_id: mutingReport._id },
        { muted: false, report_id: unmutingReport._id },
      ]);

      const patient1Infodoc = await sentinelUtils.getInfoDoc(patient1._id);
      expect(patient1Infodoc.muting_history.slice(-2)).excludingEvery('date').to.deep.equal([
        { muted: true, report_id: mutingReport._id },
        { muted: false, report_id: unmutingReport._id },
      ]);
    });

    it('should mute and unmute a clinic while "offline", without processing in between', async () => {
      await utils.stopSentinel();
      await updateSettings(settings);

      await muteClinic(clinic1, true);

      const mutingReport = await getLastSubmittedReport();
      expect(mutingReport).to.deep.nested.include({
        form: 'mute_clinic',
        'fields.place_id': clinic1._id,
        client_side_transitions: { muting: true },
      });

      let updatedPatient1 = await utils.getDoc(patient1._id);
      expect(updatedPatient1.muted).to.be.ok;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: false },
        client_side: [{ muted: true, date: updatedPatient1.muted, report_id: mutingReport._id }],
      });
      let updatedClinic1 = await utils.getDoc(clinic1._id);
      expect(updatedPatient1.muted).to.be.ok;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: false },
        client_side: [{ muted: true, date: updatedClinic1.muted, report_id: mutingReport._id }],
      });
      expect(updatedPatient1.muted).to.equal(updatedClinic1.muted);

      const clientMutingDate = updatedClinic1.muted;

      await unmuteClinic(clinic1, true);

      const unmutingReport = await getLastSubmittedReport();
      expect(unmutingReport).to.deep.nested.include({
        form: 'unmute_clinic',
        'fields.place_id': clinic1._id,
        client_side_transitions: { muting: true },
      });

      updatedPatient1 = await utils.getDoc(patient1._id);
      expect(updatedPatient1.muted).to.be.undefined;
      const patient1UnmutingDate = updatedPatient1.muting_history.client_side[1].date;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: false },
        client_side: [
          { muted: true, date: clientMutingDate, report_id: mutingReport._id },
          { muted: false, date: patient1UnmutingDate, report_id: unmutingReport._id },
        ],
      });

      updatedClinic1 = await utils.getDoc(clinic1._id);
      expect(updatedClinic1.muted).to.be.undefined;
      const clinic1UnmutingDate = updatedClinic1.muting_history.client_side[1].date;
      expect(updatedClinic1.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: false },
        client_side: [
          { muted: true, date: clientMutingDate, report_id: mutingReport._id },
          { muted: false, date: clinic1UnmutingDate, report_id: unmutingReport._id },
        ],
      });

      await restartSentinel(true);

      updatedPatient1 = await utils.getDoc(patient1._id);
      expect(updatedPatient1.muted).to.be.undefined;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'server_side',
        /* can't guess this date */
        server_side: { muted: false, date: updatedPatient1.muting_history.server_side.date },
        client_side: [
          { muted: true, date: clientMutingDate, report_id: mutingReport._id },
          { muted: false, date: patient1UnmutingDate, report_id: unmutingReport._id },
        ],
      });
      updatedClinic1 = await utils.getDoc(clinic1._id);
      expect(updatedClinic1.muted).to.be.undefined;
      expect(updatedClinic1.muting_history).to.deep.equal({
        last_update: 'server_side',
        server_side: { muted: false, date: updatedClinic1.muting_history.server_side.date /* can't guess this date */},
        client_side: [
          { muted: true, date: clientMutingDate, report_id: mutingReport._id },
          { muted: false, date: clinic1UnmutingDate, report_id: unmutingReport._id },
        ],
      });

      const infodocPatient = await sentinelUtils.getInfoDoc(patient1._id);
      expect(infodocPatient.muting_history.slice(-2)).excludingEvery('date').to.deep.equal([
        { muted: true, report_id: mutingReport._id },
        { muted: false, report_id: unmutingReport._id },
      ]);

      const infodocClinic = await sentinelUtils.getInfoDoc(clinic1._id);
      expect(infodocClinic.muting_history.slice(-2)).excludingEvery('date').to.deep.equal([
        { muted: true, report_id: mutingReport._id },
        { muted: false, report_id: unmutingReport._id },
      ]);
    });

    it('should mute a clinic and unmute a patient while "offline", without processing in between', async () => {
      await utils.stopSentinel();
      await updateSettings(settings);

      await muteClinic(clinic1, true);

      const mutingReport = await getLastSubmittedReport();
      expect(mutingReport).to.deep.nested.include({
        form: 'mute_clinic',
        'fields.place_id': clinic1._id,
        client_side_transitions: { muting: true },
      });

      let updatedPatient1 = await utils.getDoc(patient1._id);
      expect(updatedPatient1.muted).to.be.ok;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: false },
        client_side: [{ muted: true, date: updatedPatient1.muted, report_id: mutingReport._id }],
      });
      let updatedPatient3 = await utils.getDoc(patient3._id);
      expect(updatedPatient3.muted).to.be.ok;
      expect(updatedPatient3.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: false },
        client_side: [{ muted: true, date: updatedPatient3.muted, report_id: mutingReport._id }],
      });
      let updatedClinic1 = await utils.getDoc(clinic1._id);
      expect(updatedPatient1.muted).to.be.ok;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: false },
        client_side: [{ muted: true, date: updatedClinic1.muted, report_id: mutingReport._id }],
      });
      expect(updatedPatient1.muted).to.equal(updatedClinic1.muted);

      const clientMutingDate = updatedClinic1.muted;

      await unmutePerson(patient1, true);

      const unmutingReport = await getLastSubmittedReport();
      expect(unmutingReport).to.deep.nested.include({
        form: 'unmute_person',
        'fields.patient_uuid': patient1._id,
        client_side_transitions: { muting: true },
      });

      updatedPatient1 = await utils.getDoc(patient1._id);
      expect(updatedPatient1.muted).to.be.undefined;
      const patient1unmutingDate = updatedPatient1.muting_history.client_side[1].date;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: false },
        client_side: [
          { muted: true, date: clientMutingDate, report_id: mutingReport._id },
          { muted: false, date: patient1unmutingDate, report_id: unmutingReport._id },
        ],
      });
      updatedPatient3 = await utils.getDoc(patient3._id);
      expect(updatedPatient3.muted).to.be.undefined;
      const patient3unmutingDate = updatedPatient3.muting_history.client_side[1].date;
      expect(updatedPatient3.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: false },
        client_side: [
          { muted: true, date: clientMutingDate, report_id: mutingReport._id },
          { muted: false, date: patient3unmutingDate, report_id: unmutingReport._id },
        ],
      });

      updatedClinic1 = await utils.getDoc(clinic1._id);
      expect(updatedClinic1.muted).to.be.undefined;
      const clinic1unmutingDate = updatedClinic1.muting_history.client_side[1].date;
      expect(updatedClinic1.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: false },
        client_side: [
          { muted: true, date: clientMutingDate, report_id: mutingReport._id },
          { muted: false, date: clinic1unmutingDate, report_id: unmutingReport._id },
        ],
      });

      await restartSentinel(true);

      updatedPatient1 = await utils.getDoc(patient1._id);
      expect(updatedPatient1.muted).to.be.undefined;
      expect(updatedPatient1.muting_history).to.deep.equal({
        last_update: 'server_side',
        /* can't guess this date */
        server_side: { muted: false, date: updatedPatient1.muting_history.server_side.date },
        client_side: [
          { muted: true, date: clientMutingDate, report_id: mutingReport._id },
          { muted: false, date: patient1unmutingDate, report_id: unmutingReport._id },
        ],
      });
      updatedPatient3 = await utils.getDoc(patient3._id);
      expect(updatedPatient3.muted).to.be.undefined;
      expect(updatedPatient3.muting_history).to.deep.equal({
        last_update: 'server_side',
        /* can't guess this date */
        server_side: { muted: false, date: updatedPatient3.muting_history.server_side.date },
        client_side: [
          { muted: true, date: clientMutingDate, report_id: mutingReport._id },
          { muted: false, date: patient3unmutingDate, report_id: unmutingReport._id },
        ],
      });
      updatedClinic1 = await utils.getDoc(clinic1._id);
      expect(updatedClinic1.muted).to.be.undefined;
      expect(updatedClinic1.muting_history).to.deep.equal({
        last_update: 'server_side',
        server_side: { muted: false, date: updatedClinic1.muting_history.server_side.date /* can't guess this date */},
        client_side: [
          { muted: true, date: clientMutingDate, report_id: mutingReport._id },
          { muted: false, date: clinic1unmutingDate, report_id: unmutingReport._id },
        ],
      });

      const infodocPatient = await sentinelUtils.getInfoDoc(patient1._id);
      expect(infodocPatient.muting_history.slice(-2)).excludingEvery('date').to.deep.equal([
        { muted: true, report_id: mutingReport._id },
        { muted: false, report_id: unmutingReport._id },
      ]);

      const infodocClinic = await sentinelUtils.getInfoDoc(clinic1._id);
      expect(infodocClinic.muting_history.slice(-2)).excludingEvery('date').to.deep.equal([
        { muted: true, report_id: mutingReport._id },
        { muted: false, report_id: unmutingReport._id },
      ]);
    });

    it('should handle offline multiple muting/unmuting events gracefully', async () => {
      // this test has value after it ran for at least 100 times
      await utils.stopSentinel();
      await updateSettings(settings);

      await muteClinic(clinic1);
      await unmutePerson(patient1); // also unmutes clinic
      await mutePerson(patient1);
      await unmutePerson(patient1);
      await muteClinic(clinic1);
      await unmuteClinic(clinic1);
      await mutePerson(patient1);

      let updatePatient1 = await utils.getDoc(patient1._id);
      expect(updatePatient1.muted).to.be.ok;
      expect(updatePatient1.muting_history.last_update).to.equal('client_side');
      expect(updatePatient1.muting_history.server_side).to.deep.equal({ muted: false });
      expect(updatePatient1.muting_history.client_side.length).to.equal(7);

      let updatedClinic = await utils.getDoc(clinic1._id);
      expect(updatedClinic.muted).to.be.undefined;
      expect(updatedClinic.muting_history.last_update).to.equal('client_side');
      expect(updatedClinic.muting_history.server_side).to.deep.equal({ muted: false });
      expect(updatedClinic.muting_history.client_side.length).to.equal(4);

      await utils.startSentinel();
      const reportIds = updatePatient1.muting_history.client_side.map(event => event.report_id);
      await sentinelUtils.waitForSentinel(reportIds);

      updatePatient1 = await utils.getDoc(patient1._id);
      expect(updatePatient1.muted).to.be.ok;
      expect(updatePatient1.muting_history.last_update).to.equal('server_side');
      expect(updatePatient1.muting_history.server_side).to.deep.equal({ muted: true, date: updatePatient1.muted });
      expect(updatePatient1.muting_history.client_side.length).to.equal(7);

      updatedClinic = await utils.getDoc(clinic1._id);
      expect(updatedClinic.muted).to.be.undefined;
      expect(updatedClinic.muting_history.last_update).to.equal('server_side');
      expect(updatedClinic.muting_history.server_side.muted).to.equal(false);
      expect(updatedClinic.muting_history.client_side.length).to.equal(4);
    });

    it('should save validation errors on docs', async () => {
      await utils.addTranslations('en', {
        'muting.validation.message':
          '{{contact.name}}, field incorrect {{patient_name}} ({{patient_id}}) {{meta.instanceID}}',
      });

      const settingsWithValidations = _.cloneDeep(settings);
      settingsWithValidations.muting.validations = {
        list: [
          {
            property: 'inexistent_property',
            rule: 'regex(\'^[0-9]{5,13}$\')',
            translation_key: 'muting.validation.message',
          }
        ],
      };

      await utils.stopSentinel();
      await updateSettings(settingsWithValidations);

      await mutePerson(patient1);
      let updatedPatient1 = await utils.getDoc(patient1._id);
      expectUnmutedNoHistory(updatedPatient1);

      const report = await getLastSubmittedReport();
      expect(report.errors.length).to.equal(1);
      expect(report.errors[0]).to.deep.equal({
        code: 'invalid_inexistent_property',
        message: `Offline, field incorrect ${patient1.name} (${patient1.patient_id}) ${report.fields.meta.instanceID}`,
      });
      expect(report.tasks).to.be.undefined;
      expect(report.client_side_transitions).to.be.undefined;

      await utils.startSentinel();
      await sentinelUtils.waitForSentinel(report._id);

      updatedPatient1 = await utils.getDoc(patient1._id);
      expectUnmutedNoHistory(updatedPatient1);
      const serverReport = await utils.getDoc(report._id);
      expect(serverReport.errors).to.deep.equal(report.errors);
      expect(serverReport.tasks.length).to.equal(1);
      expect(serverReport.tasks[0].messages[0].message).to.equal(serverReport.errors[0].message);
    });

    it('should work with composite forms', async () => {
      await utils.stopSentinel();
      await updateSettings(settings);

      await contactsObjects.loadContact(HEALTH_CENTER._id);
      await formsUtils.openForm('mute_new_clinic');
      await formsUtils.selectHealthCenter(HEALTH_CENTER.name);
      await formsUtils.fillPatientName('new patient');

      await formsUtils.submit();

      const mutingReport = await getLastSubmittedReport();
      const mainReport = await getLocalDoc(mutingReport.created_by_doc);

      const newClinic = await getLocalDoc(mainReport.fields.clinic_doc);
      const newPerson = await getLocalDoc(mainReport.fields.person_doc);

      expect(newClinic.muted).to.be.ok;
      expect(newClinic.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: false },
        client_side: [{ muted: true, date: newClinic.muted, report_id: mutingReport._id }],
      });

      expect(newPerson.muted).to.be.ok;
      expect(newPerson.muting_history).to.deep.equal({
        last_update: 'client_side',
        server_side: { muted: false },
        client_side: [{ muted: true, date: newPerson.muted, report_id: mutingReport._id }],
      });

      expect(mutingReport.client_side_transitions.muting).to.equal(true);
      expect(mainReport.client_side_transitions).to.be.undefined;

      await utils.startSentinel();
      await sentinelUtils.waitForSentinel([mutingReport._id, newClinic._id, newPerson._id]);

      const updatedNewClinic = await utils.getDoc(newClinic._id);
      expect(updatedNewClinic.muted).to.be.ok;
      expect(updatedNewClinic.muting_history.last_update).to.equal('server_side');
      expect(updatedNewClinic.muting_history.server_side.muted).to.equal(true);

      const updatedNewPerson = await utils.getDoc(newPerson._id);
      expect(updatedNewPerson.muted).to.be.ok;
      expect(updatedNewPerson.muting_history.last_update).to.equal('server_side');
      expect(updatedNewPerson.muting_history.server_side.muted).to.equal(true);

      const infoDoc = await sentinelUtils.getInfoDoc(mutingReport._id);
      expect(infoDoc.transitions.muting.ok).to.equal(true);
    });
  });
});
