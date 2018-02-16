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
  }, {
    _id: 'export-data-2-test-doc-4',
    form: 'weird-data-types',
    type: 'data_record',
    fields: {
      wd_array: [0,1,2],
      wd_emptyString: '',
      wd_false: false,
      wd_null: null,
      wd_zero: 0,
    }
  }];
  beforeAll(() => utils.saveDocs(docs));
  afterAll(utils.deleteAllDocs);

  fdescribe('GET|POST /api/v2/export/reports', () => {
    it('Returns all reports that exist in the system', () =>
      utils.request('/api/v2/export/reports', {notJson: true}).then(result => {
        const rows = result.split('\n');
        rows.pop(); // Last row is empty string, discard
        const expected = [
          '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,bar,baz,foo,smang.smong,wd_array.0,wd_array.1,wd_array.2,wd_emptyString,wd_false,wd_null,wd_zero',
          'export-data-2-test-doc-4,weird-data-types,,,,,,,,,,,,0,1,2,,false,,0',
          'export-data-2-test-doc-3,b,abc125,,,,,,,,bazVal,,,,,,,,,',
          'export-data-2-test-doc-2,a,abc124,,,,,,,barVal2,,fooVal2,smangsmongVal2,,,,,,,',
          'export-data-2-test-doc-1,a,abc123,,,,,,,barVal,,fooVal,smangsmongVal,,,,,,,'
        ];
        expect(rows.length).toBe(5);
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
            '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,baz',
            'export-data-2-test-doc-3,b,abc125,,,,,,,bazVal'
          ];
          expect(rows.length).toBe(2);
          expect(rows).toEqual(expected);
        }));
  });
});
