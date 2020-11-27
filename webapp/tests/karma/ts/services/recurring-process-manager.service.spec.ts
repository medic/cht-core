import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { RecurringProcessManagerService } from '@mm-services/recurring-process-manager.service';
import { RelativeDateService } from '@mm-services/relative-date.service';
import { UnreadRecordsService } from '@mm-services/unread-records.service';

describe('RecurringProcessManagerService', () => {
  let service: RecurringProcessManagerService;
  let relativeDateService;
  let unreadRecordsService;
  let clearInterval;
  let setInterval;
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    relativeDateService = { updateRelativeDates: sinon.stub() };
    unreadRecordsService = { count: sinon.stub() };
    setInterval = sinon.stub(clock, 'setInterval');
    clearInterval = sinon.stub(clock, 'clearInterval');

    TestBed.configureTestingModule({
      providers: [
        { provide: RelativeDateService, useValue: relativeDateService },
        { provide: UnreadRecordsService, useValue: unreadRecordsService }
      ]
    });

    service = TestBed.inject(RecurringProcessManagerService);
  });

  afterEach(() => {
    clock.restore();
    sinon.restore();
  });

  it('should be created', () => {
    expect(service).to.exist;
  });

  it('should register the UpdateRelativeDates interval', () => {
    service.startUpdateRelativeDate();
    
    expect(setInterval.callCount).to.equal(1);
    expect(setInterval.args[0][1]).to.equal(10 * 60 * 1000);
    const updateRelativeDates = setInterval.args[0][0];
    updateRelativeDates();
    expect(updateRelativeDates).to.be.a('function');
    expect(relativeDateService.updateRelativeDates.callCount).to.equal(1);
  });

  it('should cancel the UpdateRelativeDates interval', () => {
    setInterval.returns('theInterval');
    
    service.startUpdateRelativeDate();
    service.stopUpdateRelativeDate();

    expect(clearInterval.callCount).to.equal(1);
    expect(clearInterval.args[0].length).to.equal(1);
    expect(clearInterval.args[0][0]).to.equal('theInterval');
  });

  it('should return early if the interval already exists', () => {
    setInterval.returns('theInterval');
    
    service.startUpdateRelativeDate();
    service.startUpdateRelativeDate();

    expect(setInterval.callCount).to.equal(1);
    expect(clearInterval.callCount).to.equal(0);
  });

  it('should register the UpdateReadDocsCount interval', () => {
    service.startUpdateReadDocsCount();

    expect(setInterval.callCount).to.equal(1);
    expect(setInterval.args[0][1]).to.equal(5 * 60 * 1000);
    const count = setInterval.args[0][0];
    count();
    expect(count).to.be.a('function');
    expect(unreadRecordsService.count.callCount).to.equal(1);
  });

  it('should cancel the UpdateReadDocsCount interval', () => {
    setInterval.returns('theInterval');
    
    service.startUpdateReadDocsCount();
    service.stopUpdateReadDocsCount();

    expect(clearInterval.callCount).to.equal(1);
    expect(clearInterval.args[0].length).to.equal(1);
    expect(clearInterval.args[0][0]).to.equal('theInterval');
  });

  it('should return early if the interval already exists', () => {
    setInterval.returns('theInterval');
    
    service.startUpdateReadDocsCount();
    service.startUpdateReadDocsCount();

    expect(setInterval.callCount).to.equal(1);
    expect(clearInterval.callCount).to.equal(0);
  });

  it('should register and stop the updateRelativeDate interval', () => {
    setInterval.callThrough();
    clearInterval.callThrough();

    service.startUpdateRelativeDate();
    clock.tick(5 * 10 * 60 * 1000);
    expect(relativeDateService.updateRelativeDates.callCount).to.equal(5);

    service.stopUpdateRelativeDate();
    clock.tick(10 * 10 * 60 * 1000);
    expect(relativeDateService.updateRelativeDates.callCount).to.equal(5);
  });

  it('should register and stop the updateReadDocsCount interval', () => {
    setInterval.callThrough();
    clearInterval.callThrough();

    service.startUpdateReadDocsCount();
    clock.tick(5 * 5 * 60 * 1000);
    expect(unreadRecordsService.count.callCount).to.equal(5);

    service.stopUpdateReadDocsCount();
    clock.tick(10 * 5 * 60 * 1000);
    expect(unreadRecordsService.count.callCount).to.equal(5);
  });
});
