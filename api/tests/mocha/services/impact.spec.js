const sinon = require('sinon');
const chai = require('chai');
const db = require('../../../src/db');
const service = require('../../../src/services/impact');

describe('impact service', () => {
  afterEach(() => sinon.restore());
  const setUpMocks = ({ docCount = 10, contacts, reports }) => {
    sinon.stub(db.users, 'info').resolves({ doc_count: docCount });
    const medicQuery = sinon.stub(db.medic, 'query');
    medicQuery.withArgs('medic-client/contacts_by_type', sinon.match.object)
      .resolves({
        rows: contacts || [
          { key: ['person'], value: 5 },
          { key: ['clinic'], value: 2 }
        ]
      });
    medicQuery.withArgs('medic-client/reports_by_form', sinon.match.object)
      .resolves({
        rows: reports || [
          { key: ['L'], value: 3 },
          { key: ['G'], value: 7 }
        ]
      });

    return { medicQuery };
  };

  it('getusercount deducts _auth and _users', async () => {
    setUpMocks({ docCount: 2 });
    const count = await service.jsonV1();
    chai.expect(count.users).to.equal(0);
  });

  it('getusercount does not return negative in case of no records', async () => {
    setUpMocks({ docCount: 0 });
    const count = await service.jsonV1();
    chai.expect(count.users).to.equal(0);
  });

  it('all empty database still returns proper structue', async () => {
    setUpMocks({ docCount: 2, contacts: [], reports: [] });
    const result = await service.jsonV1();
    chai.expect(result).to.have.property('users', 0);
    chai.expect(result).to.have.property('contacts');
    chai.expect(result.contacts).to.deep.equal({});
    chai.expect(result).to.have.property('reports');
    chai.expect(result.reports).to.deep.equal({ report: {}, total: 0 });
  });

  it('jsonV1 returns users, contacts and reports on success', async () => {
    setUpMocks({ docCount: 12 });
    const result = await service.jsonV1();
    chai.expect(result).to.have.property('users', 10);
    chai.expect(result).to.have.property('contacts');
    chai.expect(result.contacts).to.deep.equal({ person: 5, clinic: 2 });
    chai.expect(result).to.have.property('reports');
    chai.expect(result.reports).to.deep.equal({ report: { L: 3, G: 7 }, total: 10 });
  });

  it('handles errors gracefully for medic queries', async () => {
    sinon.stub(db.users, 'info').resolves({ doc_count: 2 });
    sinon.stub(db.medic, 'query').rejects(new Error('db fail'));
    const result = await service.jsonV1();
    chai.expect(result).to.have.property('users', 0);
    chai.expect(result).to.have.property('contacts');
    chai.expect(result.contacts).to.deep.equal({});
    chai.expect(result).to.have.property('reports');
    chai.expect(result.reports).to.deep.equal({ report: {}, total: 0 });
  });

  it('propagates error when users.info fails', async () => {
    sinon.stub(db.users, 'info').rejects(new Error('users fail'));
    sinon.stub(db.medic, 'query').resolves({ rows: [] });

    try {
      await service.jsonV1();
      throw new Error('expected jsonV1 to reject');
    } catch (err) {
      chai.expect(err).to.be.instanceOf(Error);
      chai.expect(err.message).to.equal('users fail');
    }
  });

  it('handles error within contacts query', async () => {
    sinon.stub(db.users, 'info').resolves({ doc_count: 1 });
    const medicQuery = sinon.stub(db.medic, 'query');
    medicQuery.withArgs('medic-client/contacts_by_type', sinon.match.object)
      .rejects(new Error('Error fetching contacts by type: db fail'));
    medicQuery.withArgs('medic-client/reports_by_form', sinon.match.object)
      .resolves({ rows: [{ key: ['L'], value: 10 }] });

    const result = await service.jsonV1();
    chai.expect(result).to.have.property('users', 0);
    chai.expect(result).to.have.property('contacts');
    chai.expect(result.contacts).to.deep.equal({});
    chai.expect(result).to.have.property('reports');
    chai.expect(result.reports).to.deep.equal({ report: { L: 10 }, total: 10 });
  });
});
