describe('MessageContacts service', () => {

  'use strict';

  let service,
      query,
      hydrateContactNames,
      addReadStatus;

  beforeEach(() => {
    query = sinon.stub();
    hydrateContactNames = sinon.stub();
    addReadStatus = {
      messages: sinon.stub()
    };
    addReadStatus.messages.returnsArg(0);
    module('inboxApp');
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({ query: query }));
      $provide.value('HydrateContactNames', hydrateContactNames);
      $provide.value('AddReadStatus', addReadStatus);
    });
    inject($injector => service = $injector.get('MessageContacts'));
  });

  describe('list', () => {

    it('builds list', () => {
      const given = [
        { key: [ '1234' ], value: { id: 'a', from: '1234' } },
        { key: [ '4321' ], value: { id: 'b', from: '4321' } },
      ];
      query.returns(Promise.resolve({ rows: given }));
      hydrateContactNames.returns(Promise.resolve([]));
      return service.list().then(() => {
        chai.expect(query.args[0][1]).to.deep.equal({
          group_level: 1
        });
        chai.expect(hydrateContactNames.args[0][0]).to.deep.equal([
          { id: 'a', from: '1234', key: '1234', type: 'phone' },
          { id: 'b', from: '4321', key: '4321', type: 'phone' },
        ]);
        chai.expect(addReadStatus.messages.callCount).to.equal(1);
      });
    });

    it('returns errors from db query', done => {
      query.returns(Promise.reject('server error'));
      service.list()
        .then(() => {
          done(new Error('exception expected'));
        })
        .catch(err => {
          chai.expect(err).to.equal('server error');
          done();
        });
    });

  });

  describe('conversation', () => {

    it('builds conversation', () => {
      const given = [ { id: 'a', key: ['a'], value: {}}, { id: 'b', key: ['b'], value: {} } ];
      const expected = [{
        id: 'a',
        key: ['a'],
        value: {
          key: 'a',
          type: 'unknown'
        }
      }, {
        id: 'b',
        key: ['b'],
        value: {
          key: 'b',
          type: 'unknown'
        }
      }];
      query.returns(Promise.resolve({ rows: given }));
      return service.conversation('abc').then(actual => {
        chai.expect(query.args[0][1]).to.deep.equal({
          reduce: false,
          descending: true,
          include_docs: true,
          skip: 0,
          limit: 50,
          startkey: [ 'abc', {} ],
          endkey: [ 'abc' ]
        });
        console.log('=========================================================');
        console.log(JSON.stringify(actual, null, 2));
        console.log('=========================================================');
        chai.expect(actual).to.deep.equal(expected);
      });
    });

    it('builds conversation with skip', () => {
      const given = [ { id: 'a', key: ['a'], value: {}}, { id: 'b', key: ['b'], value: {} } ];
      const expected = [{
        id: 'a',
        key: ['a'],
        value: {
          key: 'a',
          type: 'unknown'
        }
      }, {
        id: 'b',
        key: ['b'],
        value: {
          key: 'b',
          type: 'unknown'
        }
      }];
      query.returns(Promise.resolve({ rows: given }));
      return service.conversation('abc', 45).then(actual => {
        chai.expect(query.args[0][1]).to.deep.equal({
          reduce: false,
          descending: true,
          include_docs: true,
          skip: 45,
          limit: 50,
          startkey: [ 'abc', {} ],
          endkey: [ 'abc' ]
        });
        chai.expect(actual).to.deep.equal(expected);
      });
    });

    it('returns errors from db query', done => {
      query.returns(Promise.reject('server error'));
      service.conversation('abc')
        .then(() => {
          done(new Error('expected exception'));
        })
        .catch(err => {
          chai.expect(err).to.equal('server error');
          done();
        });
    });

  });

});
