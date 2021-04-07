import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { ContactStatsService } from '@mm-services/contact-stats.service';
import { DbService } from '@mm-services/db.service';
import { SessionService } from '@mm-services/session.service';

describe('ContactStats Service', () => {
  let service: ContactStatsService;
  let localDb;
  let dbService;
  let sessionService;

  beforeEach(() => {
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
    sinon.restore();
  });

  it('should get visit stats and query with key for online user', async () => {
    const contactId = '2b';
    const range = {
      start: 1616691600000, // Mar 26 2021 00:00:00
      end: 1619369999999 // Apr 25 2021 23:59:59
    };
    const visitCountSettings = {
      monthStartDate: 26,
      visitCountGoal: 5
    };
    // Query - last visited date
    localDb.query.onCall(0).returns({ rows: [
      {
        key: '1a',
        value: 1617729474091
      },
      {
        key: '2b',
        value: 1617729474090
      }
    ]});
    // Query - visits to contact
    localDb.query.onCall(1).returns({ rows: [
      {
        key: 1617729474091,
        value: '1a'
      },
      {
        key: 1617729474090,
        value: '2b'
      },
      {
        key: 1618739474090,
        value: '2b'
      }
    ]});

    sessionService.isOnlineOnly.returns(true);
    const result = await service.getVisitStats(contactId, visitCountSettings);

    expect(result).to.deep.equal({
      lastVisitedDate: 1617729474090,
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
      start: 1616691600000, // Mar 26 2021 00:00:00
      end: 1619369999999 // Apr 25 2021 23:59:59
    };
    const visitCountSettings = {
      monthStartDate: 26,
      visitCountGoal: 5
    };
    // Query - last visited date
    localDb.query.onCall(0).returns({ rows: [
      {
        key: '1a',
        value: 1617729474091
      },
      {
        key: '2b',
        value: 1617729474090
      }
    ]});
    // Query - visits to contact
    localDb.query.onCall(1).returns({ rows: [
      {
        key: 1617729474091,
        value: '1a'
      },
      {
        key: 1617729474090,
        value: '2b'
      }
    ]});

    sessionService.isOnlineOnly.returns(false);
    const result = await service.getVisitStats(contactId, visitCountSettings);

    expect(result).to.deep.equal({
      lastVisitedDate: 1617729474090,
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
      start: 1616691600000, // Mar 26 2021 00:00:00
      end: 1619369999999 // Apr 25 2021 23:59:59
    };
    const visitCountSettings = {
      monthStartDate: 26,
      visitCountGoal: 4
    };
    // Query - last visited date
    localDb.query.onCall(0).returns({ rows: [
      {
        key: '1a',
        value: 1617729474091
      },
      {
        key: '2b',
        value: 1617729474090
      }
    ]});
    // Query - visits to contact
    localDb.query.onCall(1).returns({ rows: [
      {
        key: 1617729474091,
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
