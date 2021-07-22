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
    clock = sinon.useFakeTimers(moment('2021-04-07 18:18:18').valueOf());
    localDb = { query: sinon.stub() };
    dbService = { get: sinon.stub().returns(localDb) };
    sessionService = { isDbAdmin: sinon.stub() };
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
    const result = service.getUHCInterval(null);

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
    sessionService.isDbAdmin.returns(false);
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
    expect(sessionService.isDbAdmin.callCount).to.equal(1);
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
    sessionService.isDbAdmin.returns(false);
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
    expect(sessionService.isDbAdmin.callCount).to.equal(1);
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
    sessionService.isDbAdmin.returns(false);
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
    expect(sessionService.isDbAdmin.callCount).to.equal(1);
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
    sessionService.isDbAdmin.returns(false);
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
    expect(sessionService.isDbAdmin.callCount).to.equal(1);
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
    sessionService.isDbAdmin.returns(false);
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
    expect(sessionService.isDbAdmin.callCount).to.equal(1);
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
    sessionService.isDbAdmin.returns(false);

    const result = await service.getHomeVisitStats(null, null);

    expect(result).to.equal(undefined);
    expect(authService.has.callCount).to.equal(0);
    expect(contactTypesService.get.callCount).to.equal(0);
    expect(sessionService.isDbAdmin.callCount).to.equal(0);
    expect(localDb.query.callCount).to.equal(0);
  });

  it('should do nothing if user is DB Admin', async () => {
    sessionService.isDbAdmin.returns(true);

    const result = await service.getHomeVisitStats({ _id: '2b' }, { monthStartDate: 26 });

    expect(result).to.equal(undefined);
    expect(sessionService.isDbAdmin.callCount).to.equal(1);
    expect(authService.has.callCount).to.equal(0);
    expect(contactTypesService.get.callCount).to.equal(0);
    expect(localDb.query.callCount).to.equal(0);
  });

  it('should do nothing if user doesnt have permission', async () => {
    sessionService.isDbAdmin.returns(false);
    authService.has.returns(false);

    const result = await service.getHomeVisitStats({ _id: '2b' }, { monthStartDate: 26 });

    expect(result).to.equal(undefined);
    expect(sessionService.isDbAdmin.callCount).to.equal(1);
    expect(authService.has.callCount).to.equal(1);
    expect(contactTypesService.get.callCount).to.equal(0);
    expect(localDb.query.callCount).to.equal(0);
  });

  it('should do nothing if contact type doesnt count visits', async () => {
    authService.has.returns(true);
    sessionService.isDbAdmin.returns(false);
    contactTypesService.get.returns({ count_visits: false });

    const result = await service.getHomeVisitStats({ _id: '2b' }, { monthStartDate: 26 });

    expect(result).to.equal(undefined);
    expect(sessionService.isDbAdmin.callCount).to.equal(1);
    expect(authService.has.callCount).to.equal(1);
    expect(contactTypesService.get.callCount).to.equal(1);
    expect(localDb.query.callCount).to.equal(0);
  });
});
