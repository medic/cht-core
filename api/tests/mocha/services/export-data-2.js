require('chai').should();

const db = require('../../../src/db-pouch'),
      service = require('../../../src/services/export-data-2'),
      reportMapper = require('../../../src/services/export/report-mapper'),
      contactMapper = require('../../../src/services/export/contact-mapper'),
      sinon = require('sinon');

describe('Export Data Service 2.0', () => {

  afterEach(() => {
    sinon.restore();
  });

  const mockRequest = (type, filters={}, options={}) => {
    const chunks = [];
    return new Promise(resolve => {
      service.export(type, filters, options).pipe({
        write: chunk => chunks.push(chunk.toString()),
        on: () => {},
        once: () => {},
        emit: () => {},
        end: () => resolve(chunks.join(''))
      });
    });
  };

  describe('Export messages', () => {

    it('handles empty db', () => {
      sinon.stub(db.medic, 'query').returns(Promise.resolve({ rows: [] }));
      return mockRequest('messages').then(actual => {
        actual.should.equal('id,patient_id,reported_date,from,type,state,received,scheduled,pending,sent,cleared,muted,message_id,sent_by,to_phone,content\n');
      });
    });

    it('formats responses', () => {
      const query = sinon.stub(db.medic, 'query');
      query.onCall(0).returns(Promise.resolve({ rows: [ { id: 'abc' }, { id: 'def' } ] }));
      query.onCall(1).returns(Promise.resolve({ rows: [] }));
      const allDocs = sinon.stub(db.medic, 'allDocs').returns(Promise.resolve({
        rows: [
          { doc: {
            _id: 'abc',
            patient_id: '123456',
            reported_date: 123456789,
            responses: [ { sent_by: '+123456789', message: 'hello' } ]
          } },
          { doc: {
            _id: 'def',
            patient_id: '654321',
            reported_date: 987654321,
            responses: [ { sent_by: '+987654321', message: 'hi' } ]
          } }
        ]
      }));
      sinon.stub(service._lineage, 'hydrateDocs').returns(Promise.resolve([
        {
          _id: 'abc',
          patient_id: '123456',
          reported_date: 123456789,
          responses: [ { sent_by: '+123456789', message: 'hello' } ]
        },
        {
          _id: 'def',
          patient_id: '654321',
          reported_date: 987654321,
          responses: [ { sent_by: '+987654321', message: 'hi' } ]
        }
      ]));
      const expected = 'id,patient_id,reported_date,from,type,state,received,scheduled,pending,sent,cleared,muted,message_id,sent_by,to_phone,content\n' +
                       '"abc","123456",123456789,,"Automated Reply","sent","","","",123456789,"","",,"+123456789",,"hello"\n' +
                       '"def","654321",987654321,,"Automated Reply","sent","","","",987654321,"","",,"+987654321",,"hi"\n';
      return mockRequest('messages').then(actual => {
        actual.should.equal(expected);
        query.callCount.should.equal(2);
        allDocs.callCount.should.equal(1);
      });
    });

    it('includes tasks and scheduled tasks', () => {
      const query = sinon.stub(db.medic, 'query');
      query.onCall(0).returns(Promise.resolve({ rows: [ { id: 'abc' }, { id: 'def' } ] }));
      query.onCall(1).returns(Promise.resolve({ rows: [] }));
      sinon.stub(db.medic, 'allDocs').returns(Promise.resolve({
        rows: [
          { doc: {
            _id: 'abc',
            patient_id: '123456',
            reported_date: 123456789,
            tasks: [
              { messages: [{ to: '+123456789', message: 'hello' }]},
              { messages: [{ to: '+123456788', message: 'goodbye' }]}
            ]
          } },
          { doc: {
            _id: 'def',
            patient_id: '654321',
            reported_date: 987654321,
            scheduled_tasks: [
              { messages: [{ to: '+223456789', message: 'hi' }]},
              { messages: [{ to: '+223456788', message: 'bye' }]}
            ]
          } }
        ]
      }));
      sinon.stub(service._lineage, 'hydrateDocs').returns(Promise.resolve([
        {
          _id: 'abc',
          patient_id: '123456',
          reported_date: 123456789,
          tasks: [
            { messages: [{ to: '+123456789', message: 'hello' }]},
            { messages: [{ to: '+123456788', message: 'goodbye' }]}
          ]
        },
        {
          _id: 'def',
          patient_id: '654321',
          reported_date: 987654321,
          scheduled_tasks: [
            { messages: [{ to: '+223456789', message: 'hi' }]},
            { messages: [{ to: '+223456788', message: 'bye' }]}
          ]
        }
      ]));
      const expected = 'id,patient_id,reported_date,from,type,state,received,scheduled,pending,sent,cleared,muted,message_id,sent_by,to_phone,content\n' +
                       '"abc","123456",123456789,,"Task Message",,"","","","","","",,,"+123456789","hello"\n' +
                       '"abc","123456",123456789,,"Task Message",,"","","","","","",,,"+123456788","goodbye"\n' +
                       '"def","654321",987654321,,"Task Message",,"","","","","","",,,"+223456789","hi"\n' +
                       '"def","654321",987654321,,"Task Message",,"","","","","","",,,"+223456788","bye"\n';
      return mockRequest('messages').then(actual => {
        actual.should.equal(expected);
      });
    });

    it('formats incoming messages', () => {
      const query = sinon.stub(db.medic, 'query');
      query.onCall(0).returns(Promise.resolve({ rows: [ { id: 'abc' }, { id: 'def' } ] }));
      query.onCall(1).returns(Promise.resolve({ rows: [] }));
      sinon.stub(db.medic, 'allDocs').returns(Promise.resolve({
        rows: [
          { doc: {
            _id: 'abc',
            patient_id: '123456',
            reported_date: 123456789,
            from: '+123456789',
            sms_message: { message: 'hello' }
          } },
          { doc: {
            _id: 'def',
            patient_id: '654321',
            reported_date: 987654321,
            from: '+987654321',
            sms_message: { message: 'hi' }
          } }
        ]
      }));
      sinon.stub(service._lineage, 'hydrateDocs').returns(Promise.resolve([
        {
          _id: 'abc',
          patient_id: '123456',
          reported_date: 123456789,
          from: '+123456789',
          sms_message: { message: 'hello' }
        },
        {
          _id: 'def',
          patient_id: '654321',
          reported_date: 987654321,
          from: '+987654321',
          sms_message: { message: 'hi' }
        }
      ]));
      const expected = 'id,patient_id,reported_date,from,type,state,received,scheduled,pending,sent,cleared,muted,message_id,sent_by,to_phone,content\n' +
                       '"abc","123456",123456789,"+123456789","Message","received",123456789,"","","","","",,"+123456789",,"hello"\n' +
                       '"def","654321",987654321,"+987654321","Message","received",987654321,"","","","","",,"+987654321",,"hi"\n';
      return mockRequest('messages').then(actual => {
        actual.should.equal(expected);
      });
    });

  });

  describe('Export reports', () => {

    it('formats responses', () => {
      const stockReport = {
        _id: 'abc',
        patient_id: '123456',
        reported_date: 123456789,
        form: 'STCK'
      };
      const visitReport = {
        _id: 'def',
        patient_id: '654321',
        fields: { name: 'Sally' },
        reported_date: 987654321,
        form: 'V'
      };
      reportMapper.getDocIds = sinon.stub();
      reportMapper.getDocIds.onCall(0).returns(Promise.resolve([ 'abc', 'def' ]));
      reportMapper.getDocIds.onCall(1).returns(Promise.resolve([]));
      const query = sinon.stub(db.medic, 'query');
      query.onCall(0).returns(Promise.resolve({
        rows: [
          { key: [ 'STCK' ] },
          { key: [ 'V' ] }
        ]
      }));
      query.onCall(1).returns(Promise.resolve({ rows: [ { doc: stockReport } ] }));
      query.onCall(2).returns(Promise.resolve({ rows: [ { doc: visitReport } ] }));
      sinon.stub(db.medic, 'allDocs').returns(Promise.resolve({
        rows: [
          { doc: stockReport },
          { doc: visitReport }
        ]
      }));
      sinon.stub(service._lineage, 'hydrateDocs').returns(Promise.resolve([
        stockReport,
        visitReport
      ]));
      const expected = '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,name\n' +
                       '"abc","STCK","123456",123456789,,,,,,\n' +
                       '"def","V","654321",987654321,,,,,,"Sally"\n';
      return mockRequest('reports').then(actual => {
        actual.should.equal(expected);
        reportMapper.getDocIds.callCount.should.equal(2);
      });
    });
  
    it('works for enketo reports', () => {
      const report = {
        _id: 'B87FEE75-D435-A648-BDEA-0A1B61021AA3',
        _rev: '3-e361f7bce1a97799b3265336a2e68f11',
        fields: { patient_name: 'Babyale Elaijah' },
        form: 'assessment',
        type: 'data_record',
        content_type: 'xml',
        reported_date: 1450959150540,
        contact: {
          _id: 'DFEF75F5-4D25-EA47-8706-2B12500EFD8F',
          parent: {
            _id: '6850E77F-5FFC-9B01-8D5B-3D6E33DFA73E',
            parent: {
              _id: '6AC7CDAA-A9CB-2AC0-A4C6-5B27A714D5ED'
            }
          }
        },
        from: '+256 787 123 456',
        hidden_fields: [
        ]
      };
      reportMapper.getDocIds = sinon.stub();
      reportMapper.getDocIds.onCall(0).returns(Promise.resolve([ 'B87FEE75-D435-A648-BDEA-0A1B61021AA3' ]));
      reportMapper.getDocIds.onCall(1).returns(Promise.resolve([]));
      const query = sinon.stub(db.medic, 'query');
      query.onCall(0).returns(Promise.resolve({ rows: [ { key: [ 'assessment' ] } ] }));
      query.onCall(1).returns(Promise.resolve({ rows: [ { doc: report } ] }));
      sinon.stub(db.medic, 'allDocs').returns(Promise.resolve({ rows: [ { doc: report } ] }));
      sinon.stub(service._lineage, 'hydrateDocs').returns(Promise.resolve([
        {
          _id: 'B87FEE75-D435-A648-BDEA-0A1B61021AA3',
          _rev: '3-e361f7bce1a97799b3265336a2e68f11',
          fields: { patient_name: 'Babyale Elaijah' },
          form: 'assessment',
          type: 'data_record',
          content_type: 'xml',
          reported_date: 1450959150540,
          contact: {
            _id: 'DFEF75F5-4D25-EA47-8706-2B12500EFD8F',
            name: 'my contact',
            parent: {
              _id: '6850E77F-5FFC-9B01-8D5B-3D6E33DFA73E',
              name: 'my contacts parent',
              parent: {
                _id: '6AC7CDAA-A9CB-2AC0-A4C6-5B27A714D5ED',
                name: 'my contacts grandparent',
              }
            }
          },
          from: '+256 787 123 456',
          hidden_fields: [
          ]
        }
      ]));
      const expected = '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,patient_name\n' +
                       '"B87FEE75-D435-A648-BDEA-0A1B61021AA3","assessment",,1450959150540,"+256 787 123 456","my contact","my contacts parent","my contacts grandparent",,"Babyale Elaijah"\n';
      return mockRequest('reports').then(actual => {
        actual.should.equal(expected);
        reportMapper.getDocIds.callCount.should.equal(2);
      });
    });
  });

  describe('Export contacts', () => {

    it('works', () => {

      const contact2 = {
        _id: '2',
        type: 'district',
        name: 'dunedin'
      };
      const contact1 = {
        _id: '1',
        name: 'gdawg',
        type: 'person',
        parent: { _id: contact2._id }
      };

      contactMapper.getDocIds = sinon.stub();
      contactMapper.getDocIds.onCall(0).returns(Promise.resolve([ contact2._id, contact1._id ]));
      contactMapper.getDocIds.onCall(1).returns(Promise.resolve([]));
      sinon.stub(db.medic, 'allDocs').returns(Promise.resolve({ rows: [ { doc: contact2 }, { doc: contact1 } ] }));
      sinon.stub(service._lineage, 'hydrateDocs').returns(Promise.resolve([
        contact2,
        {
          _id: '1',
          name: 'gdawg',
          type: 'person',
          parent: contact2
        }
      ]));

      const expected = 'id,rev,name,patient_id,type\n' +
                       '"2",,"dunedin",,"district"\n' +
                       '"1",,"gdawg",,"person"\n';
      return mockRequest('contacts').then(actual => {
        actual.should.equal(expected);
      });

    });

  });

});
