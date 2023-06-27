const sentinelUtils = require('@utils/sentinel');
const utils = require('@utils');
const { expect } = require('chai');
const uuid = require('uuid');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const reportFactory = require('@factories/cht/reports/generic-report');
const moment = require('moment');

const placeMap = placeFactory.generateHierarchy();
const DISTRICT_HOSPITAL = placeMap.get('district_hospital');
const HEALTH_CENTER = placeMap.get('health_center');
const CLINIC = placeMap.get('clinic');
const OFFLINE_USER = userFactory.build({ place: HEALTH_CENTER._id });
const PATIENT = personFactory.build({ parent: CLINIC });

const buildReport = (fields, contact) => reportFactory.build(
  { form: 'yes' },
  { patient: null, submitter: contact, fields}
);

const docs = [
  buildReport({
    place_id: CLINIC._id,
    to_be_purged: true
  }),
  buildReport({
    place_id: CLINIC._id,
    to_be_purged: false
  }),
  buildReport({
    patient_id: PATIENT._id,
    to_be_purged: true
  }),
  buildReport({
    patient_id: PATIENT._id,
    to_be_purged: false
  }),
  buildReport({
    patient_id: '',
    patient_uuid: PATIENT._id,
    to_be_purged: true
  }),
  buildReport({
    patient_id: '',
    patient_uuid: PATIENT._id,
    to_be_purged: false
  }),
  buildReport({ // unassigned
    to_be_purged: true,
  }),
  buildReport({ // unassigned
    to_be_purged: false,
  }),
  buildReport({
    patient_id: PATIENT._id,
    needs_signoff: true,
    to_be_purged: true,
  }, OFFLINE_USER.contact),
  {
    ...buildReport({
      patient_id: PATIENT._id,
      needs_signoff: true,
      to_be_purged: true,
    }, OFFLINE_USER.contact),
    errors: [{ code: 'registration_not_found' }],
  },
  buildReport({ // orphaned needs signoff
    patient_id: 'orphaned',
    needs_signoff: true,
    to_be_purged: true,
  }, OFFLINE_USER.contact),
  {
    _id: uuid.v4(),
    type: 'data_record',
    sms_message: true,
    contact: { _id: CLINIC._id },
    fields: { to_be_purged: true }
  },
  {
    _id: uuid.v4(),
    type: 'data_record',
    sms_message: true,
    contact: { _id: CLINIC._id },
    fields: { to_be_purged: false }
  },
  {
    _id: uuid.v4(),
    type: 'data_record',
    kujua_message: true,
    tasks: [{ messages: [{ contact: { _id: PATIENT._id } }] }],
    fields: { to_be_purged: true }
  },
  {
    _id: uuid.v4(),
    type: 'data_record',
    kujua_message: true,
    tasks: [{ messages: [{ contact: { _id: PATIENT._id } }] }],
    fields: { to_be_purged: false }
  },
];
const daysAgo = days => moment().subtract(days, 'days').format('Y-MM-DD');


