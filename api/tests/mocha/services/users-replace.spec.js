const chai = require('chai');
const sinon = require('sinon');

const db = require('../../../src/db');
const service = require('../../../src/services/users-replace');

describe('Users replace service', () => {
  describe('reparentReports', () => {
    const reportBeforeReplace = {
      _id: '228fdbbb-67bc-4e75-bdd2-4a86bfc7dab9',
      form: 'pregnancy',
      type: 'data_record',
      reported_date: 1633601822049,
      contact: {
        _id: '3be88b62-fae4-408a-a08d-ff5e37cf43b7',
        parent: {
          _id: '2ac7a997-7d6d-44cf-8d70-f243afeb55a0',
          parent: {
            _id: '87d06670-d877-4d09-aa98-4df98ebf20f4'
          }
        }
      },
    };
    const reportAfterReplace = {
      _id: '12125dec-a557-4b16-8c5b-4bb925d214be',
      form: 'pregnancy',
      type: 'data_record',
      reported_date: 1661349364145,
      contact: {
        _id: '3be88b62-fae4-408a-a08d-ff5e37cf43b7',
        parent: {
          _id: '2ac7a997-7d6d-44cf-8d70-f243afeb55a0',
          parent: {
            _id: '87d06670-d877-4d09-aa98-4df98ebf20f4'
          }
        }
      },
    };
    const allReports = [reportBeforeReplace, reportAfterReplace];
    const originalContact = {
      _id: '3be88b62-fae4-408a-a08d-ff5e37cf43b7',
      parent: {
        _id: '2ac7a997-7d6d-44cf-8d70-f243afeb55a0',
        parent: {
          _id: '87d06670-d877-4d09-aa98-4df98ebf20f4'
        }
      },
      type: 'person',
      name: 'Replace 240822',
      reported_date: 1661348992175,
    };
    const replaceUserReport = {
      _id: '102bc951-1df3-4e2a-a769-b94f91ab9d16',
      form: 'replace_user',
      type: 'data_record',
      reported_date: 1661349264916,
      fields: {
        original_contact_uuid: '3be88b62-fae4-408a-a08d-ff5e37cf43b7',
      },
    };
    const newContact = {
      _id: 'new-contact-id',
      parent: originalContact.parent,
    };

    beforeEach(async () => {
      sinon.stub(db.medic, 'get').withArgs(replaceUserReport._id).resolves(replaceUserReport);
      sinon.stub(db.medic, 'query').resolves({ rows: allReports.map(report => ({ doc: report })) });
      sinon.stub(db.medic, 'bulkDocs');
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should reparent reports submitted after the replacement', async () => {
      const reparentedReportAfterReplace = Object.assign({}, reportAfterReplace, {
        contact: {
          _id: newContact._id,
          parent: newContact.parent,
        },
      });
      const expectedReparentedReports = [reparentedReportAfterReplace];
      await service._reparentReports(replaceUserReport._id, newContact);
      chai.expect(db.medic.bulkDocs.calledOnce).to.be.true;
      chai.expect(db.medic.bulkDocs.args[0]).to.deep.equal([expectedReparentedReports]);
    });
  });
});

