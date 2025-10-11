const sinon = require('sinon');
const chai = require('chai').use(require('chai-as-promised'));
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
    chai.expect(count.users).to.deep.equal({ total: 0 });
  });

  it('getusercount does not return negative in case of no records', async () => {
    setUpMocks({ docCount: 0 });
    const count = await service.jsonV1();
    chai.expect(count.users).to.deep.equal({ total: 0 });
  });

  it('all empty database still returns proper structure', async () => {
    setUpMocks({ docCount: 2, contacts: [], reports: [] });
    const result = await service.jsonV1();

    chai.expect(result.users).to.deep.equal({ total: 0 });
    chai.expect(result.contacts).to.deep.equal({ total: 0, by_type: [] });
    chai.expect(result.reports).to.deep.equal({ total: 0, by_form: [] });
  });

  it('jsonV1 returns users, contacts and reports on success', async () => {
    setUpMocks({ docCount: 12 });
    const result = await service.jsonV1();

    chai.expect(result.users).to.deep.equal({ total: 10 });
    chai.expect(result.contacts.total).to.equal(7);
    chai.expect(result.contacts.by_type).to.have.deep.members([
      { type: 'person', count: 5 },
      { type: 'clinic', count: 2 }
    ]);

    chai.expect(result.reports.total).to.equal(10);
    chai.expect(result.reports.by_form).to.have.deep.members([
      { form: 'L', count: 3 },
      { form: 'G', count: 7 }
    ]);
  });

  it('handles errors gracefully for medic queries', async () => {
    sinon.stub(db.users, 'info').resolves({ doc_count: 2 });
    sinon.stub(db.medic, 'query').rejects(new Error('db fail'));

    const result = await service.jsonV1();

    chai.expect(result.users).to.deep.equal({ total: 0 });
    chai.expect(result.contacts).to.deep.equal({ total: 0, by_type: [] });
    chai.expect(result.reports).to.deep.equal({ total: 0, by_form: [] });
  });

  it('propagates error when users.info fails', async () => {
    sinon.stub(db.users, 'info').rejects(new Error('users fail'));
    sinon.stub(db.medic, 'query').resolves({ rows: [] });
    await chai.expect(service.jsonV1()).to.be.rejectedWith('users fail');
  });

  it('handles error within contacts query but still returns reports', async () => {
    sinon.stub(db.users, 'info').resolves({ doc_count: 1 });
    const medicQuery = sinon.stub(db.medic, 'query');

    medicQuery.withArgs('medic-client/contacts_by_type', sinon.match.object)
      .rejects(new Error('Error fetching contacts by type: db fail'));

    medicQuery.withArgs('medic-client/reports_by_form', sinon.match.object)
      .resolves({ rows: [{ key: ['L'], value: 10 }] });

    const result = await service.jsonV1();

    chai.expect(result.users).to.deep.equal({ total: 0 });
    chai.expect(result.contacts).to.deep.equal({ total: 0, by_type: [] });

    chai.expect(result.reports.total).to.equal(10);
    chai.expect(result.reports.by_form).to.have.deep.members([
      { form: 'L', count: 10 }
    ]);
  });
});
