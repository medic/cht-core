describe('MessageContacts service', () => {

  'use strict';

  let service;
  let query;
  let getDataRecords;
  let hydrateMessages;
  let addReadStatus;

  beforeEach(() => {
    query = sinon.stub();
    getDataRecords = sinon.stub();
    hydrateMessages = sinon.stub();
    addReadStatus = {
      messages: sinon.stub()
    };
    addReadStatus.messages.returnsArg(0);
    module('inboxApp');
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({ query: query }));
      $provide.value('GetDataRecords', getDataRecords);
      $provide.value('HydrateMessages', hydrateMessages);
      $provide.value('AddReadStatus', addReadStatus);
    });
    inject($injector => service = $injector.get('MessageContacts'));
  });

  describe('list', () => {

    it('builds list', () => {
      query.returns(Promise.resolve({}));
      getDataRecords.returns(Promise.resolve({}));
      hydrateMessages.returns(Promise.resolve([]));
      return service.list().then(() => {
        chai.expect(query.args[0][1]).to.deep.equal({
          group_level: 1
        });
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
      query.returns(Promise.resolve({}));
      getDataRecords.returns(Promise.resolve({}));
      hydrateMessages.returns(Promise.resolve([]));
      return service.conversation('abc').then(() => {
        chai.expect(query.args[0][1]).to.deep.equal({
          reduce: false,
          descending: true,
          include_docs: true,
          skip: 0,
          limit: 50,
          startkey: [ 'abc', {} ],
          endkey: [ 'abc' ]
        });
      });
    });

    it('builds conversation with skip', () => {
      query.returns(Promise.resolve({}));
      getDataRecords.returns(Promise.resolve({}));
      hydrateMessages.returns(Promise.resolve([]));
      return service.conversation('abc', 45).then(() => {
        chai.expect(query.args[0][1]).to.deep.equal({
          reduce: false,
          descending: true,
          include_docs: true,
          skip: 45,
          limit: 50,
          startkey: [ 'abc', {} ],
          endkey: [ 'abc' ]
        });
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
