import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect, assert } from 'chai';
import * as _ from 'lodash-es';

import { MessageContactService } from '../../../../src/ts/services/message-contact.service';
import { HydrateMessagesService } from '../../../../src/ts/services/hydrate-messages.service';
import { GetDataRecordsService } from '../../../../src/ts/services/get-data-records.service';
import { DbService } from '../../../../src/ts/services/db.service';
import { compact } from 'lodash-es';

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
      dbService.get().query.returns(Promise.resolve({
        rows: [
          { id: 'some_id1', value: { id: 'id1' } },
          { id: 'some_id2', value: { id: 'id2' } },
          { id: 'some_id3', value: { id: 'id3' } },
          { id: 'some_id4', value: { id: 'id4' } },
        ]
      }));
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
            { id: 'some_id1', hydrated: true },
            { id: 'some_id2', hydrated: true },
            { id: 'some_id3', hydrated: true },
            { id: 'some_id4', hydrated: true },
          ]);
        });
    });
/*
    it('should return errors from db query', () => {
      dbService.get().query.returns(Promise.reject('server error'));

      service
        .getList()
        .then(() => {
          assert.fail('exception expected');
        })
        .catch(err => {
          expect(err).to.equal('server error');
        });
    });*/
  });
});
