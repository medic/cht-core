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

  it('should do nothing without stats or without a last visited date', () => {
    const contact: any = {};

    service.setVisitDetails(contact, null as any);
    service.setVisitDetails(contact, {});
    service.setVisitDetails(contact, { lastVisitedDate: undefined, count: 2 });

    expect(contact).to.deep.equal({});
    expect(translateService.instant.callCount).to.equal(0);
  });

  it('should mark contacts that were never visited as overdue', () => {
    const contact: any = {};

    service.setVisitDetails(contact, { lastVisitedDate: 0, count: 0, countGoal: 2 });

    expect(contact.lastVisitedDate).to.equal(0);
    expect(contact.overdue).to.equal(true);
    expect(contact.summary).to.equal(JSON.stringify([ 'contact.last.visit.unknown', undefined ]));
    expect(contact.visits.status).to.equal('pending');
  });

  it('should mark contacts visited over a month ago as overdue', () => {
    const contact: any = {};
    const lastVisitedDate = new Date().getTime() - (31 * 24 * 60 * 60 * 1000);

    service.setVisitDetails(contact, { lastVisitedDate, count: 1, countGoal: 2 });

    expect(contact.lastVisitedDate).to.equal(lastVisitedDate);
    expect(contact.overdue).to.equal(true);
    expect(contact.summary).to.equal(JSON.stringify([ 'contact.last.visited.date', { date: 'relative-time' } ]));
    expect(relativeDateService.getRelativeDate.args[0][0]).to.equal(lastVisitedDate);
    expect(contact.visits.status).to.equal('started');
  });

  it('should not mark recently visited contacts as overdue', () => {
    const contact: any = {};
    const lastVisitedDate = new Date().getTime() - 1000;

    service.setVisitDetails(contact, { lastVisitedDate, count: 2, countGoal: 2 });

    expect(contact.overdue).to.equal(false);
    expect(contact.visits.status).to.equal('done');
  });

  it('should cap the displayed visit count at 99+', () => {
    const contact: any = {};

    service.setVisitDetails(contact, { lastVisitedDate: new Date().getTime(), count: 105, countGoal: 2 });

    expect(contact.visits.count).to.equal(JSON.stringify([ 'contacts.visits.count', { count: '99+' } ]));
    expect(contact.visits.summary).to.equal(JSON.stringify([ 'contacts.visits.visits', { VISITS: 105 } ]));
  });

  it('should not set a visit status without a count goal', () => {
    const contact: any = {};

    service.setVisitDetails(contact, { lastVisitedDate: new Date().getTime(), count: 1 });

    expect(contact.visits.status).to.equal(undefined);
    expect(contact.visits.count).to.equal(JSON.stringify([ 'contacts.visits.count', { count: '1' } ]));
  });
});
