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
      query.resolves({
        rows: [
          { id: 'some_id1', value: { id: 'id1' } },
          { id: 'some_id2', value: { id: 'id2' } },
          { id: 'some_id3', value: { id: 'id3' } },
          { id: 'some_id4', value: { id: 'id4' } },
        ]
      });
      getDataRecords.resolves([
        { _id: 'id1' },
        { _id: 'id2' },
        { _id: 'id3' },
        { _id: 'id4' },
      ]);
      hydrateMessages.resolves([
        { id: 'some_id1', hydrated: true },
        { id: 'some_id2', hydrated: true },
        { id: 'some_id3', hydrated: true },
        { id: 'some_id4', hydrated: true },
      ]);
      return service.list().then(list => {
        chai.expect(query.args[0][1]).to.deep.equal({
          group_level: 1
        });
        chai.expect(addReadStatus.messages.callCount).to.equal(1);
        chai.expect(getDataRecords.callCount).to.equal(1);
        chai.expect(getDataRecords.args[0]).to.deep.equal([['id1', 'id2', 'id3', 'id4'], { include_docs: true }]);
        chai.expect(hydrateMessages.callCount).to.equal(1);
        chai.expect(hydrateMessages.args[0]).to.deep.equal([[
          { id: 'some_id1', value: { id: 'id1' }, doc: { _id: 'id1' } },
          { id: 'some_id2', value: { id: 'id2' }, doc: { _id: 'id2' } },
          { id: 'some_id3', value: { id: 'id3' }, doc: { _id: 'id3' } },
          { id: 'some_id4', value: { id: 'id4' }, doc: { _id: 'id4' } },
        ]]);
        chai.expect(list).to.deep.equal([
          { id: 'some_id1', hydrated: true },
          { id: 'some_id2', hydrated: true },
          { id: 'some_id3', hydrated: true },
          { id: 'some_id4', hydrated: true },
        ]);
      });
    });

    it('returns errors from db query', () => {
      query.rejects('server error');
      service
        .list()
        .then(() => {
          chai.assert.fail('exception expected');
        })
        .catch(err => {
          chai.expect(err).to.equal('server error');
        });
    });

  });

  describe('conversation', () => {

    it('builds conversation', () => {
      query.resolves({
        rows: [
          { id: 'some_id1', value: { id: 'id1' }, doc: { _id: 'some_id1' } },
          { id: 'some_id2', value: { id: 'id2' }, doc: { _id: 'some_id2' } },
          { id: 'some_id3', value: { id: 'id3' }, doc: { _id: 'some_id3' } },
          { id: 'some_id4', value: { id: 'id4' }, doc: { _id: 'some_id4' } },
        ]
      });

      hydrateMessages.resolves([
        { id: 'some_id1', value: { id: 'id1' }, doc: { _id: 'some_id1' }, hydrated: true },
        { id: 'some_id2', value: { id: 'id2' }, doc: { _id: 'some_id2' }, hydrated: true },
        { id: 'some_id3', value: { id: 'id3' }, doc: { _id: 'some_id3' }, hydrated: true },
        { id: 'some_id4', value: { id: 'id4' }, doc: { _id: 'some_id4' }, hydrated: true },
      ]);
      return service.conversation('abc').then(result => {
        chai.expect(query.args[0][1]).to.deep.equal({
          reduce: false,
          descending: true,
          include_docs: true,
          skip: 0,
          limit: 50,
          startkey: [ 'abc', {} ],
          endkey: [ 'abc' ]
        });

        chai.expect(getDataRecords.callCount).to.equal(0);
        chai.expect(hydrateMessages.callCount).to.equal(1);
        chai.expect(hydrateMessages.args[0]).to.deep.equal([[
          { id: 'some_id1', value: { id: 'id1' }, doc: { _id: 'some_id1' } },
          { id: 'some_id2', value: { id: 'id2' }, doc: { _id: 'some_id2' } },
          { id: 'some_id3', value: { id: 'id3' }, doc: { _id: 'some_id3' } },
          { id: 'some_id4', value: { id: 'id4' }, doc: { _id: 'some_id4' } },
        ]]);
        chai.expect(result).to.deep.equal([
          { id: 'some_id1', value: { id: 'id1' }, doc: { _id: 'some_id1' }, hydrated: true },
          { id: 'some_id2', value: { id: 'id2' }, doc: { _id: 'some_id2' }, hydrated: true },
          { id: 'some_id3', value: { id: 'id3' }, doc: { _id: 'some_id3' }, hydrated: true },
          { id: 'some_id4', value: { id: 'id4' }, doc: { _id: 'some_id4' }, hydrated: true },
        ]);
      });
    });

    it('builds conversation with skip', () => {
      query.resolves({});
      hydrateMessages.resolves([]);
      return service.conversation('abc', 45).then(result => {
        chai.expect(query.args[0][1]).to.deep.equal({
          reduce: false,
          descending: true,
          include_docs: true,
          skip: 45,
          limit: 50,
          startkey: [ 'abc', {} ],
          endkey: [ 'abc' ]
        });
        chai.expect(getDataRecords.callCount).to.deep.equal(0);
        chai.expect(hydrateMessages.callCount).to.equal(1);
        chai.expect(hydrateMessages.args[0]).to.deep.equal([[]]);
        chai.expect(result).to.deep.equal([]);
      });
    });

    it('builds conversation with limit', () => {
      query.resolves({});
      hydrateMessages.resolves([]);
      return service.conversation('abc', 45, 120).then(result => {
        chai.expect(query.args[0][1]).to.deep.equal({
          reduce: false,
          descending: true,
          include_docs: true,
          skip: 45,
          limit: 120,
          startkey: [ 'abc', {} ],
          endkey: [ 'abc' ]
        });
        chai.expect(getDataRecords.callCount).to.deep.equal(0);
        chai.expect(hydrateMessages.callCount).to.equal(1);
        chai.expect(hydrateMessages.args[0]).to.deep.equal([[]]);
        chai.expect(result).to.deep.equal([]);
      });
    });

    it('should build conversation with limit under default', () => {
      query.resolves({});
      hydrateMessages.resolves([]);
      return service.conversation('abc', 45, 45).then(result => {
        chai.expect(query.args[0][1]).to.deep.equal({
          reduce: false,
          descending: true,
          include_docs: true,
          skip: 45,
          limit: 50,
          startkey: [ 'abc', {} ],
          endkey: [ 'abc' ]
        });
        chai.expect(getDataRecords.callCount).to.deep.equal(0);
        chai.expect(hydrateMessages.callCount).to.equal(1);
        chai.expect(hydrateMessages.args[0]).to.deep.equal([[]]);
        chai.expect(result).to.deep.equal([]);
      });
    });

    it('returns errors from db query', () => {
      query.rejects('server error');
      service
        .conversation('abc')
        .then(() => {
          chai.assert.fail('expected exception');
        })
        .catch(err => {
          chai.expect(err).to.equal('server error');
        });
    });

  });

  it('should return default limit', () => {
    chai.expect(service.defaultLimit).to.equal(50);
  });

  describe('isRelevantChange', () => {
    it('should return falsy when change is not relevant', () => {
      chai.expect(!!service.isRelevantChange({})).to.equal(false);
      chai.expect(!!service.isRelevantChange({ id: 'some' })).to.equal(false);
      chai.expect(!!service.isRelevantChange({ id: 'some', doc: {} })).to.equal(false);
      chai.expect(!!service.isRelevantChange({ id: 'some', doc: {}, delete: false })).to.equal(false);
      chai.expect(!!service.isRelevantChange({ id: 'some', doc: { kujua_message: false }, delete: false }))
        .to.equal(false);
      chai.expect(!!service.isRelevantChange({ id: 'some', doc: { sms_message: false }, delete: false }))
        .to.equal(false);
      chai.expect(!!service.isRelevantChange({ id: 'some', doc: {} }, {})).to.equal(false);
      chai.expect(!!service.isRelevantChange({ id: 'some', doc: {} }, { messages: [] })).to.equal(false);
      const messages = [
        { doc: { _id: 'one' } },
        { doc: { _id: 'two' } },
        { doc: { _id: 'three' } }
      ];
      chai.expect(!!service.isRelevantChange({ id: 'some', doc: {} }, { messages })).to.equal(false);
    });

    it('should return truthy when change is relevant', () => {
      chai.expect(!!service.isRelevantChange({ deleted: true })).to.equal(true);
      chai.expect(!!service.isRelevantChange({ id: 'some', doc: { kujua_message: true } })).to.equal(true);
      chai.expect(!!service.isRelevantChange({ id: 'some', doc: { sms_message: true } })).to.equal(true);
      const messages = [
        { doc: { _id: 'one' } },
        { doc: { _id: 'two' } },
        { doc: { _id: 'three' } }
      ];
      chai.expect(!!service.isRelevantChange({ id: 'one' }, { messages })).to.equal(true);
    });
  });

});
