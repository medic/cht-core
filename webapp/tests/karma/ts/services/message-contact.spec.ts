import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';

import { MessageContactService } from '../../../../src/ts/services/message-contact.service';
import { HydrateMessagesService } from '../../../../src/ts/services/hydrate-messages.service';
import { GetDataRecordsService } from '../../../../src/ts/services/get-data-records.service';
import { DbService } from '../../../../src/ts/services/db.service';

describe('Message Contacts Service', () => {
  let service: MessageContactService;
  let dbService;
  let getDataRecordsService;
  let hydrateMessagesService;

  beforeEach(() => {
    const dbMock = { get: () => ({ query: sinon.stub() }) };
    const getDataRecordsMock = { get: sinon.stub() };
    const hydrateMessagesMock = { hydrate: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        { provide: HydrateMessagesService, useValue: hydrateMessagesMock },
        { provide: GetDataRecordsService, useValue: getDataRecordsMock },
        { provide: DbService, useValue: dbMock },
      ]
    });

    service = TestBed.inject(MessageContactService);
    hydrateMessagesService = TestBed.inject(HydrateMessagesService);
    getDataRecordsService = TestBed.inject(GetDataRecordsService);
    dbService = TestBed.inject(DbService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return minimum limit', () => {
    expect(service.minLimit).to.equal(50);
  });

  describe('getList()', () => {
    it('should build list', () => {
      const dbRows = {
        rows: [
          { id: 'some_id1', value: { id: 'id1' } },
          { id: 'some_id2', value: { id: 'id2' } },
          { id: 'some_id3', value: { id: 'id3' } },
          { id: 'some_id4', value: { id: 'id4' } },
        ]
      };
      dbService.get = () => ({
        query: sinon.stub().returns(Promise.resolve(dbRows)),
        allDocs: sinon.stub().returns(Promise.resolve(dbRows))
      });
      getDataRecordsService.get.returns(Promise.resolve([
        { _id: 'id1' },
        { _id: 'id2' },
        { _id: 'id3' },
        { _id: 'id4' },
      ]));
      hydrateMessagesService.hydrate.returns(Promise.resolve([
        { id: 'some_id1', hydrated: true },
        { id: 'some_id2', hydrated: true },
        { id: 'some_id3', hydrated: true },
        { id: 'some_id4', hydrated: true },
      ]));

      return service
        .getList()
        .then(list => {
          expect(getDataRecordsService.get.callCount).to.equal(1);
          expect(getDataRecordsService.get.args[0]).to.deep.equal([['id1', 'id2', 'id3', 'id4'], { include_docs: true }]);
          expect(hydrateMessagesService.hydrate.callCount).to.equal(1);
          expect(hydrateMessagesService.hydrate.args[0]).to.deep.equal([[
            { id: 'some_id1', value: { id: 'id1' }, doc: { _id: 'id1' } },
            { id: 'some_id2', value: { id: 'id2' }, doc: { _id: 'id2' } },
            { id: 'some_id3', value: { id: 'id3' }, doc: { _id: 'id3' } },
            { id: 'some_id4', value: { id: 'id4' }, doc: { _id: 'id4' } },
          ]]);
          expect(list).to.deep.equal([
            { id: 'some_id1', hydrated: true, read: true },
            { id: 'some_id2', hydrated: true, read: true },
            { id: 'some_id3', hydrated: true, read: true },
            { id: 'some_id4', hydrated: true, read: true },
          ]);
        });
    });

    it('should return errors from db query', () => {
      dbService.get = () => ({
        query: sinon.stub().returns(Promise.reject('server error'))
      });

      service
        .getList()
        .then(() => {
          assert.fail('exception expected');
        })
        .catch(err => {
          expect(err).to.equal('server error');
        });
    });
  });

  describe('getConversation()', () => {
    it('should build conversation', () => {
      const expectedQueryParams = {
        reduce: false,
        descending: true,
        include_docs: true,
        skip: 0,
        limit: 50,
        startkey: [ 'abc', {} ],
        endkey: [ 'abc' ]
      };
      const dbRows = {
        rows: [
          { id: 'some_id1', value: { id: 'id1' }, doc: { _id: 'some_id1' } },
          { id: 'some_id2', value: { id: 'id2' }, doc: { _id: 'some_id2' } },
          { id: 'some_id3', value: { id: 'id3' }, doc: { _id: 'some_id3' } },
          { id: 'some_id4', value: { id: 'id4' }, doc: { _id: 'some_id4' } },
        ]
      };
      const query = sinon.stub().returns(Promise.resolve(dbRows));
      dbService.get = () => ({
        query,
        allDocs: sinon.stub().returns(Promise.resolve(dbRows))
      });
      hydrateMessagesService.hydrate.returns(Promise.resolve([
        { id: 'some_id1', value: { id: 'id1' }, doc: { _id: 'some_id1' }, hydrated: true },
        { id: 'some_id2', value: { id: 'id2' }, doc: { _id: 'some_id2' }, hydrated: true },
        { id: 'some_id3', value: { id: 'id3' }, doc: { _id: 'some_id3' }, hydrated: true },
        { id: 'some_id4', value: { id: 'id4' }, doc: { _id: 'some_id4' }, hydrated: true },
      ]));

      return service
        .getConversation('abc')
        .then(result => {
          expect(query.args[0][1]).to.deep.equal(expectedQueryParams);
          chai.expect(getDataRecordsService.get.callCount).to.equal(0);
          chai.expect(hydrateMessagesService.hydrate.callCount).to.equal(1);
          chai.expect(hydrateMessagesService.hydrate.args[0]).to.deep.equal([[
            { id: 'some_id1', value: { id: 'id1' }, doc: { _id: 'some_id1' } },
            { id: 'some_id2', value: { id: 'id2' }, doc: { _id: 'some_id2' } },
            { id: 'some_id3', value: { id: 'id3' }, doc: { _id: 'some_id3' } },
            { id: 'some_id4', value: { id: 'id4' }, doc: { _id: 'some_id4' } },
          ]]);
          chai.expect(result).to.deep.equal([
            { id: 'some_id1', value: { id: 'id1' }, doc: { _id: 'some_id1' }, hydrated: true, read: true },
            { id: 'some_id2', value: { id: 'id2' }, doc: { _id: 'some_id2' }, hydrated: true, read: true },
            { id: 'some_id3', value: { id: 'id3' }, doc: { _id: 'some_id3' }, hydrated: true, read: true },
            { id: 'some_id4', value: { id: 'id4' }, doc: { _id: 'some_id4' }, hydrated: true, read: true },
          ]);
        });
    });

    it('should build conversation with skip', () => {
      const expectedQueryParams = {
        reduce: false,
        descending: true,
        include_docs: true,
        skip: 45,
        limit: 50,
        startkey: [ 'abc', {} ],
        endkey: [ 'abc' ]
      };
      const query = sinon.stub().returns(Promise.resolve({}));
      dbService.get = () => ({
        query,
        allDocs: sinon.stub().returns(Promise.resolve({}))
      });
      hydrateMessagesService.hydrate.returns(Promise.resolve([]));

      return service
        .getConversation('abc', 45)
        .then(result => {
          expect(query.args[0][1]).to.deep.equal(expectedQueryParams);
          expect(getDataRecordsService.get.callCount).to.deep.equal(0);
          expect(hydrateMessagesService.hydrate.callCount).to.equal(1);
          expect(hydrateMessagesService.hydrate.args[0]).to.deep.equal([[]]);
          expect(result).to.deep.equal([]);
        });
    });

    it('should build conversation with limit', () => {
      const expectedQueryParams = {
        reduce: false,
        descending: true,
        include_docs: true,
        skip: 45,
        limit: 120,
        startkey: [ 'abc', {} ],
        endkey: [ 'abc' ]
      };
      const query = sinon.stub().returns(Promise.resolve({}));
      dbService.get = () => ({
        query,
        allDocs: sinon.stub().returns(Promise.resolve({}))
      });
      hydrateMessagesService.hydrate.returns(Promise.resolve([]));

      return service
        .getConversation('abc', 45, 120)
        .then(result => {
        expect(query.args[0][1]).to.deep.equal(expectedQueryParams);
        expect(getDataRecordsService.get.callCount).to.deep.equal(0);
        expect(hydrateMessagesService.hydrate.callCount).to.equal(1);
        expect(hydrateMessagesService.hydrate.args[0]).to.deep.equal([[]]);
        expect(result).to.deep.equal([]);
      });
    });

    it('should build conversation with limit under default', () => {
      const expectedQueryParams = {
        reduce: false,
        descending: true,
        include_docs: true,
        skip: 45,
        limit: 50,
        startkey: [ 'abc', {} ],
        endkey: [ 'abc' ]
      };
      const query = sinon.stub().returns(Promise.resolve({}));
      dbService.get = () => ({
        query,
        allDocs: sinon.stub().returns(Promise.resolve({}))
      });
      hydrateMessagesService.hydrate.returns(Promise.resolve([]));


      return service
        .getConversation('abc', 45, 45)
        .then(result => {
          expect(query.args[0][1]).to.deep.equal(expectedQueryParams);
          expect(getDataRecordsService.get.callCount).to.deep.equal(0);
          expect(hydrateMessagesService.hydrate.callCount).to.equal(1);
          expect(hydrateMessagesService.hydrate.args[0]).to.deep.equal([[]]);
          expect(result).to.deep.equal([]);
        });
    });

    it('should return errors from db query', () => {
      dbService.get = () => ({
        query: sinon.stub().returns(Promise.reject('server error'))
      });

      service
        .getConversation('abc')
        .then(() => {
          assert.fail('expected exception');
        })
        .catch(err => {
          expect(err).to.equal('server error');
        });
    });
  });

  describe('isRelevantChange()', () => {
    it('should return falsy when change is not relevant', () => {
      expect(!!service.isRelevantChange({})).to.equal(false);
      expect(!!service.isRelevantChange({ id: 'some' })).to.equal(false);
      expect(!!service.isRelevantChange({ id: 'some', doc: {} })).to.equal(false);
      expect(!!service.isRelevantChange({ id: 'some', doc: {}, delete: false })).to.equal(false);
      expect(!!service.isRelevantChange({ id: 'some', doc: { kujua_message: false }, delete: false }))
        .to.equal(false);
      expect(!!service.isRelevantChange({ id: 'some', doc: { sms_message: false }, delete: false }))
        .to.equal(false);
      expect(!!service.isRelevantChange({ id: 'some', doc: {} }, {})).to.equal(false);
      expect(!!service.isRelevantChange({ id: 'some', doc: {} }, { messages: [] })).to.equal(false);
      const messages = [
        { doc: { _id: 'one' } },
        { doc: { _id: 'two' } },
        { doc: { _id: 'three' } }
      ];
      expect(!!service.isRelevantChange({ id: 'some', doc: {} }, { messages })).to.equal(false);
    });

    it('should return truthy when change is relevant', () => {
      expect(!!service.isRelevantChange({ deleted: true })).to.equal(true);
      expect(!!service.isRelevantChange({ id: 'some', doc: { kujua_message: true } })).to.equal(true);
      expect(!!service.isRelevantChange({ id: 'some', doc: { sms_message: true } })).to.equal(true);
      const messages = [
        { doc: { _id: 'one' } },
        { doc: { _id: 'two' } },
        { doc: { _id: 'three' } }
      ];
      expect(!!service.isRelevantChange({ id: 'one' }, { messages })).to.equal(true);
    });
  });
});
