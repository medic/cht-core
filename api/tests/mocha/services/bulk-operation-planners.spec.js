const sinon = require('sinon');
const { expect } = require('chai');

const db = require('../../../src/db');
const config = require('../../../src/config');
const dataContext = require('../../../src/services/data-context');
const { BadRequestError } = require('../../../src/errors');
const { ValidationError } = require('@medic/bulk-operations')(config, db, dataContext);
const planners = require('../../../src/services/bulk-operation-planners');

describe('Bulk operation planners', () => {
  beforeEach(() => {
    // validate resolves the contact through cht-datasource before it checks anything else
    sinon.stub(db.medic, 'get').resolves({ _id: 'place', _rev: '1-a', type: 'clinic' });
    sinon.stub(config, 'getAll').returns({ contact_types: [ { id: 'clinic' } ] });
  });

  afterEach(() => sinon.restore());

  it('reports a refused operation as a 400', async () => {
    sinon.stub(db.medic, 'query').resolves({ rows: [ { id: 'place', value: {} } ] });
    sinon.stub(db.users, 'query').resolves({ rows: [ { id: 'org.couchdb.user:chw' } ] });

    const err = await planners.validate('delete-contact', { contact_id: 'place' }).catch(e => e);

    expect(err).to.be.an.instanceOf(BadRequestError);
    expect(err.code).to.equal(400);
    expect(err.message).to.contain('user(s) are linked to contacts');
  });

  it('lets any other failure through, so a database error is not reported as a bad request', async () => {
    sinon.stub(db.medic, 'query').rejects(new Error('couch is down'));

    const err = await planners.plan('delete-contact', { contact_id: 'place' }).catch(e => e);

    expect(err).to.not.be.an.instanceOf(BadRequestError);
    expect(err).to.not.be.an.instanceOf(ValidationError);
    expect(err.message).to.equal('couch is down');
  });

  it('refuses an unknown operation type', async () => {
    const err = await planners.plan('not-a-type', {}).catch(e => e);

    expect(err.message).to.contain('no planner for type "not-a-type"');
  });
});
