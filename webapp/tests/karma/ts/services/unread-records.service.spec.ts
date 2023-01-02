import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { of } from 'rxjs';

import { UnreadRecordsService } from '@mm-services/unread-records.service';
import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import { ChangesService } from '@mm-services/changes.service';

describe('UnreadRecordsService', () => {
  let service: UnreadRecordsService;
  let dbService;
  let dbInstance;
  let changesService;
  let sessionService;

  beforeEach(() => {
    dbInstance = {
      info: sinon.stub().resolves(),
      put: sinon.stub(),
      get: sinon.stub(),
      query: sinon.stub()
    };
    dbService = { get: () => dbInstance };
    changesService = { subscribe: sinon.stub().returns({ unsubscribe: sinon.stub() }) };
    sessionService = { isOnlineOnly: sinon.stub() };
    
    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: SessionService, useValue: sessionService },
        { provide: ChangesService, useValue: changesService }
      ]
    });
    
    service = TestBed.inject(UnreadRecordsService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should be created', () => {
    expect(service).to.exist;
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(service.subscriptions, 'unsubscribe');

    service.ngOnDestroy();

    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });

  describe('count unread', () => {
    it('should return zero when no data_records', fakeAsync(() => {
      let result;
      dbInstance.query.resolves({ rows: [] });

      service.init((err, actual) => result = actual);
      tick();

      expect(result).to.deep.equal({ report: 0, message: 0 });
    }));

    it('should return all data_records when none read', fakeAsync(() => {
      let result;
      dbInstance.query.onCall(0).resolves({
        rows: [
          { key: 'report', value: 13 },
          { key: 'message', value: 5 }
        ]
      });
      dbInstance.query.onCall(1).resolves({ rows: [] });

      service.init((err, actual) => result = actual);
      tick();

      expect(result).to.deep.equal({ report: 13, message: 5 });
    }));

    it('should return total', fakeAsync(() => {
      let result;
      dbInstance.query.onCall(0).resolves({
        rows: [
          { key: 'report', value: 13 },
          { key: 'message', value: 5 }
        ]
      });
      dbInstance.query.onCall(1).resolves({
        rows: [
          { key: 'report', value: 3 }
        ]
      });

      service.init((err, actual) => result = actual);
      tick();

      expect(result).to.deep.equal({ report: 10, message: 5 });
      expect(dbInstance.query.callCount).to.equal(2);
      expect(dbInstance.query.args[0][0]).to.equal('medic-client/data_records_by_type');
      expect(dbInstance.query.args[0][1].group).to.equal(true);
      expect(dbInstance.query.args[1][0]).to.equal('medic-user/read');
      expect(dbInstance.query.args[1][1].group).to.equal(true);
    }));

    it('should call the callback if a change happens', fakeAsync(() => {
      const results = [];
      dbInstance.query.onCall(0).resolves({
        rows: [
          { key: 'report', value: 13 },
          { key: 'message', value: 5 }
        ]
      });
      dbInstance.query.onCall(1).resolves({
        rows: [
          { key: 'report', value: 3 }
        ]
      });
      dbInstance.query.onCall(2).resolves({
        rows: [
          { key: 'report', value: 14 },
          { key: 'message', value: 5 }
        ]
      });
      dbInstance.query.onCall(3).resolves({
        rows: [
          { key: 'report', value: 3 }
        ]
      });

      service.init((err, actual) => results.push(actual));
      tick();

      expect(changesService.subscribe.callCount).to.equal(2); // one for medic and one for meta
      changesService.subscribe.args[0][0].callback({ id: 'abc' });
      tick();
      expect(dbInstance.query.callCount).to.equal(4);
      expect(results[1]).to.deep.equal({ report: 11, message: 5 });
    }));

    it('should update the count if the meta db is updated', fakeAsync(() => {
      const results = [];
      dbInstance.query.onCall(0).resolves({
        rows: [
          { key: 'report', value: 13 },
          { key: 'message', value: 5 }
        ]
      });
      dbInstance.query.onCall(1).resolves({
        rows: [
          { key: 'report', value: 3 }
        ]
      });
      dbInstance.query.onCall(2).resolves({
        rows: [
          { key: 'report', value: 14 },
          { key: 'message', value: 5 }
        ]
      });
      dbInstance.query.onCall(3).resolves({
        rows: [
          { key: 'report', value: 3 }
        ]
      });

      service.init((err, actual) => results.push(actual));
      tick();

      changesService.subscribe.args[1][0].callback({ id: 'abc' });
      tick();
      expect(dbInstance.query.callCount).to.equal(4);
      expect(results[1]).to.deep.equal({ report: 11, message: 5 });
    }));
  });

  describe('meta db cleanup', () => {
    it('should not delete if admin', fakeAsync(() => {
      const errors = [];
      dbInstance.query.onCall(0).resolves({
        rows: [
          { key: 'report', value: 13 },
          { key: 'message', value: 5 }
        ]
      });
      dbInstance.query.onCall(1).resolves({
        rows: [
          { key: 'report', value: 3 }
        ]
      });
      dbInstance.query.onCall(2).resolves({
        rows: [
          { key: 'report', value: 13 },
          { key: 'message', value: 5 }
        ]
      });
      dbInstance.query.onCall(3).resolves({
        rows: [
          { key: 'report', value: 3 }
        ]
      });
      sessionService.isOnlineOnly.returns(true);
      dbInstance.get.resolves({ _id: 'abc' });
      dbInstance.put.resolves();

      service.init((err) => {
        if (err) {
          errors.push(err);
        }
      });
      tick();

      expect(changesService.subscribe.callCount).to.equal(2);
      changesService.subscribe.args[0][0].callback({
        deleted: true,
        id: 'abc',
        doc: { _id: 'abc', form: 'Assessment' }
      });
      tick();
      expect(dbInstance.query.callCount).to.equal(4);
      expect(dbInstance.get.callCount).to.equal(0);
      expect(dbInstance.put.callCount).to.equal(0);
      expect(errors.length).to.equal(0);
    }));

    it('should delete the read doc when a deletion happens', fakeAsync(() => {
      const results = [];
      const errors = [];
      dbInstance.query.onCall(0).resolves({
        rows: [
          { key: 'report', value: 13 },
          { key: 'message', value: 5 }
        ]
      });
      dbInstance.query.onCall(1).resolves({
        rows: [
          { key: 'report', value: 3 }
        ]
      });
      dbInstance.query.onCall(2).resolves({
        rows: [
          { key: 'report', value: 12 },
          { key: 'message', value: 5 }
        ]
      });
      dbInstance.query.onCall(3).resolves({
        rows: [
          { key: 'report', value: 3 }
        ]
      });
      sessionService.isOnlineOnly.returns(false);
      dbInstance.get.resolves({ _id: 'abc' });
      dbInstance.put.resolves();

      service.init((err, actual) => {
        if (err) {
          errors.push(err);
        }
        if (actual) {
          results.push(actual);
        }
      });
      tick();

      expect(changesService.subscribe.callCount).to.equal(2);
      changesService.subscribe.args[0][0].callback({
        deleted: true,
        id: 'abc',
        doc: { _id: 'abc', form: 'Assessment' }
      });
      tick();
      expect(dbInstance.query.callCount).to.equal(4);
      expect(results[1]).to.deep.equal({ report: 9, message: 5 });
      expect(dbInstance.get.callCount).to.equal(1);
      expect(dbInstance.get.args[0][0]).to.equal('read:report:abc');
      expect(dbInstance.put.callCount).to.equal(1);
      expect(dbInstance.put.args[0][0]._deleted).to.equal(true);
      expect(errors.length).to.equal(0);
    }));
  });

});
