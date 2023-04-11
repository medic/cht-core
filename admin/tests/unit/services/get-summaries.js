describe('GetSummaries service', () => {

  'use strict';

  let service;
  let query;
  let allDocs;
  let includes;
  let isOnlineOnly;

  beforeEach(() => {
    query = sinon.stub();
    allDocs = sinon.stub();
    includes = sinon.stub();
    isOnlineOnly = sinon.stub();

    module('adminApp');
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({ query, allDocs }));
      $provide.value('ContactTypes', { includes });
      $provide.value('Session', { isOnlineOnly });
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject($injector => service = $injector.get('GetSummaries'));
  });

  it('returns empty array when given no ids', () => {
    return service().then(actual => {
      chai.expect(actual).to.deep.equal([]);
    });
  });

  it('returns empty array when given empty array', () => {
    return service([]).then(actual => {
      chai.expect(actual).to.deep.equal([]);
    });
  });

  describe('online users', () => {

    beforeEach(() => isOnlineOnly.returns(true));

    it('queries the view and returns', () => {
      query.resolves({ rows: [
        {
          id: 'a',
          value: { reported_date: 1 }
        },
        {
          id: 'b',
          value: { reported_date: 2 }
        },
      ] });
      return service([ 'a', 'b' ]).then(actual => {
        chai.expect(query.callCount).to.equal(1);
        chai.expect(query.args[0][0]).to.equal('medic/doc_summaries_by_id');
        chai.expect(query.args[0][1]).to.deep.equal({ keys: [ 'a', 'b' ] });
        chai.expect(allDocs.callCount).to.equal(0);
        chai.expect(actual).to.deep.equal([
          {
            _id: 'a',
            reported_date: 1
          },
          {
            _id: 'b',
            reported_date: 2
          },
        ]);
      });
    });

  });

  describe('restricted users', () => {

    beforeEach(() => isOnlineOnly.returns(false));

    it('queries allDocs and summarises reports', () => {
      allDocs.resolves({ rows: [
        { doc: {
          _id: 'a',
          _rev: '1',
          type: 'data_record',
          form: 'delivery',
          from: '+123',
          contact: {
            _id: 'c',
            phone: '+456',
            parent: {
              _id: 'd',
              parent: {
                _id: 'e'
              }
            }
          },
          verified: true,
          reported_date: 100,
          fields: {
            patient_name: 'jeff',
            patient_id: 'f'
          }
        } },
        { doc: {
          _id: 'b',
          _rev: '2',
          type: 'data_record',
          form: 'registration',
          sent_by: '+321',
          errors: [ { code: 'sys.missing_fields', fields: [ 'patient_id' ] } ],
          reported_date: 200
        } },
      ] });
      return service([ 'a', 'b' ]).then(actual => {
        chai.expect(query.callCount).to.equal(0);
        chai.expect(allDocs.callCount).to.equal(1);
        chai.expect(allDocs.args[0][0]).to.deep.equal({ keys: [ 'a', 'b' ], include_docs: true });
        chai.expect(actual).to.deep.equal([
          {
            _id: 'a',
            _rev: '1',
            from: '+123',
            phone: '+456',
            form: 'delivery',
            read: undefined,
            valid: true,
            verified: true,
            reported_date: 100,
            contact: 'c',
            lineage: [ 'd', 'e' ],
            subject: {
              name: 'jeff',
              value: 'f',
              type: 'reference'
            },
            case_id: undefined
          },
          {
            _id: 'b',
            _rev: '2',
            from: '+321',
            phone: undefined,
            form: 'registration',
            read: undefined,
            valid: false,
            verified: undefined,
            reported_date: 200,
            contact: undefined,
            lineage: [],
            subject: {
              type: 'unknown'
            },
            case_id: undefined
          }
        ]);
      });
    });

    it('queries allDocs and summarises contacts', () => {
      includes.returns(true);
      allDocs.resolves({ rows: [
        { doc: {
          _id: 'a',
          _rev: '1',
          type: 'person',
          name: 'james',
          phone: '+456',
          contact: {
            _id: 'c',
            phone: '+456',
            parent: {
              _id: 'd',
              parent: {
                _id: 'e'
              }
            }
          },
          date_of_death: 999
        } },
        { doc: {
          _id: 'b',
          _rev: '2',
          type: 'contact',
          contact_type: 'patient',
          phone: '+123',
          parent: {
            _id: 'f',
            parent: {
              _id: 'g'
            }
          },
          muted: true
        } },
      ] });
      return service([ 'a', 'b' ]).then(actual => {
        chai.expect(query.callCount).to.equal(0);
        chai.expect(allDocs.callCount).to.equal(1);
        chai.expect(allDocs.args[0][0]).to.deep.equal({ keys: [ 'a', 'b' ], include_docs: true });
        chai.expect(actual).to.deep.equal([
          {
            _id: 'a',
            _rev: '1',
            name: 'james',
            phone: '+456',
            type: 'person',
            contact_type: undefined,
            contact: 'c',
            lineage: [],
            date_of_death: 999,
            muted: undefined
          },
          {
            _id: 'b',
            _rev: '2',
            name: '+123',
            phone: '+123',
            type: 'contact',
            contact_type: 'patient',
            contact: undefined,
            lineage: [ 'f', 'g' ],
            date_of_death: undefined,
            muted: true
          }
        ]);
      });
    });

    it('queries allDocs and ignores other types', () => {
      includes.returns(false);
      allDocs.resolves({ rows: [
        { doc: {
          type: 'form'
        } }
      ] });
      return service([ 'a', 'b' ]).then(actual => {
        chai.expect(actual).to.deep.equal([]);
      });
    });

    it('queries allDocs and ignores docs that are missing', () => {
      includes.returns(false);
      allDocs.resolves({ rows: [ { key: 'a', error: 'not_found' } ] });
      return service([ 'a' ]).then(actual => {
        chai.expect(actual).to.deep.equal([]);
      });
    });

  });

});
