import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { ContactStatsService } from '@mm-services/contact-stats.service';
import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';
import * as moment from 'moment';

describe.only('ContactStats Service', () => {
  let service: ContactStatsService;
  let clock;
  let localDb;
  let dbService;
  let sessionService;

  beforeEach(() => {
    clock = sinon.useFakeTimers(moment('2021-04-07 18:18:18').valueOf());
    localDb = { query: sinon.stub() };
    dbService = {
      get: sinon.stub().returns(localDb)
    };
    sessionService = {
      isOnlineOnly: sinon.stub()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: SessionService, useValue: sessionService },
      ]
    });
    service = TestBed.inject(ContactStatsService);
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  it('should get visit stats and query with key for online user', async () => {
    const contactId = '2b';
    const range = {
      start: moment('2021-03-26 00:00:00.000').valueOf(),
      end: moment('2021-04-25 23:59:59.999').valueOf()
    };
    const visitCountSettings = {
      monthStartDate: 26,
      visitCountGoal: 5
    };
    // Query - last visited date
    localDb.query.onCall(0).returns({ rows: [
      {
        key: '1a',
        value: moment('2021-04-25 12:59:59').valueOf()
      },
      {
        key: '2b',
        value: moment('2021-04-15 22:59:59').valueOf()
      }
    ]});
    // Query - visits to contact
    localDb.query.onCall(1).returns({ rows: [
      {
        key: moment('2021-04-25 12:59:59').valueOf(),
        value: '1a'
      },
      {
        key: moment('2021-04-15 22:59:59').valueOf(),
        value: '2b'
      },
      {
        key: moment('2021-04-17 22:59:59').valueOf(),
        value: '2b'
      }
    ]});

    sessionService.isOnlineOnly.returns(true);
    const result = await service.getVisitStats(contactId, visitCountSettings);

    expect(result).to.deep.equal({
      lastVisitedDate: moment('2021-04-15 22:59:59').valueOf(),
      count: 2,
      countGoal: 5
    });
    expect(localDb.query.args[0]).to.have.deep.members([
      'medic-client/contacts_by_last_visited',
      { group: true, 'reduce': true, key: '2b' }
    ]);
    expect(localDb.query.args[1]).to.have.deep.members([
      'medic-client/visits_by_date',
      {start_key: range.start, end_key: range.end }
    ]);
  });

  it('should get visit stats and not query with key for offline user', async () => {
    const contactId = '2b';
    const range = {
      start: moment('2021-03-26 00:00:00.000').valueOf(),
      end: moment('2021-04-25 23:59:59.999').valueOf()
    };
    const visitCountSettings = {
      monthStartDate: 26,
      visitCountGoal: 5
    };
    // Query - last visited date
    localDb.query.onCall(0).returns({ rows: [
      {
        key: '1a',
        value: moment('2021-04-23 20:59:59').valueOf()
      },
      {
        key: '2b',
        value: moment('2021-04-15 22:59:59').valueOf()
      }
    ]});
    // Query - visits to contact
    localDb.query.onCall(1).returns({ rows: [
      {
        key: moment('2021-04-25 12:59:59').valueOf(),
        value: '1a'
      },
      {
        key: moment('2021-04-15 22:59:59').valueOf(),
        value: '2b'
      }
    ]});

    sessionService.isOnlineOnly.returns(false);
    const result = await service.getVisitStats(contactId, visitCountSettings);

    expect(result).to.deep.equal({
      lastVisitedDate: moment('2021-04-15 22:59:59').valueOf(),
      count: 1,
      countGoal: 5
    });
    expect(localDb.query.args[0]).to.have.deep.members([
      'medic-client/contacts_by_last_visited',
      { group: true, 'reduce': true }
    ]);
    expect(localDb.query.args[1]).to.have.deep.members([
      'medic-client/visits_by_date',
      {start_key: range.start, end_key: range.end }
    ]);
  });

  it('should not crash if contact isnt found', async () => {
    const contactId = '3c';
    const range = {
      start: moment('2021-03-26 00:00:00.000').valueOf(),
      end: moment('2021-04-25 23:59:59.999').valueOf()
    };
    const visitCountSettings = {
      monthStartDate: 26,
      visitCountGoal: 4
    };
    // Query - last visited date
    localDb.query.onCall(0).returns({ rows: [
      {
        key: '1a',
        value: moment('2021-04-23 20:59:59').valueOf()
      },
      {
        key: '2b',
        value: moment('2021-04-15 22:59:59').valueOf()
      }
    ]});
    // Query - visits to contact
    localDb.query.onCall(1).returns({ rows: [
      {
        key: moment('2021-04-15 22:59:59').valueOf(),
        value: '1a'
      }
    ]});

    sessionService.isOnlineOnly.returns(false);
    const result = await service.getVisitStats(contactId, visitCountSettings);

    expect(result).to.deep.equal({
      lastVisitedDate: null,
      count: 0,
      countGoal: 4
    });
    expect(localDb.query.args[0]).to.have.deep.members([
      'medic-client/contacts_by_last_visited',
      { group: true, 'reduce': true }
    ]);
    expect(localDb.query.args[1]).to.have.deep.members([
      'medic-client/visits_by_date',
      {start_key: range.start, end_key: range.end }
    ]);
  });

  it('should do nothing if visit settings and contact id arent provided', async () => {
    const result = await service.getVisitStats(null, null);

    expect(result).to.equal(undefined);
    expect(localDb.query.callCount).to.equal(0);
  });
});
