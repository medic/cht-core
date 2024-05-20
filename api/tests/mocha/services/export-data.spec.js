require('chai').should();

const db = require('../../../src/db');
const logger = require('@medic/logger');
const service = require('../../../src/services/export-data');
const sinon = require('sinon');

describe('Export Data Service', () => {

  afterEach(() => {
    sinon.restore();
  });

  const mockRequest = (type, filters={}, options={}) => {
    const chunks = [];
    return new Promise((resolve, reject) => {
      service.exportStream(type, filters, options)
        .on('error', err => {
          reject(err);
        })
        .pipe({
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
        actual.should.equal('id,patient_id,reported_date,from,type,state,received,scheduled,pending,sent,cleared,muted,message_id,sent_by,to_phone,content\n'); // eslint-disable-line max-len
      });
    });

    it('formats responses', () => {
      const type = 'messages';
      const mapper = service._mapper(type);
      const getDocIds = sinon.stub(mapper, 'getDocIds');
      getDocIds.onCall(0).returns(Promise.resolve([ 'abc', 'def' ]));
      getDocIds.onCall(1).returns(Promise.resolve([]));
      const getDocs = sinon.stub(mapper, 'getDocs');
      getDocs.returns(Promise.resolve([
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
      const expected = 'id,patient_id,reported_date,from,type,state,received,scheduled,pending,sent,cleared,muted,message_id,sent_by,to_phone,content\n' + // eslint-disable-line max-len
                       '"abc","123456",123456789,,"Automated Reply","sent","","","",123456789,"","",,"+123456789",,"hello"\n' + // eslint-disable-line max-len
                       '"def","654321",987654321,,"Automated Reply","sent","","","",987654321,"","",,"+987654321",,"hi"\n'; // eslint-disable-line max-len
      return mockRequest(type).then(actual => {
        actual.should.equal(expected);
        getDocIds.callCount.should.equal(2);
        getDocs.callCount.should.equal(1);
      });
    });

    it('includes tasks and scheduled tasks', () => {
      const type = 'messages';
      const mapper = service._mapper(type);
      const getDocIds = sinon.stub(mapper, 'getDocIds');
      getDocIds.onCall(0).returns(Promise.resolve([ 'abc', 'def' ]));
      getDocIds.onCall(1).returns(Promise.resolve([]));
      const getDocs = sinon.stub(mapper, 'getDocs');
      getDocs.returns(Promise.resolve([
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
      const expected = 'id,patient_id,reported_date,from,type,state,received,scheduled,pending,sent,cleared,muted,message_id,sent_by,to_phone,content\n' + // eslint-disable-line max-len
                       '"abc","123456",123456789,,"Task Message",,"","","","","","",,,"+123456789","hello"\n' +
                       '"abc","123456",123456789,,"Task Message",,"","","","","","",,,"+123456788","goodbye"\n' +
                       '"def","654321",987654321,,"Task Message",,"","","","","","",,,"+223456789","hi"\n' +
                       '"def","654321",987654321,,"Task Message",,"","","","","","",,,"+223456788","bye"\n';
      return mockRequest(type).then(actual => {
        actual.should.equal(expected);
      });
    });

    it('formats incoming messages', () => {
      const type = 'messages';
      const mapper = service._mapper(type);
      const getDocIds = sinon.stub(mapper, 'getDocIds');
      getDocIds.onCall(0).returns(Promise.resolve([ 'abc', 'def' ]));
      getDocIds.onCall(1).returns(Promise.resolve([]));
      const getDocs = sinon.stub(mapper, 'getDocs');
      getDocs.returns(Promise.resolve([
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
      const expected = 'id,patient_id,reported_date,from,type,state,received,scheduled,pending,sent,cleared,muted,message_id,sent_by,to_phone,content\n' + // eslint-disable-line max-len
                       '"abc","123456",123456789,"+123456789","Message","received",123456789,"","","","","",,"+123456789",,"hello"\n' + // eslint-disable-line max-len
                       '"def","654321",987654321,"+987654321","Message","received",987654321,"","","","","",,"+987654321",,"hi"\n'; // eslint-disable-line max-len
      return mockRequest(type).then(actual => {
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
      const type = 'reports';
      const mapper = service._mapper(type);
      const getDocIds = sinon.stub(mapper, 'getDocIds');
      getDocIds.onCall(0).returns(Promise.resolve([ 'abc', 'def' ]));
      getDocIds.onCall(1).returns(Promise.resolve([]));
      const query = sinon.stub(db.medic, 'query');
      query.onCall(0).returns(Promise.resolve({
        rows: [
          { key: [ 'STCK' ] },
          { key: [ 'V' ] }
        ]
      }));
      query.onCall(1).returns(Promise.resolve({ rows: [ { doc: stockReport } ] }));
      query.onCall(2).returns(Promise.resolve({ rows: [ { doc: visitReport } ] }));
      const getDocs = sinon.stub(mapper, 'getDocs');
      getDocs.returns(Promise.resolve([
        stockReport,
        visitReport
      ]));
      const expected = '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,name\n' + // eslint-disable-line max-len
                       '"abc","STCK","123456",123456789,,,,,,\n' +
                       '"def","V","654321",987654321,,,,,,"Sally"\n';
      return mockRequest(type).then(actual => {
        actual.should.equal(expected);
        getDocIds.callCount.should.equal(2);
        getDocs.callCount.should.equal(1);
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
      const type = 'reports';
      const mapper = service._mapper(type);
      const getDocIds = sinon.stub(mapper, 'getDocIds');
      getDocIds.onCall(0).returns(Promise.resolve([ 'abc', 'def' ]));
      getDocIds.onCall(1).returns(Promise.resolve([]));
      const query = sinon.stub(db.medic, 'query');
      query.onCall(0).returns(Promise.resolve({ rows: [ { key: [ 'assessment' ] } ] }));
      query.onCall(1).returns(Promise.resolve({ rows: [ { doc: report } ] }));
      const getDocs = sinon.stub(mapper, 'getDocs');
      getDocs.returns(Promise.resolve([
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
      const expected = '_id,form,patient_id,reported_date,from,contact.name,contact.parent.name,contact.parent.parent.name,contact.parent.parent.parent.name,patient_name\n' + // eslint-disable-line max-len
                       '"B87FEE75-D435-A648-BDEA-0A1B61021AA3","assessment",,1450959150540,"+256 787 123 456","my contact","my contacts parent","my contacts grandparent",,"Babyale Elaijah"\n'; // eslint-disable-line max-len
      return mockRequest(type).then(actual => {
        actual.should.equal(expected);
        getDocIds.callCount.should.equal(2);
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

      const type = 'contacts';
      const mapper = service._mapper(type);
      const getDocIds = sinon.stub(mapper, 'getDocIds');
      getDocIds.onCall(0).returns(Promise.resolve([ contact2._id, contact1._id ]));
      getDocIds.onCall(1).returns(Promise.resolve([]));
      const getDocs = sinon.stub(mapper, 'getDocs');
      getDocs.returns(Promise.resolve([
        contact2,
        {
          _id: '1',
          name: 'gdawg',
          type: 'person',
          parent: contact2
        },
        {
          _id: '33',
          name: 'memory',
          type: 'contact',
          patient_id: '1231',
          contact_type: 'chw',
          parent: contact2
        },
        {
          _id: '231',
          name: 'a place',
          type: 'district',
          place_id: '89654',
          parent: contact2
        }
      ]));

      const expected = 'id,rev,name,patient_id,type,contact_type,place_id\n' +
                       '"2",,"dunedin",,"district",,\n' +
                       '"1",,"gdawg",,"person",,\n' +
                       '"33",,"memory","1231","contact","chw",\n'+
                       '"231",,"a place",,"district",,"89654"\n';
      return mockRequest(type).then(actual => {
        actual.should.equal(expected);
      });

    });

  });

  describe('Export users devices', () => {
    it('depends on the right permission', async () => {
      const permission = 'can_export_devices_details';
      service.permission('user-devices').should.equal(permission);
    });

    it('handles empty db', async () => {
      sinon.stub(db.medicUsersMeta, 'query').resolves({ rows: [] });
      const actual = await service.exportObject('user-devices');
      actual.should.deep.equal([]);
    });

    it('works', async () => {
      const rows = [
        {
          key: ['admin-central-2', 'd26e2875-53af-4e9b-b695-c82faf0db5d8'],
          value: {
            date: '2022-11-21',
            id: 'telemetry-2022-11-21-admin-central-2-d26e2875-53af-4e9b-b695-c82faf0db5d8',
            device: {
              userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36', // eslint-disable-line max-len
              versions: { cht: 'unknown', settings: '4-83c8561a13479b245b295e97401f2f55' },
            },
          },
        },
        {
          key: ['chw1', 'b1c172d8-82b0-42fd-8401-313796b8c801'],
          value: {
            date: '2022-11-29',
            id: 'telemetry-2022-11-29-chw1-b1c172d8-82b0-42fd-8401-313796b8c801',
            device: {
              userAgent: 'Mozilla/5.0 (Linux; Android 10; 8094X Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/88.0.4324.181 Mobile Safari/537.36 org.medicmobile.webapp.mobile.moh_mali_chw_training_2/v1.0.4-4', // eslint-disable-line max-len
              versions: {
                apk: 'v1.0.4-4',
                android: '10',
                cht: 'unknown',
                settings: '5-5ad24c388d1d4c4a7fcb6b05cff875ba',
              },
            },
          },
        },
        {
          key: ['min-data', 'b1c172d8-82b0-42fd-8401-313796b8c802'],
          value: {
            date: '2022-11-29',
            id: 'telemetry-1970-01-01-min-data-b1c172d8-82b0-42fd-8401-313796b8c801',
            device: {
              userAgent: undefined,
              versions: {
                apk: undefined,
                android: undefined,
                cht: undefined,
                settings: undefined,
              },
            },
          },
        },
      ];
      sinon.stub(db.medicUsersMeta, 'query').resolves({ rows });
      const actual = await service.exportObject('user-devices');
      actual.should.deep.equal([
        {
          user: 'admin-central-2',
          deviceId: 'd26e2875-53af-4e9b-b695-c82faf0db5d8',
          date: '2022-11-21',
          browser: {
            name: 'Chrome',
            version: '107.0.0.0',
          },
          apk: undefined,
          android: undefined,
          cht: 'unknown',
          settings: '4-83c8561a13479b245b295e97401f2f55'
        },
        {
          user: 'chw1',
          deviceId: 'b1c172d8-82b0-42fd-8401-313796b8c801',
          date: '2022-11-29',
          browser: {
            name: 'Chrome',
            version: '88.0.4324.181',
          },
          apk: 'v1.0.4-4',
          android: '10',
          cht: 'unknown',
          settings: '5-5ad24c388d1d4c4a7fcb6b05cff875ba'
        },
        {
          android: undefined,
          apk: undefined,
          browser: {
            name: undefined,
            version: undefined
          },
          cht: undefined,
          date: '2022-11-29',
          deviceId: 'b1c172d8-82b0-42fd-8401-313796b8c802',
          settings: undefined,
          user: 'min-data'
        }
      ]);
    });
  });

  it('handles invalid user agents', async () => {
    const rows = [
      {
        key: ['admin-central-2', 'd26e2875-53af-4e9b-b695-c82faf0db5d8'],
        value: {
          date: '2022-11-21',
          id: 'telemetry-2022-11-21-admin-central-2-d26e2875-53af-4e9b-b695-c82faf0db5d8',
          device: {
            userAgent: 'Not a real user agent',
            versions: { cht: 'unknown', settings: '4-83c8561a13479b245b295e97401f2f55' },
          },
        },
      },
      {
        key: ['chw1', 'b1c172d8-82b0-42fd-8401-313796b8c801'],
        value: {
          date: '2022-11-29',
          id: 'telemetry-2022-11-29-chw1-b1c172d8-82b0-42fd-8401-313796b8c801',
          device: {
            userAgent: { will: 'cause an error' },
            versions: {
              apk: 'v1.0.4-4',
              android: '10',
              cht: 'unknown',
              settings: '5-5ad24c388d1d4c4a7fcb6b05cff875ba',
            },
          },
        },
      },
    ];
    sinon.stub(db.medicUsersMeta, 'query').resolves({ rows });
    sinon.spy(logger, 'error');
    const actual = await service.exportObject('user-devices');
    actual.should.deep.equal([
      {
        user: 'admin-central-2',
        deviceId: 'd26e2875-53af-4e9b-b695-c82faf0db5d8',
        date: '2022-11-21',
        browser: {
          name: undefined,
          version: undefined,
        },
        apk: undefined,
        android: undefined,
        cht: 'unknown',
        settings: '4-83c8561a13479b245b295e97401f2f55'
      },
      {
        user: 'chw1',
        deviceId: 'b1c172d8-82b0-42fd-8401-313796b8c801',
        date: '2022-11-29',
        browser: {
          name: undefined,
          version: undefined,
        },
        apk: 'v1.0.4-4',
        android: '10',
        cht: 'unknown',
        settings: '5-5ad24c388d1d4c4a7fcb6b05cff875ba'
      }
    ]);
    logger.error.callCount.should.equal(1);
    logger.error.args[0][0].should
      .satisfy(msg => msg.startsWith('Error parsing user agent "{"will":"cause an error"}":'));
  });

  describe('Handle error', () => {
    it('emit error', () => {
      const type = 'feedback';
      const mapper = service._mapper(type);
      const getDocIds = sinon.stub(mapper, 'getDocIds');
      getDocIds.returns(Promise.reject({some: 'error'}));
      return mockRequest(type)
        .catch(err => {
          const expected = {some: 'error'};
          err.should.deep.equal(expected);
        });
    });

  });

});
