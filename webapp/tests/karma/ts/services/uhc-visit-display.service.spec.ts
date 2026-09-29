import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { UHCVisitDisplayService } from '@mm-services/uhc-visit-display.service';
import { TranslateService } from '@mm-services/translate.service';
import { RelativeDateService } from '@mm-services/relative-date.service';
import { SettingsService } from '@mm-services/settings.service';
import { UHCSettingsService } from '@mm-services/uhc-settings.service';
import { UHCStatsService } from '@mm-services/uhc-stats.service';

describe('UHCVisitDisplay Service', () => {
  let service: UHCVisitDisplayService;
  let translateService;
  let relativeDateService;
  let settingsService;
  let uhcSettingsService;
  let uhcStatsService;

  beforeEach(() => {
    translateService = { instant: sinon.stub().callsFake((key, params) => JSON.stringify([ key, params ])) };
    relativeDateService = { getRelativeDate: sinon.stub().returns('relative-time') };
    settingsService = { get: sinon.stub().resolves({}) };
    uhcSettingsService = { getVisitCountSettings: sinon.stub().returns({}) };
    uhcStatsService = { getVisitStats: sinon.stub().resolves({}) };

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: translateService },
        { provide: RelativeDateService, useValue: relativeDateService },
        { provide: SettingsService, useValue: settingsService },
        { provide: UHCSettingsService, useValue: uhcSettingsService },
        { provide: UHCStatsService, useValue: uhcStatsService },
      ]
    });

    service = TestBed.inject(UHCVisitDisplayService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return nothing without stats or without a last visited date', () => {
    expect(service.getVisitDetails(null as any)).to.be.undefined;
    expect(service.getVisitDetails({} as any)).to.be.undefined;
    expect(service.getVisitDetails({ lastVisitedDate: undefined, count: 2 })).to.be.undefined;
    expect(translateService.instant.callCount).to.equal(0);
  });

  it('should not return a visit count badge without a count', () => {
    const details = service.getVisitDetails({ lastVisitedDate: 0 } as any);

    expect(details!.overdue).to.equal(true);
    expect(details!.visits).to.be.undefined;
  });

  it('should mark contacts that were never visited as overdue', () => {
    const details = service.getVisitDetails({ lastVisitedDate: 0, count: 0, countGoal: 2 });

    expect(details!.lastVisitedDate).to.equal(0);
    expect(details!.overdue).to.equal(true);
    expect(details!.summary).to.equal(JSON.stringify([ 'contact.last.visited.unknown', undefined ]));
    expect(details!.visits!.status).to.equal('pending');
  });

  it('should mark contacts visited over a month ago as overdue', () => {
    const lastVisitedDate = new Date().getTime() - (31 * 24 * 60 * 60 * 1000);

    const details = service.getVisitDetails({ lastVisitedDate, count: 1, countGoal: 2 });

    expect(details!.lastVisitedDate).to.equal(lastVisitedDate);
    expect(details!.overdue).to.equal(true);
    expect(details!.summary).to.equal(JSON.stringify([ 'contact.last.visited.date', { date: 'relative-time' } ]));
    expect(relativeDateService.getRelativeDate.args[0][0]).to.equal(lastVisitedDate);
    expect(details!.visits!.status).to.equal('started');
  });

  it('should not mark recently visited contacts as overdue', () => {
    const lastVisitedDate = new Date().getTime() - 1000;

    const details = service.getVisitDetails({ lastVisitedDate, count: 2, countGoal: 2 });

    expect(details!.overdue).to.equal(false);
    expect(details!.visits!.status).to.equal('done');
  });

  it('should cap the displayed visit count at 99+', () => {
    const details = service.getVisitDetails({ lastVisitedDate: new Date().getTime(), count: 105, countGoal: 2 });

    expect(details!.visits!.count).to.equal(JSON.stringify([ 'contacts.visits.count', { count: '99+' } ]));
    expect(details!.visits!.summary).to.equal(JSON.stringify([ 'contacts.visits.visits', { VISITS: 105 } ]));
  });

  it('should not set a visit status without a count goal', () => {
    const details = service.getVisitDetails({ lastVisitedDate: new Date().getTime(), count: 1 });

    expect(details!.visits!.status).to.be.undefined;
    expect(details!.visits!.count).to.equal(JSON.stringify([ 'contacts.visits.count', { count: '1' } ]));
  });

  describe('getChildrenVisitStats', () => {
    const buildChildren = () => [
      { type: { id: 'person', person: true }, contacts: [{ id: 'person1', doc: { _id: 'person1' } }] },
      {
        type: { id: 'clinic', count_visits: true },
        contacts: [
          { id: 'place1', doc: { _id: 'place1' } },
          { id: 'place2', doc: { _id: 'place2' } },
        ],
      },
    ];

    it('should return visit details for children whose type counts visits, keyed by contact id', async () => {
      const visitCountSettings = { monthStartDate: 26, visitCountGoal: 2 };
      uhcSettingsService.getVisitCountSettings.returns(visitCountSettings);
      uhcStatsService.getVisitStats.resolves({
        place1: { lastVisitedDate: new Date().getTime() - 1000, count: 2, countGoal: 2 },
        place2: { lastVisitedDate: 0, count: 0, countGoal: 2 },
      });

      const visitDetails = (await service.getChildrenVisitStats(buildChildren()))!;

      expect(uhcStatsService.getVisitStats.callCount).to.equal(1);
      // only the contacts of the types that count visits are queried: the person child is absent
      expect(uhcStatsService.getVisitStats.args[0]).to.deep.equal([
        [ 'place1', 'place2' ],
        visitCountSettings
      ]);

      expect(Object.keys(visitDetails)).to.have.members([ 'place1', 'place2' ]);

      const visited = visitDetails.place1;
      expect(visited.overdue).to.equal(false);
      expect(visited.summary).to.equal(
        JSON.stringify([ 'contact.last.visited.date', { date: 'relative-time' } ])
      );
      expect(visited.visits!.status).to.equal('done');

      const neverVisited = visitDetails.place2;
      expect(neverVisited.overdue).to.equal(true);
      expect(neverVisited.summary).to.equal(JSON.stringify([ 'contact.last.visited.unknown', undefined ]));
      expect(neverVisited.visits!.status).to.equal('pending');
    });

    it('should return undefined when no child type counts visits', async () => {
      const children = [
        { type: { id: 'person', person: true }, contacts: [{ id: 'person1', doc: { _id: 'person1' } }] },
        { type: { id: 'clinic' }, contacts: [{ id: 'place1', doc: { _id: 'place1' } }] },
        { type: { id: 'health_center', count_visits: true }, contacts: [] },
      ];

      const visitDetails = await service.getChildrenVisitStats(children);

      expect(visitDetails).to.be.undefined;
      expect(settingsService.get.callCount).to.equal(0);
      expect(uhcStatsService.getVisitStats.callCount).to.equal(0);
    });

    it('should return undefined when there are no stats', async () => {
      uhcStatsService.getVisitStats.resolves({});

      const visitDetails = await service.getChildrenVisitStats(buildChildren());

      expect(visitDetails).to.be.undefined;
    });

    it('should not touch the input children', async () => {
      uhcStatsService.getVisitStats.resolves({ place1: { lastVisitedDate: 0, count: 0 } });
      const children = buildChildren();

      await service.getChildrenVisitStats(children);

      children.forEach(group => group.contacts.forEach(child => {
        expect(child).to.deep.equal({ id: child.id, doc: { _id: child.id } });
      }));
    });

    it('should propagate errors from the visit stats queries', async () => {
      uhcStatsService.getVisitStats.rejects(new Error('boom'));

      try {
        await service.getChildrenVisitStats(buildChildren());
        expect.fail('should have thrown');
      } catch (error) {
        expect((error as Error).message).to.equal('boom');
      }
    });
  });
});
