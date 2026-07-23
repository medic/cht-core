import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import * as moment from 'moment';

import { UHCStatsService } from '@mm-services/uhc-stats.service';
import { DbService } from '@mm-services/db.service';
import { ContactTypesService } from '@mm-services/contact-types.service';
import { SessionService } from '@mm-services/session.service';
import { AuthService } from '@mm-services/auth.service';

describe('UHCStats Service', () => {
  let service: UHCStatsService;
  let clock;
  let localDb;
  let dbService;
  let contactTypesService;
  let sessionService;
  let authService;

  beforeEach(() => {
    clock = sinon.useFakeTimers({now: moment('2021-04-07 18:18:18').valueOf()});
    localDb = { query: sinon.stub() };
    dbService = { get: sinon.stub().returns(localDb) };
    sessionService = { isAdmin: sinon.stub() };
    authService = { has: sinon.stub() };
    contactTypesService = {
      getTypeId: sinon.stub(),
      get: sinon.stub()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: ContactTypesService, useValue: contactTypesService },
        { provide: SessionService, useValue: sessionService },
        { provide: AuthService, useValue: authService },
      ]
    });

    service = TestBed.inject(UHCStatsService);
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  it('should return UHC Interval', () => {
    const visitCountSettings = {
      monthStartDate: 26,
      visitCountGoal: 5
    };

    const result = service.getUHCInterval(visitCountSettings);

    expect(result).to.deep.equal({
      start: moment('2021-03-26 00:00:00.000').valueOf(),
      end: moment('2021-04-25 23:59:59.999').valueOf()
    });
  });

  it('should not return UHC Interval if setting arent provided', () => {
    const result = service.getUHCInterval(null as any);

    expect(result).to.be.undefined;
  });

  it('should get home visit stats', async () => {
    const contact = { _id: '2b' };
    const range = {
      start: moment('2021-03-26 00:00:00.000').valueOf(),
      end: moment('2021-04-25 23:59:59.999').valueOf()
    };
    const visitCountSettings = {
      monthStartDate: 26,
      visitCountGoal: 5
    };
    authService.has.returns(true);
    contactTypesService.get.returns({ count_visits: true });
    sessionService.isAdmin.returns(false);
    // Query - last visited date
    localDb.query.onCall(0).returns({ rows: [
      {
        key: '2b',
        value: moment('2021-04-15 22:59:59').valueOf()
      }
    ]});
    // Query - visits to contact
    localDb.query.onCall(1).returns({ rows: [
      {
        key: [ '2b', moment('2021-04-15 22:59:59').valueOf() ],
        value: null
      },
      {
        key: [ '2b', moment('2021-04-17 22:59:59').valueOf() ],
        value: null
      }
    ]});

    const result = await service.getHomeVisitStats(contact, visitCountSettings);

    expect(result).to.deep.equal({
      lastVisitedDate: moment('2021-04-15 22:59:59').valueOf(),
      count: 2,
      countGoal: 5
    });
    expect(authService.has.callCount).to.equal(1);
    expect(contactTypesService.get.callCount).to.equal(1);
    expect(sessionService.isAdmin.callCount).to.equal(1);
    expect(localDb.query.callCount).to.equal(2);
    expect(localDb.query.args[0]).to.have.deep.members([
      'medic-client/contacts_by_last_visited',
      { group: true, reduce: true, key: '2b' }
    ]);
    expect(localDb.query.args[1]).to.have.deep.members([
      'medic-client/visits_by_date',
      { start_key: [ contact._id, range.start ], end_key: [ contact._id, range.end ] }
    ]);
  });

  it('should not count visits from the same day', async () => {
    const contact = { _id: '2b' };
    const range = {
      start: moment('2021-03-26 00:00:00.000').valueOf(),
      end: moment('2021-04-25 23:59:59.999').valueOf()
    };
    const visitCountSettings = {
      monthStartDate: 26,
      visitCountGoal: 5
    };
    authService.has.returns(true);
    contactTypesService.get.returns({ count_visits: true });
    sessionService.isAdmin.returns(false);
    // Query - last visited date
    localDb.query.onCall(0).returns({ rows: [
      {
        key: '2b',
        value: moment('2021-04-15 22:59:59').valueOf()
      }
    ]});
    // Query - visits to contact
    localDb.query.onCall(1).returns({ rows: [
      {
        key: [ '2b', moment('2021-04-15 09:20:00').valueOf() ],
        value: null
      },
      {
        key: [ '2b', moment('2021-04-15 15:00:00').valueOf() ],
        value: null
      },
      {
        key: [ '2b', moment('2021-04-17 00:00:01').valueOf() ],
        value: null
      },
      {
        key: [ '2b', moment('2021-04-17 23:59:59').valueOf() ],
        value: null
      }
    ]});

    const result = await service.getHomeVisitStats(contact, visitCountSettings);

    expect(result).to.deep.equal({
      lastVisitedDate: moment('2021-04-15 22:59:59').valueOf(),
      count: 2,
      countGoal: 5
    });
    expect(authService.has.callCount).to.equal(1);
    expect(contactTypesService.get.callCount).to.equal(1);
    expect(sessionService.isAdmin.callCount).to.equal(1);
    expect(localDb.query.callCount).to.equal(2);
    expect(localDb.query.args[0]).to.have.deep.members([
      'medic-client/contacts_by_last_visited',
      { group: true, reduce: true, key: '2b' }
    ]);
    expect(localDb.query.args[1]).to.have.deep.members([
      'medic-client/visits_by_date',
      { start_key: [ contact._id, range.start ], end_key: [ contact._id, range.end ] }
    ]);
  });

  it('should not query visits if contact hasnt been visited yet', async () => {
    const contact = { _id: '3c' };
    const visitCountSettings = {
      monthStartDate: 26,
      visitCountGoal: 4
    };
    authService.has.returns(true);
    contactTypesService.get.returns({ count_visits: true });
    sessionService.isAdmin.returns(false);
    // Query - last visited date
    localDb.query.onCall(0).returns({ rows: [
      {
        key: '2b',
        value: { count: 1, max: 0, min: 0 }
      }
    ] });

    const result = await service.getHomeVisitStats(contact, visitCountSettings);

    expect(result).to.deep.equal({
      lastVisitedDate: 0,
      count: 0,
      countGoal: 4
    });
    expect(authService.has.callCount).to.equal(1);
    expect(contactTypesService.get.callCount).to.equal(1);
    expect(sessionService.isAdmin.callCount).to.equal(1);
    expect(localDb.query.callCount).to.equal(1);
    expect(localDb.query.args[0]).to.have.deep.members([
      'medic-client/contacts_by_last_visited',
      { group: true, reduce: true, key: '3c' }
    ]);
  });

  it('should not query visits if last visit date is before start date of range', async () => {
    const contact = { _id: '2b' };
    const visitCountSettings = {
      monthStartDate: 26,
      visitCountGoal: 5
    };
    authService.has.returns(true);
    contactTypesService.get.returns({ count_visits: true });
    sessionService.isAdmin.returns(false);
    // Query - last visited date
    localDb.query.onCall(0).returns({ rows: [
      {
        key: '2b',
        value: moment('2021-02-13 22:59:59').valueOf()
      }
    ]});

    const result = await service.getHomeVisitStats(contact, visitCountSettings);

    expect(result).to.deep.equal({
      lastVisitedDate: moment('2021-02-13 22:59:59').valueOf(),
      count: 0,
      countGoal: 5
    });
    expect(authService.has.callCount).to.equal(1);
    expect(contactTypesService.get.callCount).to.equal(1);
    expect(sessionService.isAdmin.callCount).to.equal(1);
    expect(localDb.query.callCount).to.equal(1);
    expect(localDb.query.args[0]).to.have.deep.members([
      'medic-client/contacts_by_last_visited',
      { group: true, reduce: true, key: '2b' }
    ]);
  });

  it('should not crash if visits arent found', async () => {
    const contact = { _id: '3c' };
    const range = {
      start: moment('2021-03-26 00:00:00.000').valueOf(),
      end: moment('2021-04-25 23:59:59.999').valueOf()
    };
    const visitCountSettings = {
      monthStartDate: 26,
      visitCountGoal: 4
    };
    authService.has.returns(true);
    contactTypesService.get.returns({ count_visits: true });
    sessionService.isAdmin.returns(false);
    // Query - last visited date
    localDb.query.onCall(0).returns({ rows: [
      {
        key: '3b',
        value: moment('2021-04-15 22:59:59').valueOf()
      }
    ]});
    // Query - visits to contact
    localDb.query.onCall(1).returns({ rows: [] });

    const result = await service.getHomeVisitStats(contact, visitCountSettings);

    expect(result).to.deep.equal({
      lastVisitedDate: moment('2021-04-15 22:59:59').valueOf(),
      count: 0,
      countGoal: 4
    });
    expect(authService.has.callCount).to.equal(1);
    expect(contactTypesService.get.callCount).to.equal(1);
    expect(sessionService.isAdmin.callCount).to.equal(1);
    expect(localDb.query.callCount).to.equal(2);
    expect(localDb.query.args[0]).to.have.deep.members([
      'medic-client/contacts_by_last_visited',
      { group: true, reduce: true, key: '3c' }
    ]);
    expect(localDb.query.args[1]).to.have.deep.members([
      'medic-client/visits_by_date',
      { start_key: [ contact._id, range.start ], end_key: [ contact._id, range.end ] }
    ]);
  });

  it('should do nothing if visit settings and contact id arent provided', async () => {
    authService.has.returns(true);
    contactTypesService.get.returns({ count_visits: true });
    sessionService.isAdmin.returns(false);

    const result = await service.getHomeVisitStats(null, null as any);

    expect(result).to.equal(undefined);
    expect(authService.has.callCount).to.equal(0);
    expect(contactTypesService.get.callCount).to.equal(0);
    expect(sessionService.isAdmin.callCount).to.equal(0);
    expect(localDb.query.callCount).to.equal(0);
  });

  it('should do nothing if user is DB Admin', async () => {
    sessionService.isAdmin.returns(true);

    const result = await service.getHomeVisitStats({ _id: '2b' }, { monthStartDate: 26 });

    expect(result).to.equal(undefined);
    expect(sessionService.isAdmin.callCount).to.equal(1);
    expect(authService.has.callCount).to.equal(0);
    expect(contactTypesService.get.callCount).to.equal(0);
    expect(localDb.query.callCount).to.equal(0);
  });

  it('should do nothing if user doesnt have permission', async () => {
    sessionService.isAdmin.returns(false);
    authService.has.returns(false);

    const result = await service.getHomeVisitStats({ _id: '2b' }, { monthStartDate: 26 });

    expect(result).to.equal(undefined);
    expect(sessionService.isAdmin.callCount).to.equal(1);
    expect(authService.has.callCount).to.equal(1);
    expect(contactTypesService.get.callCount).to.equal(0);
    expect(localDb.query.callCount).to.equal(0);
  });

  it('should do nothing if contact type doesnt count visits', async () => {
    authService.has.returns(true);
    sessionService.isAdmin.returns(false);
    contactTypesService.get.returns({ count_visits: false });

    const result = await service.getHomeVisitStats({ _id: '2b' }, { monthStartDate: 26 });

    expect(result).to.equal(undefined);
    expect(sessionService.isAdmin.callCount).to.equal(1);
    expect(authService.has.callCount).to.equal(1);
    expect(contactTypesService.get.callCount).to.equal(1);
    expect(localDb.query.callCount).to.equal(0);
  });

  describe('getVisitStats', () => {
    const range = {
      start: moment('2021-03-26 00:00:00.000').valueOf(),
      end: moment('2021-04-25 23:59:59.999').valueOf()
    };
    const visitCountSettings = {
      monthStartDate: 26,
      visitCountGoal: 5
    };

    it('should return empty object if visit settings or contact ids arent provided', async () => {
      expect(await service.getVisitStats([ '2b' ], null as any)).to.deep.equal({});
      expect(await service.getVisitStats([], visitCountSettings)).to.deep.equal({});
      expect(await service.getVisitStats(null as any, visitCountSettings)).to.deep.equal({});

      expect(authService.has.callCount).to.equal(0);
      expect(localDb.query.callCount).to.equal(0);
    });

    it('should return empty object if user is DB Admin', async () => {
      sessionService.isAdmin.returns(true);

      const result = await service.getVisitStats([ '2b' ], visitCountSettings);

      expect(result).to.deep.equal({});
      expect(sessionService.isAdmin.callCount).to.equal(1);
      expect(authService.has.callCount).to.equal(0);
      expect(localDb.query.callCount).to.equal(0);
    });

    it('should return empty object if user doesnt have permission', async () => {
      sessionService.isAdmin.returns(false);
      authService.has.resolves(false);

      const result = await service.getVisitStats([ '2b' ], visitCountSettings);

      expect(result).to.deep.equal({});
      expect(sessionService.isAdmin.callCount).to.equal(1);
      expect(authService.has.callCount).to.equal(1);
      expect(authService.has.args[0]).to.deep.equal([ 'can_view_last_visited_date' ]);
      expect(localDb.query.callCount).to.equal(0);
    });

    it('should get visit stats for contacts when online', async () => {
      sessionService.isAdmin.returns(false);
      sessionService.isOnlineOnly = sinon.stub().returns(true);
      authService.has.resolves(true);
      // Query - last visited dates
      localDb.query.onCall(0).returns({ rows: [
        { key: '2b', value: moment('2021-04-15 22:59:59').valueOf() },
        { key: '3c', value: { count: 1, max: 0, min: 0 } },
      ]});
      // Query - visits in date range
      localDb.query.onCall(1).returns({ rows: [
        { key: moment('2021-04-15 09:20:00').valueOf(), value: '2b' },
        { key: moment('2021-04-15 15:00:00').valueOf(), value: '2b' },
        { key: moment('2021-04-17 23:59:59').valueOf(), value: '2b' },
        { key: moment('2021-04-18 23:59:59').valueOf(), value: 'other' },
      ]});

      const result = await service.getVisitStats([ '2b', '3c', '4d' ], visitCountSettings);

      expect(result).to.deep.equal({
        '2b': {
          lastVisitedDate: moment('2021-04-15 22:59:59').valueOf(),
          count: 2,
          countGoal: 5
        },
        '3c': {
          lastVisitedDate: 0,
          count: 0,
          countGoal: 5
        }
      });
      expect(localDb.query.callCount).to.equal(2);
      expect(localDb.query.args[0]).to.have.deep.members([
        'medic-client/contacts_by_last_visited',
        { group: true, reduce: true, keys: [ '2b', '3c', '4d' ] }
      ]);
      expect(localDb.query.args[1]).to.have.deep.members([
        'medic-client/visits_by_date',
        { start_key: range.start, end_key: range.end }
      ]);
    });

    it('should not query with keys when offline', async () => {
      sessionService.isAdmin.returns(false);
      sessionService.isOnlineOnly = sinon.stub().returns(false);
      authService.has.resolves(true);
      // Query - last visited dates
      localDb.query.onCall(0).returns({ rows: [
        { key: '2b', value: moment('2021-04-15 22:59:59').valueOf() },
        { key: 'not-requested', value: moment('2021-04-16 22:59:59').valueOf() },
      ]});
      // Query - visits in date range
      localDb.query.onCall(1).returns({ rows: [
        { key: moment('2021-04-15 09:20:00').valueOf(), value: '2b' },
      ]});

      const result = await service.getVisitStats([ '2b' ], visitCountSettings);

      expect(result).to.deep.equal({
        '2b': {
          lastVisitedDate: moment('2021-04-15 22:59:59').valueOf(),
          count: 1,
          countGoal: 5
        }
      });
      expect(localDb.query.callCount).to.equal(2);
      expect(localDb.query.args[0]).to.have.deep.members([
        'medic-client/contacts_by_last_visited',
        { group: true, reduce: true }
      ]);
      expect(localDb.query.args[1]).to.have.deep.members([
        'medic-client/visits_by_date',
        { start_key: range.start, end_key: range.end }
      ]);
    });

    it('should cache the permission check', async () => {
      sessionService.isAdmin.returns(false);
      sessionService.isOnlineOnly = sinon.stub().returns(true);
      authService.has.resolves(true);
      localDb.query.returns({ rows: [] });

      await service.getVisitStats([ '2b' ], visitCountSettings);
      await service.getVisitStats([ '2b' ], visitCountSettings);

      expect(authService.has.callCount).to.equal(1);
    });
  });
});
