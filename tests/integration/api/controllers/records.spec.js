const { expect } = require('chai');
const moment = require('moment');
const utils = require('@utils');

describe('Import Records', () => {

  after(() => utils.deleteAllDocs().then(() => utils.revertSettings(true)));

  before(() => utils.updateSettings({
    forms: {
      'TEST': {
        'meta': {
          'code': 'TEST'
        },
        'fields': {
          'some_data': {
            'type': 'string',
            'required': true
          },
          'a_number': {
            'type': 'integer',
            'required': true
          },
          'a_boolean': {
            'type': 'boolean',
          },
          'another_boolean': {
            'type': 'boolean',
          },
          'an_optional_date': {
            'type': 'date'
          }
        }
      }
    }
  }, true));

  describe('JSON', () => {
    it('parses and stores the passed JSON', () => {
      return utils.saveDoc({
        name: 'Test contact',
        phone: '+447765902000',
        reported_date: 1557404580557,
        type: 'person'
      })
        .then(() => utils.request({
          method: 'POST',
          path: '/api/v2/records',
          headers: {
            'Content-type': 'application/json'
          },
          body: {
            _meta: {
              form: 'TEST',
              from: '+447765902000'
            },
            some_data: 'hello',
            a_number: 42,
            a_boolean: false,
            another_boolean: 0,
            an_optional_date: '2018-11-10'
          }
        }))
        .then(() => utils.db.query('medic-client/reports_by_form', {
          key: ['TEST'],
          include_docs: true,
          reduce: false
        }))
        .then(({rows}) => {
          expect(rows.length).to.equal(1);
          const doc = rows[0].doc;
          expect(doc).to.include({
            type: 'data_record',
            form: 'TEST',
            from: '+447765902000'
          });
          expect(doc.fields).to.deep.equal({
            some_data: 'hello',
            a_number: 42,
            a_boolean: false,
            another_boolean: false,
            an_optional_date: moment.utc('2018-11-10').valueOf()
          });
          return utils.db.remove(doc);
        });
    });
    it('supports not passing optional fields, including the from number', () => {
      return utils.saveDoc({
        name: 'Test contact',
        phone: '+447765902000',
        reported_date: 1557404580557,
        type: 'person'
      })
        .then(() => utils.request({
          method: 'POST',
          path: '/api/v2/records',
          headers: {
            'Content-type': 'application/json'
          },
          body: {
            _meta: {
              form: 'TEST'
            },
            some_data: 'hello',
            a_number: 42
          }
        }))
        .then(() => utils.db.query('medic-client/reports_by_form', {
          key: ['TEST'],
          include_docs: true,
          reduce: false
        }))
        .then(({rows}) => {
          expect(rows.length).to.equal(1);
          const doc = rows[0].doc;
          expect(doc).to.include({
            type: 'data_record',
            form: 'TEST'
          });
          expect(doc.fields).to.deep.equal({
            some_data: 'hello',
            a_number: 42
          });
          return utils.db.remove(doc);
        });
    });
    it('adds errors for missing fields', () => {
      return utils.saveDoc({
        name: 'Test contact',
        phone: '+447765902000',
        reported_date: 1557404580557,
        type: 'person'
      })
        .then(() => utils.request({
          method: 'POST',
          path: '/api/v2/records',
          headers: {
            'Content-type': 'application/json'
          },
          body: {
            _meta: {
              form: 'TEST',
              from: '+447765902000'
            },
            a_number: 42,
            an_optional_date: '2018-11-10'
          }
        }))
        .then(() => utils.db.query('medic-client/reports_by_form', {
          key: ['TEST'],
          include_docs: true,
          reduce: false
        }))
        .then(({rows}) => {
          expect(rows.length).to.equal(1);
          const doc = rows[0].doc;
          expect(doc).to.include({
            type: 'data_record',
            form: 'TEST',
            from: '+447765902000'
          });
          expect(doc.fields).to.deep.equal({
            a_number: 42,
            an_optional_date: moment.utc('2018-11-10').valueOf()
          });
          expect(doc.errors.length).to.equal(1);
          expect(doc.errors[0]).to.deep.equal({
            code: 'sys.missing_fields',
            message: 'Missing or invalid fields: some_data.'
          });
          return utils.db.remove(doc);
        });
    });
  });
});
