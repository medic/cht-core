const { expect } = require('chai');

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-memory'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const {
  mockReport,
  mockHierarchy,
  parentsToLineage,
} = require('./mock-hierarchies');

const fetchDocWithoutRev = async (db, docId) => {
  const result = await db.get(docId);
  delete result._rev;
  return result;
};

describe('mocks', () => {
  const pouchDb = new PouchDB('test', { adapter: 'memory' });
  const get = async docId => fetchDocWithoutRev(pouchDb, docId);

  after(async () => pouchDb.destroy());

  describe('mockHierarchy', () => {
    before(async () => {
      await mockHierarchy(pouchDb, {
        district_1: {
          health_center_1: {
            clinic_1: {
              patient_1: {},
              patient_2: {},
            },
          },
          health_center_2: {},
        }
      });
    });

    it('district_1', async () => expect(await get('district_1')).to.deep.eq({
      _id: 'district_1',
      type: 'district_hospital',
      contact: {
        _id: 'district_1_contact',
        parent: { _id: 'district_1' },
      },
    }));

    it('health_center_1', async () => expect(await get('health_center_1')).to.deep.eq({
      _id: 'health_center_1',
      type: 'health_center',
      contact: {
        _id: 'health_center_1_contact',
        parent: {
          _id: 'health_center_1',
          parent: { _id: 'district_1' },
        },
      },    
      parent: { _id: 'district_1' },
    }));

    it('patient_2', async () => expect(await get('patient_2')).to.deep.eq({
      _id: 'patient_2',
      type: 'person',
      parent: {
        _id: 'clinic_1',
        parent: {
          _id: 'health_center_1',
          parent: { _id: 'district_1' },
        },
      },
    }));
  });

  describe('mockReport', () => {
    before(async () => {
      await mockReport(pouchDb, {
        id: 'report_1',
        creatorId: 'health_center_1_contact',
      });
    });

    it('report_1', async () => expect(await get('report_1')).to.deep.eq({
      _id: 'report_1',
      type: 'data_record',
      form: 'foo',
      contact: {
        _id: 'health_center_1_contact',
        parent: {
          _id: 'health_center_1',
          parent: { _id: 'district_1' },
        },
      },
    }));
  });

  describe('parentsToLineage', () => {
    it('empty', () => expect(parentsToLineage()).to.be.undefined);

    it('basic case', () => expect(parentsToLineage('1', '2')).to.deep.eq({
      _id: '1',
      parent: {
        _id: '2',
        parent: undefined,
      }
    }));
  });
});