const utils = require('@utils');
const uuid = require('uuid').v4;

const getRows = (result) => {
  const rows = result.split('\n');
  const lastRow = rows.pop(); // Last row is empty string, discard
  expect(lastRow).to.equal('');
  return rows;
};

const expectRows = (expected, rows) => {
  expect(rows.length).to.equal(expected.length);
  expect(rows[0]).to.equal(expected[0]);
  expect(rows).to.have.members(expected);
};

describe('Export Data V2.0', () => {

  after(() => utils.revertDb([], true));

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
    }, {
      _id: 'export-data-2-verified',
      form: 'c',
      type: 'data_record',
      patient_id: 'abc125',
      verified: true,
      reported_date: Date.UTC(2020, 1, 3),
      fields: {
        baz: 'bazVal',
      }
    }, {
      _id: 'export-data-2-not-verified',
      form: 'c',
      type: 'data_record',
      patient_id: 'abc125',
      verified: false,
      reported_date: Date.UTC(2020, 1, 3),
      fields: {
        baz: 'bazVal',
      }
    }, {
      _id: 'export-data-2-invalid',
      form: 'c',
      type: 'data_record',
      patient_id: 'abc125',
      errors: [{ code: 'error' }],
      reported_date: Date.UTC(2020, 1, 3),
      fields: {
        baz: 'bazVal',
      }
    } ];

    before(() => utils.saveDocs(docs));

    it('Returns all reports that exist in the system', () => {
      return utils.request({ path: '/api/v2/export/reports' }).then(result => {
        const rows = getRows(result);
        const expected = [
          '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,bar,baz,foo,smang.smong', // eslint-disable-line max-len
          '"export-data-2-test-doc-3","b","abc125",1517616000000,,,,,,,"bazVal",,',
          '"export-data-2-test-doc-2","a","abc124",1517529600000,,,,,,"barVal2",,"fooVal2","smangsmongVal2"',
          '"export-data-2-test-doc-1","a","abc123",1517443200000,,,,,,"barVal",,"fooVal","smangsmongVal"',
          '"export-data-2-verified","c","abc125",1580688000000,,,,,,,"bazVal",,',
          '"export-data-2-not-verified","c","abc125",1580688000000,,,,,,,"bazVal",,',
          '"export-data-2-invalid","c","abc125",1580688000000,,,,,,,"bazVal",,',
        ];
        expectRows(expected, rows);
      });
    });

    it('POST Filters by form', () => {
      return utils.request({
        method: 'POST',
        path: '/api/v2/export/reports',
        body: {
          filters: {
            forms: {
              selected: [{code: 'b'}]
            }
          }
        }}).then(result => {
        const rows = getRows(result);
        const expected = [
          '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,baz', // eslint-disable-line max-len
          '"export-data-2-test-doc-3","b","abc125",1517616000000,,,,,,"bazVal"'
        ];
        expectRows(expected, rows);
      });
    });

    it('GET Filters by date', () => {
      const from = Date.UTC(2018, 1, 2, 12);
      const to = Date.UTC(2018, 1, 3, 12);
      return utils
        .request(
          `/api/v2/export/reports?` +
          `filters%5Bsearch%5D=&filters%5Bdate%5D%5Bfrom%5D=${from}&filters%5Bdate%5D%5Bto%5D=${to}`,
          { notJson: true }
        )
        .then(result => {
          const rows = getRows(result);
          const expected = [
            '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,bar,baz,foo,smang.smong', // eslint-disable-line max-len
            '"export-data-2-test-doc-3","b","abc125",1517616000000,,,,,,,"bazVal",,'
          ];
          expectRows(expected, rows);
        });
    });

    describe('POST filters by verified', () => {
      it('should only export not-verified reports with empty filter', async () => {
        const url = '/api/v2/export/reports?filters[verified]=';

        const result = await utils.request(url, { notJson: true });
        const rows = getRows(result);

        const expected = [
          // eslint-disable-next-line max-len
          '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,bar,baz,foo,smang.smong',
          '"export-data-2-test-doc-1","a","abc123",1517443200000,,,,,,"barVal",,"fooVal","smangsmongVal"',
          '"export-data-2-test-doc-2","a","abc124",1517529600000,,,,,,"barVal2",,"fooVal2","smangsmongVal2"',
          '"export-data-2-test-doc-3","b","abc125",1517616000000,,,,,,,"bazVal",,',
          '"export-data-2-invalid","c","abc125",1580688000000,,,,,,,"bazVal",,'
        ];
        expectRows(expected, rows);

        const urlArray = '/api/v2/export/reports?filters[verified][]=';
        const resultArray = await utils.request(urlArray, { notJson: true });
        const rowsArray = getRows(resultArray);
        expectRows(expected, rowsArray);
      });

      it('should only export verified true reports', async () => {
        const url = '/api/v2/export/reports?filters[verified]=true';

        const result = await utils.request(url, { notJson: true });
        const rows = getRows(result);
        const expected = [
          // eslint-disable-next-line max-len
          '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,bar,baz,foo,smang.smong',
          '"export-data-2-verified","c","abc125",1580688000000,,,,,,,"bazVal",,',
        ];
        expectRows(expected, rows);

        const urlArray = '/api/v2/export/reports?filters[verified][]=true';
        const resultArray = await utils.request(urlArray, { notJson: true });
        const rowsArray = getRows(resultArray);
        expectRows(expected, rowsArray);
      });

      it('should only export verified false reports', async () => {
        const url = '/api/v2/export/reports?filters[verified]=false';

        const result = await utils.request(url, { notJson: true });
        const rows = getRows(result);
        const expected = [
          // eslint-disable-next-line max-len
          '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,bar,baz,foo,smang.smong',
          '"export-data-2-not-verified","c","abc125",1580688000000,,,,,,,"bazVal",,',
        ];
        expectRows(expected, rows);

        const urlArray = '/api/v2/export/reports?filters[verified][]=false';

        const resultArray = await utils.request(urlArray, { notJson: true });
        const rowsArray = getRows(resultArray);
        expectRows(expected, rowsArray);
      });

      it('should work with multiple selection', async () => {
        const url = '/api/v2/export/reports?filters[verified][]=false&filters[verified][]=true';

        const result = await utils.request(url, { notJson: true });
        const rows = getRows(result);
        const expected = [
          // eslint-disable-next-line max-len
          '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,bar,baz,foo,smang.smong',
          '"export-data-2-not-verified","c","abc125",1580688000000,,,,,,,"bazVal",,',
          '"export-data-2-verified","c","abc125",1580688000000,,,,,,,"bazVal",,',
        ];
        expectRows(expected, rows);

        const urlAll = '/api/v2/export/reports?filters[verified][]=false&filters[verified][]=true&filters[verified][]=';
        const allResults = await utils.request(urlAll, { notJson: true });
        const allRows = getRows(allResults);
        const allExport = [
          '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,bar,baz,foo,smang.smong', // eslint-disable-line max-len
          '"export-data-2-test-doc-3","b","abc125",1517616000000,,,,,,,"bazVal",,',
          '"export-data-2-test-doc-2","a","abc124",1517529600000,,,,,,"barVal2",,"fooVal2","smangsmongVal2"',
          '"export-data-2-test-doc-1","a","abc123",1517443200000,,,,,,"barVal",,"fooVal","smangsmongVal"',
          '"export-data-2-verified","c","abc125",1580688000000,,,,,,,"bazVal",,',
          '"export-data-2-not-verified","c","abc125",1580688000000,,,,,,,"bazVal",,',
          '"export-data-2-invalid","c","abc125",1580688000000,,,,,,,"bazVal",,',
        ];
        expectRows(allExport, allRows);
      });
    });

    describe('POST filters by valid', () => {
      it('should only export valid reports on true', async () => {
        const url = '/api/v2/export/reports?filters[valid]=true';

        const result = await utils.request(url, { notJson: true });
        const rows = getRows(result);
        const expected = [
          // eslint-disable-next-line max-len
          '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,bar,baz,foo,smang.smong',
          '"export-data-2-test-doc-3","b","abc125",1517616000000,,,,,,,"bazVal",,',
          '"export-data-2-test-doc-2","a","abc124",1517529600000,,,,,,"barVal2",,"fooVal2","smangsmongVal2"',
          '"export-data-2-test-doc-1","a","abc123",1517443200000,,,,,,"barVal",,"fooVal","smangsmongVal"',
          '"export-data-2-verified","c","abc125",1580688000000,,,,,,,"bazVal",,',
          '"export-data-2-not-verified","c","abc125",1580688000000,,,,,,,"bazVal",,',
        ];
        expectRows(expected, rows);
      });

      it('should only export invalid reports on false', async () => {
        const url = '/api/v2/export/reports?filters[valid]=false';

        const result = await utils.request(url, { notJson: true });
        const rows = getRows(result);
        const expected = [
          // eslint-disable-next-line max-len
          '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,bar,baz,foo,smang.smong',
          '"export-data-2-invalid","c","abc125",1580688000000,,,,,,,"bazVal",,',
        ];
        expectRows(expected, rows);
      });
    });
  });

  describe('GET|POST /api/v2/export/contacts', () => {
    const contacts = [
      { _id: 'john_id', name: 'john', patient_id: '12345', type: 'person', field: 'value' },
      { _id: 'mary_id', name: 'mary', type: 'person', other_field: 'b' },
      { _id: 'jen_id', name: 'jen', type: 'contact', contact_type: 'chw', patient_id: '123', other_field: 'value' },
      { _id: 'leslie_id', name: 'leslie', type: 'district_hospital', reported_date: 100 },
      { _id: 'my_district_id', name: 'my_district', type: 'district_hospital', place_id: '4568', phone: '0054852' },
      { _id: 'ny_id', name: 'new york', type: 'contact', contact_type: 'city', place_id: '231', phone: '0054852' },
      {
        _id: 'michael_id',
        name: 'michael',
        type: 'contact',
        contact_type: 'chw',
        patient_id: '8894',
        birthdate: '01-01-2023',
      },
    ];

    const otherDocs = [
      { _id: uuid(), type: 'data_record', form: 'a-form', fields: {} },
      { _id: uuid(), type: 'task' },
      { _id: uuid(), type: 'target' },
    ];

    before(async () => {
      await utils.saveDocsRevs(contacts);
      await utils.saveDocs(otherDocs);
    });

    it('Returns all contacts that exist in the system', async () => {
      const result = await utils.request({ path: '/api/v2/export/contacts' });
      const rows = getRows(result);
      const hardCodedPerson = await utils.getDoc('e2e_contact_test_id');
      const expected = [
        'id,rev,name,patient_id,type,contact_type,place_id',
        `"john_id","${contacts[0]._rev}","john","12345","person",,`,
        `"mary_id","${contacts[1]._rev}","mary",,"person",,`,
        `"jen_id","${contacts[2]._rev}","jen","123","contact","chw",`,
        `"leslie_id","${contacts[3]._rev}","leslie",,"district_hospital",,`,
        `"my_district_id","${contacts[4]._rev}","my_district",,"district_hospital",,"4568"`,
        `"ny_id","${contacts[5]._rev}","new york",,"contact","city","231"`,
        `"michael_id","${contacts[6]._rev}","michael","8894","contact","chw",`,
        `"${hardCodedPerson._id}","${hardCodedPerson._rev}",,,"person",,`
      ];
      expectRows(expected, rows);
    });

    it('POST Filters by one contact type', async () => {
      const result = await utils.request({
        method: 'POST',
        path: '/api/v2/export/contacts',
        body: {
          filters: {
            types: {
              selected: ['district_hospital']
            }
          }
        }
      });
      const rows = getRows(result);
      const expected = [
        'id,rev,name,patient_id,type,contact_type,place_id',
        `"leslie_id","${contacts[3]._rev}","leslie",,"district_hospital",,`,
        `"my_district_id","${contacts[4]._rev}","my_district",,"district_hospital",,"4568"`,
      ];
      expectRows(expected, rows);
    });

    it('POST Filters by custom contact types', async () => {
      const result = await utils.request({
        method: 'POST',
        path: '/api/v2/export/contacts',
        body: {
          filters: {
            types: {
              selected: ['chw', 'city']
            }
          }
        }
      });
      const rows = getRows(result);
      const expected = [
        'id,rev,name,patient_id,type,contact_type,place_id',
        `"jen_id","${contacts[2]._rev}","jen","123","contact","chw",`,
        `"ny_id","${contacts[5]._rev}","new york",,"contact","city","231"`,
        `"michael_id","${contacts[6]._rev}","michael","8894","contact","chw",`,
      ];
      expectRows(expected, rows);
    });

    it('POST filters by freetext', async () => {
      const result = await utils.request({
        method: 'POST',
        path: '/api/v2/export/contacts',
        body: {
          filters: {
            search: 'value'
          }
        }
      });
      const rows = getRows(result);
      const expected = [
        'id,rev,name,patient_id,type,contact_type,place_id',
        `"jen_id","${contacts[2]._rev}","jen","123","contact","chw",`,
        `"john_id","${contacts[0]._rev}","john","12345","person",,`,
      ];
      expectRows(expected, rows);
    });

    it('POST filters by freetext and type', async () => {
      const result = await utils.request({
        method: 'POST',
        path: '/api/v2/export/contacts',
        body: {
          filters: {
            search: 'value',
            types: { selected: ['chw', 'city', 'district_hospital'] }
          }
        }
      });
      const rows = getRows(result);
      const expected = [
        'id,rev,name,patient_id,type,contact_type,place_id',
        `"jen_id","${contacts[2]._rev}","jen","123","contact","chw",`,
      ];
      expectRows(expected, rows);
    });
  });

  describe('Weird data', () => {
    before(() => utils.saveDoc({
      _id: 'export-data-2-test-doc-4',
      form: 'weird-data-types',
      type: 'data_record',
      fields: {
        wd_array: [0, 1, 2],
        wd_emptyString: '',
        wd_false: false,
        wd_naughtyArray: [0, {foo: false, bar: null}, 'Hello, "world"'],
        wd_naughtyString: 'Woah there, "Jimmy O\'Tool"',
        wd_null: null,
        wd_zero: 0,
      }
    }));

    it('Outputs weird data types correctly', () => {
      return utils.request({
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
        expect(rows.length).to.equal(2);
        expect(rows).to.deep.equal(expected);
      });
    });
  });
});
