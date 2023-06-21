const chai = require('chai');
const sinon = require('sinon');
const moment = require('moment');

const db = require('../../../src/db');
const service = require('../../../src/services/purging-config');

describe.only('Purging Config service', () => {
  beforeEach(() => {
    const queryMedic = sinon.stub(db, 'queryMedic');
    // TODO: add realistic data
    queryMedic.withArgs('medic-client/contacts_by_type').resolves({
      rows: [{
        'id': 'cea8def0-de87-4d85-b1dd-3164e7709b18',
        'key': ['clinic'],
        'value': 'false false 2 not-yet pregnant woman\'s household',
        'doc': {
          '_id': 'cea8def0-de87-4d85-b1dd-3164e7709b18',
          '_rev': '2-d07c1aa3d03aabee6f3af1a50bfd969a',
          'parent': {
            '_id': '12904ae9-8f6d-4655-abc5-6822d732a926',
            'parent': {'_id': 'a092a9bc-940d-42cf-b0da-cff33d96bb40'}
          },
          'type': 'clinic',
          'is_name_generated': 'true',
          'name': 'not-yet pregnant woman\'s Household',
          'external_id': '',
          'notes': '',
          'contact': {
            '_id': '0c436b39-9a09-473c-bced-a7b7ebeabf7d',
            'parent': {
              '_id': '12904ae9-8f6d-4655-abc5-6822d732a926',
              'parent': {'_id': 'a092a9bc-940d-42cf-b0da-cff33d96bb40'}
            }
          },
          'geolocation': '',
          'meta': {
            'created_by': 'supervisor',
            'created_by_person_uuid': '4c6e1461-c057-4288-aa32-550153166495',
            'created_by_place_uuid': '12904ae9-8f6d-4655-abc5-6822d732a926'
          },
          'reported_date': 1679552077626,
          'place_id': '68184'
        }
      }, {
        'id': '0f78de21-33b3-4506-9840-96b5488516b0',
        'key': ['district_hospital'],
        'value': 'false false 0 mokhtar\'s health facility',
        'doc': {
          '_id': '0f78de21-33b3-4506-9840-96b5488516b0',
          '_rev': '2-cdb1e2f771d6151bc077cbe20775cd26',
          'parent': '',
          'type': 'district_hospital',
          'is_name_generated': 'true',
          'name': 'Mokhtar\'s Health Facility',
          'external_id': '',
          'notes': '',
          'contact': {
            '_id': '4d9345f8-1330-47b2-a244-e830a031f17b',
            'parent': {'_id': '0f78de21-33b3-4506-9840-96b5488516b0'}
          },
          'geolocation': '',
          'meta': {'created_by': 'admin', 'created_by_person_uuid': '', 'created_by_place_uuid': ''},
          'reported_date': 1674050191443,
          'place_id': '80238'
        }
      }, {
        'id': 'a092a9bc-940d-42cf-b0da-cff33d96bb40',
        'key': ['district_hospital'],
        'value': 'false false 0 groot\'s health facility',
        'doc': {
          '_id': 'a092a9bc-940d-42cf-b0da-cff33d96bb40',
          '_rev': '2-3edde63696b1b285394eebaa3f7ef546',
          'parent': '',
          'type': 'district_hospital',
          'is_name_generated': 'true',
          'name': 'Groot\'s Health Facility',
          'external_id': '',
          'notes': '',
          'contact': {
            '_id': 'b35f1f22-da16-4d59-a2ad-af0d80a50d45',
            'parent': {'_id': 'a092a9bc-940d-42cf-b0da-cff33d96bb40'}
          },
          'geolocation': '',
          'meta': {'created_by': 'admin', 'created_by_person_uuid': '', 'created_by_place_uuid': ''},
          'reported_date': 1671095634199,
          'place_id': '55025'
        }
      }, {
        'id': '0b1c9d5c-77b0-4f88-a6e1-32e5a9e88bd2',
        'key': ['health_center'],
        'value': 'false false 1 health_center test 9\'s area',
        'doc': {
          '_id': '0b1c9d5c-77b0-4f88-a6e1-32e5a9e88bd2',
          '_rev': '2-1ab3f775b1b8ab3303633dd64df30011',
          'parent': {'_id': 'a092a9bc-940d-42cf-b0da-cff33d96bb40'},
          'type': 'health_center',
          'is_name_generated': 'true',
          'name': 'health_center test 9\'s Area',
          'external_id': '',
          'notes': '',
          'contact': {
            '_id': '42059551-0dff-4079-aad3-651de50acf33',
            'parent': {
              '_id': '0b1c9d5c-77b0-4f88-a6e1-32e5a9e88bd2',
              'parent': {'_id': 'a092a9bc-940d-42cf-b0da-cff33d96bb40'}
            }
          },
          'geolocation': '',
          'meta': {
            'created_by': 'supervisor',
            'created_by_person_uuid': 'b35f1f22-da16-4d59-a2ad-af0d80a50d45',
            'created_by_place_uuid': 'a092a9bc-940d-42cf-b0da-cff33d96bb40'
          },
          'reported_date': 1672221509179,
          'place_id': '20862'
        }
      }, {
        'id': '12904ae9-8f6d-4655-abc5-6822d732a926',
        'key': ['health_center'],
        'value': 'false false 1 chw test\'s area',
        'doc': {
          '_id': '12904ae9-8f6d-4655-abc5-6822d732a926',
          '_rev': '2-ce5c5e79aeb8a60a84b5be2497747fcf',
          'parent': {'_id': 'a092a9bc-940d-42cf-b0da-cff33d96bb40'},
          'type': 'health_center',
          'is_name_generated': 'true',
          'name': 'CHW test\'s Area',
          'external_id': '',
          'notes': '',
          'contact': {
            '_id': '4c6e1461-c057-4288-aa32-550153166495',
            'parent': {'_id': 'a092a9bc-940d-42cf-b0da-cff33d96bb40'}
          },
          'geolocation': '',
          'meta': {
            'created_by': 'supervisor',
            'created_by_person_uuid': 'b35f1f22-da16-4d59-a2ad-af0d80a50d45',
            'created_by_place_uuid': 'a092a9bc-940d-42cf-b0da-cff33d96bb40'
          },
          'reported_date': 1675784273738,
          'place_id': '16070'
        }
      }, {
        'id': '46031fd7-9e95-49e8-a70c-e382ecfbbde7',
        'key': ['health_center'],
        'value': 'false false 1 health_center test 7\'s area',
        'doc': {
          '_id': '46031fd7-9e95-49e8-a70c-e382ecfbbde7',
          '_rev': '2-47136682ebd4af9f0761d917df68e50a',
          'parent': {'_id': 'a092a9bc-940d-42cf-b0da-cff33d96bb40'},
          'type': 'health_center',
          'is_name_generated': 'true',
          'name': 'health_center test 7\'s Area',
          'external_id': '',
          'notes': '',
          'contact': {
            '_id': '120c03d6-6377-4ead-8c1a-06124d315e86',
            'parent': {
              '_id': '46031fd7-9e95-49e8-a70c-e382ecfbbde7',
              'parent': {'_id': 'a092a9bc-940d-42cf-b0da-cff33d96bb40'}
            }
          },
          'geolocation': '',
          'meta': {
            'created_by': 'supervisor',
            'created_by_person_uuid': 'b35f1f22-da16-4d59-a2ad-af0d80a50d45',
            'created_by_place_uuid': 'a092a9bc-940d-42cf-b0da-cff33d96bb40'
          },
          'reported_date': 1672221086211,
          'place_id': '50246'
        },
      }],
    });
    queryMedic.withArgs('medic/tasks_in_terminal_state').resolves({ rows: [] });
    queryMedic.withArgs('medic/docs_by_replication_key').resolves({ rows: [] });
    queryMedic.withArgs('allDocs').resolves({ rows: []} );
    sinon.stub(db.medic, 'query').withArgs('medic/docs_by_replication_key').resolves({ rows: []} );
    sinon.stub(db.medic, 'allDocs').resolves({ rows: []} );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('dryRun', () => {

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
        fn: purgeFn.toString(),
      };

      const { wontChangeCount, willPurgeCount, willUnpurgeCount, nextRun } = await service.dryRun(appSettingsPurge);
      chai.expect(wontChangeCount).to.equal(0);
      chai.expect(willPurgeCount).to.equal(0);
      chai.expect(willUnpurgeCount).to.equal(0);
      const expectedNextRun = moment().utc().isoWeekday(6).hours(22).minutes(0).seconds(0).milliseconds(0);
      chai.expect(nextRun).to.equal(expectedNextRun.toISOString());
    });
  });
});