const tasks = [
  // {
  //   _id: 'task1~user1',
  //   type: 'task',
  //   user: OFFLINE_USER.username,
  //   owner: PATIENT._id,
  //   state: 'Draft',
  //   emission: {
  //     startDate: daysAgo(200),
  //     dueDate: daysAgo(100),
  //     endDate: daysAgo(30),
  //   }
  // },
  // {
  //   _id: 'task2~user1',
  //   type: 'task',
  //   user: OFFLINE_USER.username,
  //   owner: PATIENT._id,
  //   state: 'Draft',
  //   emission: {
  //     startDate: daysAgo(200),
  //     dueDate: daysAgo(100),
  //     endDate: daysAgo(98),
  //   }
  // },
  // {
  //   _id: 'task3~user1',
  //   type: 'task',
  //   user: OFFLINE_USER.username,
  //   owner: PATIENT._id,
  //   state: 'Completed',
  //   emission: {
  //     startDate: daysAgo(200),
  //     dueDate: daysAgo(100),
  //     endDate: daysAgo(50),
  //   }
  // },
  {
    _id: 'task4~user1',
    type: 'task',
    user: OFFLINE_USER.username,
    owner: PATIENT._id,
    state: 'Completed',
    emission: {
      startDate: daysAgo(200),
      dueDate: daysAgo(100),
      endDate: daysAgo(100),
    }
  },
  // {
  //   _id: 'task1~user2',
  //   type: 'task',
  //   user: 'org.couchdb.user:user2',
  //   owner: PATIENT._id,
  //   state: 'Ready',
  //   emission: {
  //     startDate: daysAgo(200),
  //     dueDate: daysAgo(100),
  //     endDate: daysAgo(10),
  //   }
  // },
  // {
  //   _id: 'task2~user2',
  //   type: 'task',
  //   user: 'org.couchdb.user:user2',
  //   owner: PATIENT._id,
  //   state: 'Ready',
  //   emission: {
  //     startDate: daysAgo(200),
  //     dueDate: daysAgo(100),
  //     endDate: daysAgo(150),
  //   }
  // },
  // {
  //   _id: 'task3~user2',
  //   type: 'task',
  //   user: 'org.couchdb.user:user2',
  //   owner: PATIENT._id,
  //   state: 'Failed',
  //   emission: {
  //     startDate: daysAgo(200),
  //     dueDate: daysAgo(100),
  //     endDate: daysAgo(58),
  //   }
  // },
  // {
  //   _id: 'task4~user2',
  //   type: 'task',
  //   user: 'org.couchdb.user:user2',
  //   owner: PATIENT._id,
  //   state: 'Failed',
  //   emission: {
  //     startDate: daysAgo(200),
  //     dueDate: daysAgo(100),
  //     endDate: daysAgo(62),
  //   }
  // },
];
const purgeFn = function(userCtx, contact, reports, messages) {
  const ids = [];

  if (userCtx.roles.includes('purge_reverse')) {
    ids.push(...reports.filter(r => !r.fields.to_be_purged).map(r => r._id));
    ids.push(...messages.filter(r => !r.fields.to_be_purged).map(r => r._id));
  } else {
    ids.push(...reports.filter(r => r.fields.to_be_purged).map(r => r._id));
    ids.push(...messages.filter(r => r.fields.to_be_purged).map(r => r._id));
  }

  return ids;
};

const purgeSettings = {
  fn: purgeFn.toString(),
  text_expression: 'every 1 seconds'
};

const purgeDryRun = (purgeConfig) => {
  return utils.request({
    path: '/api/v1/purging-config/dry-run',
    method: 'POST',
    body: purgeConfig,
    headers: { 'Content-Type': 'application/json' }
  });
};
const restartSentinel = () => utils.stopSentinel().then(() => utils.startSentinel());

describe('Purging Config Controller', () => {
  describe('dry-run', () => {
    before(async () => {
      await utils.revertDb([], true);
      await utils.deleteUsers(await utils.getCreatedUsers());
      await utils.saveDocs([DISTRICT_HOSPITAL, HEALTH_CENTER, CLINIC, PATIENT]);
      await utils.createUsers([OFFLINE_USER]);
      await utils.saveDocs(docs);
      await utils.saveDocs(tasks);
    });
    beforeEach(async () => {
    });

    afterEach(async () => {
    });

    after(async () => {
      await utils.revertDb([], true);
      await sentinelUtils.deletePurgeDbs();
      await utils.deleteUsers([OFFLINE_USER]);
    });

    it.skip('fails when no purge function is provided', async () => {
      const response = await purgeDryRun({ text_expression: 'every 1 seconds' });
      console.log(response);
    });

    it('responds with total counts when no existing purge config', async () => {
      // await utils.updateSettings({ purge: purgeSettings }, true);
      const {
        next_run,
        wont_change_count,
        will_purge_count,
        will_unpurge_count
      } = await purgeDryRun(purgeSettings);
      expect(will_purge_count).to.equal(8);
      expect(will_unpurge_count).to.equal(0);
      expect(wont_change_count).to.equal(12);
      expect(new Date(next_run)).to.be.within(
        moment().subtract(1, 'second').toDate(),
        moment().add(5, 'minutes').toDate()
      );
    });


    describe('with existing purge config', () => {
      it.skip('responds 0 counts when submitting existing purge config', async () => {
        const seq = await sentinelUtils.getCurrentSeq();
        await utils.updateSettings({ purge: purgeSettings }, true);
        await restartSentinel();
        await sentinelUtils.waitForPurgeCompletion(seq);
        const {
          next_run,
          wont_change_count,
          will_purge_count,
          will_unpurge_count
        } = await purgeDryRun(purgeSettings);
        // expect(will_purge_count).to.equal(0);
        expect(will_unpurge_count).to.equal(0);
        expect(wont_change_count).to.equal(0);
        expect(new Date(next_run)).to.be.within(
          moment().subtract(1, 'second').toDate(),
          moment().add(5, 'minutes').toDate()
        );
      });

    });
  });
});
