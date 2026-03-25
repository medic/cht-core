const chai = require('chai');
const sinon = require('sinon');
const chtDatasource = require('@medic/cht-datasource');
const logger = require('@medic/logger');
const queryFreetext = require('../src/freetext-query').queryFreetext;

describe('freetext-query', () => {
  'use strict';

  beforeEach(() => {
    sinon.stub(logger, 'error');
  });

  afterEach(() => {
    sinon.restore();
  });

  const createAsyncGenerator = (values) => {
    return (async function* () {
      for (const val of values) {
        yield val;
      }
    })();
  };

  it('should query reports freetext and return rows', async () => {
    const getUuidsByFreetext = sinon.stub().returns(createAsyncGenerator(['id1', 'id2']));
    sinon.stub(chtDatasource, 'getDatasource').returns({ v1: { report: { getUuidsByFreetext } } });

    const request = { params: { key: 'search_term' } };
    const result = await queryFreetext({}, request, 'reports');

    chai.expect(result).to.deep.equal([{ id: 'id1' }, { id: 'id2' }]);
    chai.expect(getUuidsByFreetext.calledWith('search_term')).to.equal(true);
  });

  it('should query contacts freetext without type', async () => {
    const getUuidsByFreetext = sinon.stub().returns(createAsyncGenerator(['c1', 'c2']));
    const getUuidsByTypeFreetext = sinon.stub();

    sinon.stub(chtDatasource, 'getDatasource').returns(
      { v1: { contact: { getUuidsByFreetext, getUuidsByTypeFreetext } } }
    );

    const request = { params: { key: 'term' } };
    const result = await queryFreetext({}, request, 'contacts');

    chai.expect(result).to.deep.equal([{ id: 'c1' }, { id: 'c2' }]);
    chai.expect(getUuidsByFreetext.calledWith('term')).to.equal(true);
    chai.expect(getUuidsByTypeFreetext.called).to.equal(false);
  });

  it('should query contacts freetext with type', async () => {
    const getUuidsByFreetext = sinon.stub();
    const getUuidsByTypeFreetext = sinon.stub().returns(createAsyncGenerator(['c3']));
    sinon.stub(chtDatasource, 'getDatasource').returns(
      { v1: { contact: { getUuidsByFreetext, getUuidsByTypeFreetext } } }
    );

    const request = { params: { key: 'term', type: 'person' } };
    const result = await queryFreetext({}, request, 'contacts');

    chai.expect(result).to.deep.equal([{ id: 'c3' }]);
    chai.expect(getUuidsByTypeFreetext.calledWith('term', 'person')).to.equal(true);
    chai.expect(getUuidsByFreetext.called).to.equal(false);
  });

  it('should return empty array for unknown type', async () => {
    sinon.stub(chtDatasource, 'getDatasource').returns({ v1: {} });

    const request = { params: { key: 'term' } };
    const result = await queryFreetext({}, request, 'unknown');

    chai.expect(result).to.deep.equal([]);
    chai.expect(logger.error.calledOnce).to.equal(true);
  });

  it('should return empty array and log error on exception', async () => {
    sinon.stub(chtDatasource, 'getDatasource').throws(new Error('datasource error'));

    const request = { params: { key: 'term' } };
    const result = await queryFreetext({}, request, 'reports');

    chai.expect(result).to.deep.equal([]);
    chai.expect(logger.error.calledOnce).to.equal(true);
    chai.expect(logger.error.args[0][1].message).to.equal('datasource error');
  });

  it('should return empty array for empty generator', async () => {
    const getUuidsByFreetext = sinon.stub().returns(createAsyncGenerator([]));
    sinon.stub(chtDatasource, 'getDatasource').returns({ v1: { report: { getUuidsByFreetext } } });

    const request = { params: { key: 'nothing' } };
    const result = await queryFreetext({}, request, 'reports');

    chai.expect(result).to.deep.equal([]);
  });
});
