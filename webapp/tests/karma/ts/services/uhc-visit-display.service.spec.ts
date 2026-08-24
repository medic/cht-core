import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { UHCVisitDisplayService } from '@mm-services/uhc-visit-display.service';
import { TranslateService } from '@mm-services/translate.service';
import { RelativeDateService } from '@mm-services/relative-date.service';

describe('UHCVisitDisplay Service', () => {
  let service: UHCVisitDisplayService;
  let translateService;
  let relativeDateService;

  beforeEach(() => {
    translateService = { instant: sinon.stub().callsFake((key, params) => JSON.stringify([ key, params ])) };
    relativeDateService = { getRelativeDate: sinon.stub().returns('relative-time') };

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: translateService },
        { provide: RelativeDateService, useValue: relativeDateService },
      ]
    });

    service = TestBed.inject(UHCVisitDisplayService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return nothing without stats or without a last visited date', () => {
    expect(service.getVisitDetails(null as any)).to.equal(undefined);
    expect(service.getVisitDetails({} as any)).to.equal(undefined);
    expect(service.getVisitDetails({ lastVisitedDate: undefined, count: 2 })).to.equal(undefined);
    expect(translateService.instant.callCount).to.equal(0);
  });

  it('should not return a visit count badge without a count', () => {
    const details = service.getVisitDetails({ lastVisitedDate: 0 } as any);

    expect(details!.overdue).to.equal(true);
    expect(details!.visits).to.equal(undefined);
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

    expect(details!.visits!.status).to.equal(undefined);
    expect(details!.visits!.count).to.equal(JSON.stringify([ 'contacts.visits.count', { count: '1' } ]));
  });
});
