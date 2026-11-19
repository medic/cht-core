const sinon = require('sinon');
const db = require('../../../../src/db');
require('chai').should();

const service = require('../../../../src/services/export/report-mapper');

describe('Report mapper', () => {
  afterEach(() => sinon.restore());

  describe('Flatten fields', () => {
    it('flattens fields', () => {
      service._flatten({
        foo: 'fooVal',
        bars: {
          bar1: 'bar1Val',
          smang: {
            smong: 'smongVal'
          }
        }
      }).should.deep.equal({
        foo: 'fooVal',
        'bars.bar1': 'bar1Val',
        'bars.smang.smong': 'smongVal'
      });
    });
    it('assigns arrays to a single cell', () => {
      service._flatten({
        foo: [1, 2, 3],
        bar: {
          smang: ['a', 'b', 'c']
        }
      }).should.deep.equal({
        foo: [1, 2, 3],
        'bar.smang': ['a', 'b', 'c']
      });
    });
  });

  it('uses the datasource sample operation to discover report columns', async () => {
    const report = {
      _id: 'report-id',
      _rev: '1',
      type: 'data_record',
      form: 'pregnancy',
      fields: { patient_name: 'Sam', nested: { value: 'sample' } }
    };
    const query = sinon.stub(db.medic, 'query').resolves({ rows: [{ doc: report }] });

    const result = await service.map(
      { forms: { selected: [{ code: 'pregnancy' }] } },
      { humanReadable: false }
    );

    query.calledOnceWithExactly('medic-client/reports_by_form', {
      key: ['pregnancy'],
      limit: 1,
      include_docs: true,
      reduce: false,
    }).should.equal(true);
    result.header.should.include('patient_name');
    result.header.should.include('nested.value');
  });

  it('skips invalid form codes when discovering report columns', async () => {
    const report = {
      _id: 'report-id',
      _rev: '1',
      type: 'data_record',
      form: 'pregnancy',
      fields: { patient_name: 'Sam' }
    };
    const query = sinon.stub(db.medic, 'query').resolves({ rows: [{ doc: report }] });

    const result = await service.map(
      { forms: { selected: [{ code: 'pregnancy ' }, { code: 'pregnancy' }] } },
      { humanReadable: false }
    );

    query.calledOnceWithExactly('medic-client/reports_by_form', {
      key: ['pregnancy'],
      limit: 1,
      include_docs: true,
      reduce: false,
    }).should.equal(true);
    result.header.should.include('patient_name');
  });

});
