const utils = require('../../../utils');

describe('Export Data V2.0', () => {

  const docs = [{
    _id: 'export-data-2-test-doc-1',
    form: 'a',
    type: 'data_record',
    patient_id: 'abc123',
    fields: {
      foo: 'fooVal',
      bar: 'barVal',
      smang: {
        smong: 'smangsmongVal'
      }
    }
  }, {
    _id: 'export-data-2-test-doc-2',
    form: 'a',
    type: 'data_record',
    patient_id: 'abc124',
    fields: {
      foo: 'fooVal2',
      bar: 'barVal2',
      smang: {
        smong: 'smangsmongVal2'
      }
    }
  }, {
    _id: 'export-data-2-test-doc-3',
    form: 'b',
    type: 'data_record',
    patient_id: 'abc125',
    fields: {
      baz: 'bazVal',
    }
  }];

  beforeAll(() => utils.saveDocs(docs));
  afterAll(utils.deleteAllDocs);

  describe('GET|POST /api/v2/export/reports', () => {
    it('Returns all reports that exist in the system', () =>
      utils.request('/api/v2/export/reports', {notJson: true}).then(result => {
        const rows = result.split('\n');
        rows.pop(); // Last row is empty string, discard
        const expected = [
          '_id,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,bar,baz,foo,smang.smong',
          'export-data-2-test-doc-3,abc125,,,,,,,,bazVal,,',
          'export-data-2-test-doc-2,abc124,,,,,,,barVal2,,fooVal2,smangsmongVal2',
          'export-data-2-test-doc-1,abc123,,,,,,,barVal,,fooVal,smangsmongVal'
        ];
        expect(rows.length).toBe(4);
        expect(rows[0]).toBe(expected[0]);
        rows.splice(1).forEach(row => {
          expect(expected).toContain(row);
        });
      }));
    it('Filters by form', () =>
      utils.request({
        method: 'POST',
        path: '/api/v2/export/reports',
        headers: {
          'content-type': 'application/json'
        },
        body: {
          filters: {
            forms: {
              selected: [{code: 'b'}]
            }
          }
        }}, {
          notJson: true
        }).then(result => {
          const rows = result.split('\n');
          rows.pop(); // Last row is empty string, discard
          const expected = [
            '_id,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,baz',
            'export-data-2-test-doc-3,abc125,,,,,,,bazVal'
          ];
          expect(rows.length).toBe(2);
          expect(rows).toEqual(expected);
        }));
  });
});
