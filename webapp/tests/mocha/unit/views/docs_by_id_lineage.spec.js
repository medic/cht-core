const expect = require('chai').expect;
const utils = require('./utils');
const map = utils.loadView('medic-client', 'docs_by_id_lineage');

describe('docs_by_id_lineage view', () => {
  beforeEach(() => {
    map.reset();
  });
  describe('data_record lineage', () => {
    it('does not emit if doc is not a report', () => {
      const doc = {
        _id: 'messsage',
        type: 'data_record',
        sms_message: { }
      };

      const result = map(doc, true);
      expect(result.length).to.equal(0);
    });
    it('emits report document for depth 0', () => {
      const doc = {
        _id: 'report',
        type: 'data_record',
        form: 'form',
      };

      const result = map(doc, true);
      console.log(result);
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal({ key: [ 'report', 0 ], value: undefined });
    });

    it('emits contact lineage for depth 1+', () => {
      const doc = {
        _id: 'report',
        type: 'data_record',
        form: 'form',
        contact: {
          _id: 'contact1',
          parent: {
            _id: 'contact2',
            parent: {
              _id: 'contact3'
            }
          }
        }
      };
      const result = map(doc, true);
      expect(result.length).to.equal(4);
      expect(result[0]).to.deep.equal({ key: [ 'report', 0 ], value: undefined });
      expect(result[1]).to.deep.equal({ key: [ 'report', 1 ], value: { _id: 'contact1' }});
      expect(result[2]).to.deep.equal({ key: [ 'report', 2 ], value: { _id: 'contact2' }});
      expect(result[3]).to.deep.equal({ key: [ 'report', 3 ], value: { _id: 'contact3' }});
    });

    it('does not emit lineage for empty contact parents', () => {
      const doc1 = {
        _id: 'report1',
        type: 'data_record',
        form: 'form',
        contact: {}
      };
      const result1 = map(doc1, true);
      expect(result1.length).to.equal(1);
      expect(result1[0]).to.deep.equal({ key: [ 'report1', 0 ], value: undefined });

      const doc2 = {
        _id: 'report2',
        type: 'data_record',
        form: 'form',
        contact: {
          _id: 'contact1',
          parent: {}
        }
      };

      map.reset();
      const result2 = map(doc2, true);
      expect(result2.length).to.equal(2);
      expect(result2[0]).to.deep.equal({ key: [ 'report2', 0 ], value: undefined });
      expect(result2[1]).to.deep.equal({ key: [ 'report2', 1 ], value: { _id: 'contact1' }});

      const doc3 = {
        _id: 'report3',
        type: 'data_record',
        form: 'form',
        contact: {
          _id: 'contact1',
          parent: {
            _id: 'contact2',
            parent: {}
          }
        }
      };
      map.reset();
      const result3 = map(doc3, true);
      expect(result3.length).to.equal(3);
      expect(result3[0]).to.deep.equal({ key: [ 'report3', 0 ], value: undefined });
      expect(result3[1]).to.deep.equal({ key: [ 'report3', 1 ], value: { _id: 'contact1' }});
      expect(result3[2]).to.deep.equal({ key: [ 'report3', 2 ], value: { _id: 'contact2' }});
    });
  });

  describe('contacts lineage', () => {
    it('emits lineage for type `person`, `clinic`, `health_center` and `district_hospital`', () => {
      const person = { _id: 'person', type: 'person' };
      const result = map(person, true);
      expect(result.length).to.equal(1);
      expect(result[0]).to.deep.equal({ key: [ 'person', 0 ], value: { _id: 'person' }});

      map.reset();
      const clinic = { _id: 'clinic', type: 'clinic' };
      const resultClinic = map(clinic, true);
      expect(resultClinic.length).to.equal(1);
      expect(resultClinic[0]).to.deep.equal({ key: [ 'clinic', 0 ], value: { _id: 'clinic' }});

      map.reset();
      const healthCenter = { _id: 'healthCenter', type: 'health_center' };
      const resultHealthCenter = map(healthCenter, true);
      expect(resultHealthCenter.length).to.equal(1);
      expect(resultHealthCenter[0]).to.deep.equal({ key: [ 'healthCenter', 0 ], value: { _id: 'healthCenter' }});

      map.reset();
      const districtHospital = { _id: 'districtHospital', type: 'district_hospital' };
      const resultdistrictHospital = map(districtHospital, true);
      expect(resultdistrictHospital.length).to.equal(1);
      expect(resultdistrictHospital[0])
        .to.deep.equal({ key: [ 'districtHospital', 0 ], value: { _id: 'districtHospital' }});
    });

    it('emits full lineage', () => {
      const checkLineage = (result, key) => {
        if (key > 0) {
          expect(result).to.deep.equal({ key: [ 'person', key ], value: { _id: `parent${key}` }});
        } else {
          expect(result).to.deep.equal({ key: [ 'person', 0 ], value: { _id: 'person' }});
        }
      };
      for (let depth = 1; depth < 10; depth++) {
        const doc = { _id: 'person', type: 'person', parent: {} };
        let currentParent = doc.parent;
        for (let i = 1; i <= depth; i++) {
          currentParent._id = `parent${i}`;
          currentParent.parent = {};
          currentParent = currentParent.parent;
        }

        map.reset();
        const results = map(doc, true);
        expect(results.length).to.equal(depth + 1);
        results.forEach(checkLineage);
      }
    });

    it('does not emit lineage for empty parents', () => {
      const doc1 = {
        _id: 'contact1',
        type: 'person',
        parent: {}
      };
      const result1 = map(doc1, true);
      expect(result1.length).to.equal(1);
      expect(result1[0]).to.deep.equal({ key: [ 'contact1', 0 ], value: { _id: 'contact1'} });

      const doc2 = {
        _id: 'contact2',
        type: 'person',
        parent: {
          _id: 'contact3',
          parent: {}
        }
      };
      map.reset();
      const result2 = map(doc2, true);
      expect(result2.length).to.equal(2);
      expect(result2[0]).to.deep.equal({ key: [ 'contact2', 0 ], value: { _id: 'contact2' }});
      expect(result2[1]).to.deep.equal({ key: [ 'contact2', 1 ], value: { _id: 'contact3' }});

      const doc3 = {
        _id: 'contact3',
        type: 'person',
        parent: {
          _id: 'contact4',
          parent: {
            _id: 'contact5',
            parent: {}
          }
        }
      };
      map.reset();
      const result3 = map(doc3, true);
      expect(result3.length).to.equal(3);
      expect(result3[0]).to.deep.equal({ key: [ 'contact3', 0 ], value: { _id: 'contact3' }});
      expect(result3[1]).to.deep.equal({ key: [ 'contact3', 1 ], value: { _id: 'contact4' }});
      expect(result3[2]).to.deep.equal({ key: [ 'contact3', 2 ], value: { _id: 'contact5' }});
    });
  });
});
