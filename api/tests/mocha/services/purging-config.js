const chai = require('chai');
const sinon = require('sinon');
const moment = require('moment');

const db = require('../../../src/db');
const config = require('../../../src/config');
const service = require('../../../src/services/purging-config');

describe.only('Purging Config service', () => {
  const queryMedic = sinon.stub(db, 'queryMedic');
  const medicQuery = sinon.stub(db.medic, 'query');
  const medicAllDocs = sinon.stub(db.medic, 'allDocs');
  const usersAllDoc = sinon.stub(db.users, 'allDocs');

  beforeEach(() => {
    queryMedic.withArgs('medic-client/contacts_by_type').resolves({ rows: [] });
    queryMedic.withArgs('medic/tasks_in_terminal_state').resolves({ rows: [] });
    queryMedic.withArgs('medic/docs_by_replication_key').resolves({ rows: [] });
    queryMedic.withArgs('allDocs').resolves({ rows: []} );
    medicQuery.withArgs('medic/docs_by_replication_key').resolves({ rows: []} );
    medicAllDocs.resolves({ rows: [] });

    // set up user roles for `getRoles()`
    const users = [
      {
        doc: { roles: ['chw_supervisor'] },
      },
      {
        doc: { roles: ['chw'] },
      },
    ];
    usersAllDoc.resolves({ rows: users });
    sinon.stub(config, 'get').withArgs('roles').returns({
      'chw_supervisor': {
        'name': 'usertype.chw-supervisor',
        'offline': true
      },
      'chw': {
        'name': 'usertype.chw',
        'offline': true
      },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('dryRun', () => {
    // contacts and their records
    const contactsByType = [
      {
        'id': '99fdffb8-24c7-4ed9-bf42-653319303d3a',
        'key': ['person'],
        'doc': {
          '_id': '99fdffb8-24c7-4ed9-bf42-653319303d3a',
          'type': 'person',
          'reported_date': 1687340071251,
          'patient_id': '78645'
        }
      }
    ];
    queryMedic
      .withArgs('medic-client/contacts_by_type', { include_docs: true })
      .resolves({ rows: contactsByType });
    const subjectIds = [contactsByType[0].doc._id, contactsByType[0].doc.patient_id];
    const contactsRecords = [
      {
        id: '47e96922-eb98-4208-b226-870f482e3bf8',
        key: '99fdffb8-24c7-4ed9-bf42-653319303d3a',
        value: {
          type: 'data_record',
          subject: '99fdffb8-24c7-4ed9-bf42-653319303d3a',
          submitter: '4c6e1461-c057-4288-aa32-550153166495'
        }
      },
    ];
    medicQuery
      .withArgs('medic/docs_by_replication_key', sinon.match({ keys: subjectIds }))
      .resolves({ rows: contactsRecords });
    const pregnancyRecord = {
      doc: {
        '_id': '47e96922-eb98-4208-b226-870f482e3bf8',
        'form': 'pregnancy',
        'type': 'data_record',
        'reported_date': moment().subtract(7, 'days').valueOf(),
        'contact': {
          '_id': '4c6e1461-c057-4288-aa32-550153166495',
        },
        'fields': {
          'patient_uuid': '99fdffb8-24c7-4ed9-bf42-653319303d3a',
        },
      },
    };
    medicAllDocs
      .withArgs({ keys: ['47e96922-eb98-4208-b226-870f482e3bf8'], include_docs: true })
      .resolves({ rows: [pregnancyRecord] });

    // unallocated records
    const unallocatedRecords = [
      {
        id: 'abc',
        doc: {
          _id: 'abc',
          reported_date: moment().subtract(7, 'days').valueOf(),
          form: 'pregnancy',
        },
      },
    ];
    queryMedic
      .withArgs('medic/docs_by_replication_key', { key: JSON.stringify('_unassigned'), include_docs: true })
      .resolves({ rows: unallocatedRecords });

    // tasks
    const tasks = [
      {
        // eslint-disable-next-line max-len
        id: 'task~org.couchdb.user:supervisor~5e896367-3284-49c9-bd6b-46fe5adf9f97~pregnancy-home-visit-week40~anc.pregnancy_home_visit.known_lmp~1675784875760',
        key: moment().subtract(61, 'days').format('YYYY-MM-DD'), // 60 days = TASK_EXPIRATION_PERIOD
        value: null
      }
    ];
    queryMedic
      .withArgs('medic/tasks_in_terminal_state', {
        start_key: JSON.stringify(''),
        end_key: sinon.match(/^"\d{4}-\d{2}-\d{2}"$/),
      })
      .resolves({ rows: tasks });

    // targets
    const targets = [];
    queryMedic
      .withArgs('allDocs', {
        start_key: JSON.stringify('target~'),
        end_key: sinon.match(/^"target~\d{4}-\d{2}~"$/),
      })
      .resolves({ rows: targets });

    it('should return the count of purgeable documents and when the next run would happen', async () => {
      const purgeFn = (userCtx, contact, reports) => {
        // purge documents older than 7 days old
        const daysToPurge = 7;
        const oldReportedDate = Date.now() - (1000 * 60 * 60 * 24 * daysToPurge);

        return reports
          .filter(r => r.reported_date <= oldReportedDate)
          .map(report => report._id);
      };
      const appSettingsPurge = {
        run_every_days: 7,
        cron: '0 22 * * SAT',
        // text_expression: 'at 10:00 pm on saturday',
        fn: purgeFn.toString(),
      };

      const { wontChangeCount, willPurgeCount, willUnpurgeCount, nextRun } = await service.dryRun(appSettingsPurge);
      chai.expect(wontChangeCount).to.equal(2);
      chai.expect(willPurgeCount).to.equal(6);
      chai.expect(willUnpurgeCount).to.equal(0);
      const expectedNextRun = moment().utc().isoWeekday(6).hours(22).minutes(0).seconds(0).milliseconds(0);
      chai.expect(nextRun).to.equal(expectedNextRun.toISOString());
    });
  });
});
