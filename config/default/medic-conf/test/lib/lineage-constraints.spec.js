const { expect } = require('chai');
const rewire = require('rewire');
const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-memory'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const { mockHierarchy } = require('../mock-hierarchies');

const lineageConstraints = rewire('../../src/lib/lineage-constraints');
const log = require('../../src/lib/log');
log.level = log.LEVEL_INFO;

describe('lineage constriants', () => {
  describe('getHierarchyErrors', () => {
    const scenario = async (contact_types, contactType, parentType) => {
      const mockDb = { get: () => ({ settings: { contact_types } }) };
      const { getHierarchyErrors } = await lineageConstraints(mockDb, { type: parentType });
      return getHierarchyErrors({ type: contactType });
    };

    it('empty rules yields error', async () => expect(await scenario([], 'person', 'health_center')).to.include('unknown type'));

    it('no valid parent yields error', async () => expect(await scenario([undefined], 'person', 'health_center')).to.include('unknown type'));

    it('valid parent yields no error', async () => {
      const actual = await scenario([{
        id: 'person',
        parents: ['health_center'],
      }], 'person', 'health_center');

      expect(actual).to.be.undefined;
    });

    it('no contact type yields undefined error', async () => expect(await scenario([])).to.include('undefined'));

    it('no parent type yields undefined error', async () => expect(await scenario([], 'person')).to.include('undefined'));

    it('no valid parents yields not defined', async () => expect(await scenario([{
      id: 'person',
      parents: ['district_hospital'],
    }], 'person', 'health_center')).to.include('cannot have parent of type'));

    it('no settings doc requires valid parent type', async () => {
      const mockDb = { get: () => { throw { name: 'not_found' }; } };
      const { getHierarchyErrors } = await lineageConstraints(mockDb, { type: 'dne' });
      const actual = getHierarchyErrors({ type: 'person' });
      expect(actual).to.include('cannot have parent of type');
    });

    it('no settings doc requires valid contact type', async () => {
      const mockDb = { get: () => { throw { name: 'not_found' }; } };
      const { getHierarchyErrors } = await lineageConstraints(mockDb, { type: 'clinic' });
      const actual = getHierarchyErrors({ type: 'dne' });
      expect(actual).to.include('unknown type');
    });

    it('no settings doc yields not defined', async () => {
      const mockDb = { get: () => { throw { name: 'not_found' }; } };
      const { getHierarchyErrors } = await lineageConstraints(mockDb, { type: 'clinic' });
      const actual = getHierarchyErrors({ type: 'person' });
      expect(actual).to.be.undefined;
    });

    describe('default schema', () => {
      it('no defined rules enforces defaults schema', async () => expect(await scenario(undefined, 'district_hospital', 'health_center')).to.include('cannot have parent'));
      
      it('nominal case', async () => expect(await scenario(undefined, 'person', 'health_center')).to.be.undefined);

      it('can move district_hospital to root', async () => {
        const mockDb = { get: () => ({ settings: { } }) };
        const { getHierarchyErrors } = await lineageConstraints(mockDb, undefined);
        const actual = getHierarchyErrors({ type: 'district_hospital' });
        expect(actual).to.be.undefined;
      });
    });
  });

  describe('getPrimaryContactViolations', () => {
    const getHierarchyErrors = lineageConstraints.__get__('getPrimaryContactViolations');

    describe('on memory pouchdb', async () => {
      let pouchDb, scenarioCount = 0;
      beforeEach(async () => {
        pouchDb = new PouchDB(`lineage${scenarioCount++}`, { adapter: 'memory' });

        await mockHierarchy(pouchDb, {
          district_1: {
            health_center_1: {
              clinic_1: {
                patient_1: {},
              },
            },
          },
          district_2: {
            health_center_2: {
              clinic_2: {
                patient_2: {},
              },
            },
          },
        });
      });
      afterEach(async () => pouchDb.destroy());

      it('cannot move clinic_1_contact to clinic_2', async () => {
        const contactDoc = await pouchDb.get('clinic_1_contact');
        const parentDoc = await pouchDb.get('clinic_2');

        const doc = await getHierarchyErrors(pouchDb, contactDoc, parentDoc, [contactDoc]);
        expect(doc).to.deep.include({ _id: 'clinic_1_contact' });
      });

      it('cannot move clinic_1_contact to root', async () => {
        const contactDoc = await pouchDb.get('clinic_1_contact');
        const doc = await getHierarchyErrors(pouchDb, contactDoc, undefined, [contactDoc]);
        expect(doc).to.deep.include({ _id: 'clinic_1_contact' });
      });

      it('can move clinic_1_contact to clinic_1', async () => {
        const contactDoc = await pouchDb.get('clinic_1_contact');
        const parentDoc = await pouchDb.get('clinic_1');

        const doc = await getHierarchyErrors(pouchDb, contactDoc, parentDoc, [contactDoc]);
        expect(doc).to.be.undefined;
      });

      it('can move health_center_2 to district_1', async () => {
        const contactDoc = await pouchDb.get('health_center_2');
        const parentDoc = await pouchDb.get('district_1');

        const descendants = await Promise.all(['health_center_2_contact', 'clinic_2', 'clinic_2_contact', 'patient_2'].map(id => pouchDb.get(id)));
        const doc = await getHierarchyErrors(pouchDb, contactDoc, parentDoc, descendants);
        expect(doc).to.be.undefined;
      });

      it('when district_1 contact is patient_1. cannot move health_center_1 to district_2', async () => {
        const district1 = await pouchDb.get('district_1');
        district1.contact._id = 'patient_1';
        await pouchDb.put(district1);

        const contactDoc = await pouchDb.get('health_center_1');
        const parentDoc = await pouchDb.get('district_2');

        const descendants = await Promise.all(['health_center_1_contact', 'clinic_1', 'clinic_1_contact', 'patient_1'].map(id => pouchDb.get(id)));
        const doc = await getHierarchyErrors(pouchDb, contactDoc, parentDoc, descendants);
        expect(doc).to.deep.include({ _id: 'patient_1' });
      });

      // It is possible that one or more parents will not be found. Since these parents are being removed, do not throw
      it('no error if parent dne', async () => {
        const contactDoc = await pouchDb.get('clinic_1_contact');
        const parentDoc = await pouchDb.get('clinic_2');

        contactDoc.parent._id = 'dne';

        const doc = await getHierarchyErrors(pouchDb, contactDoc, parentDoc, [contactDoc]);
        expect(doc).to.be.undefined;
      });
    });
  });
});
