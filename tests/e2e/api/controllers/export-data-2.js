const utils = require('../../../utils');

describe('Export Data V2.0', () => {

  afterAll(utils.deleteAllDocsNative);

  describe('GET|POST /api/v2/export/reports', () => {
    const docs = [{
      _id: 'export-data-2-test-doc-1',
      form: 'a',
      type: 'data_record',
      patient_id: 'abc123',
      reported_date: Date.UTC(2018, 1, 1),
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
      reported_date: Date.UTC(2018, 1, 2),
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
      reported_date: Date.UTC(2018, 1, 3),
      fields: {
        baz: 'bazVal',
      }
    }];
    beforeAll(() => utils.saveDocs(docs));

    it('Returns all reports that exist in the system', () =>
      utils.request({ path: '/api/v2/export/reports' }).then(result => {
        const rows = result.split('\n');
        rows.pop(); // Last row is empty string, discard
        const expected = [
          '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,bar,baz,foo,smang.smong', // eslint-disable-line max-len
          '"export-data-2-test-doc-3","b","abc125",1517616000000,,,,,,,"bazVal",,',
          '"export-data-2-test-doc-2","a","abc124",1517529600000,,,,,,"barVal2",,"fooVal2","smangsmongVal2"',
          '"export-data-2-test-doc-1","a","abc123",1517443200000,,,,,,"barVal",,"fooVal","smangsmongVal"',
        ];
        expect(rows.length).toBe(expected.length);
        expect(rows[0]).toBe(expected[0]);
        rows.splice(1).forEach(row => {
          expect(expected).toContain(row);
        });
      }));
    it('POST Filters by form', () =>
      utils.request({
        method: 'POST',
        path: '/api/v2/export/reports',
        body: {
          filters: {
            forms: {
              selected: [{code: 'b'}]
            }
          }
        }}).then(result => {
        const rows = result.split('\n');
        rows.pop(); // Last row is empty string, discard
        const expected = [
          '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,baz', // eslint-disable-line max-len
          '"export-data-2-test-doc-3","b","abc125",1517616000000,,,,,,"bazVal"'
        ];
        expect(rows.length).toBe(2);
        expect(rows).toEqual(expected);
      }));
    it('GET Filters by date', () => {
      const from = Date.UTC(2018,1,2,12);
      const to = Date.UTC(2018,1,3,12);
      return utils.request(`/api/v2/export/reports?` +
        `filters%5Bsearch%5D=&filters%5Bdate%5D%5Bfrom%5D=${from}&filters%5Bdate%5D%5Bto%5D=${to}`,
      {notJson: true}
      ).then(result => {
        const rows = result.split('\n');
        rows.pop(); // Last row is empty string, discard

        const expected = [
          '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,bar,baz,foo,smang.smong', // eslint-disable-line max-len
          '"export-data-2-test-doc-3","b","abc125",1517616000000,,,,,,,"bazVal",,'
        ];
        expect(rows.length).toBe(2);
        expect(rows).toEqual(expected);
      });
    });
  });
  describe('Weird data', () => {
    beforeAll(() => utils.saveDoc({
      _id: 'export-data-2-test-doc-4',
      form: 'weird-data-types',
      type: 'data_record',
      fields: {
        wd_array: [0,1,2],
        wd_emptyString: '',
        wd_false: false,
        wd_naughtyArray: [0, {foo: false, bar: null}, 'Hello, "world"'],
        wd_naughtyString: 'Woah there, "Jimmy O\'Tool"',
        wd_null: null,
        wd_zero: 0,
      }
    }));

    it('Outputs weird data types correctly', () =>
      utils.request({
        method: 'POST',
        path: '/api/v2/export/reports',
        body: {
          filters: {
            forms: {
              selected: [{code: 'weird-data-types'}]
            }
          }
        }}).then(result => {
        const rows = result.split('\n');
        rows.pop(); // Last row is empty string, discard
        //
        // NB: if you have to debug this test failing, note that the test
        // runner will not output the escaped string values correctly to the
        // console. You can rely on its output to debug the problem.
        //
        const expected = [
          '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,wd_array,wd_emptyString,wd_false,wd_naughtyArray,wd_naughtyString,wd_null,wd_zero', // eslint-disable-line max-len
          '"export-data-2-test-doc-4","weird-data-types",,"",,,,,,"[0,1,2]","",false,"[0,{\\"foo\\":false,\\"bar\\":null},\\"Hello, \\\\"world\\\\"\\"]","Woah there, \\"Jimmy O\'Tool\\"",,0', // eslint-disable-line max-len
        ];
        expect(rows.length).toBe(2);
        expect(rows).toEqual(expected);
      }));
  });
});
