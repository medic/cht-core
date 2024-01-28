import sinon from 'sinon';
import { expect } from 'chai';
import { TestBed, fakeAsync, flush } from '@angular/core/testing';

import { TelemetryService } from '@mm-services/telemetry.service';
import { PerformanceService } from '@mm-services/performance.service';

describe('Performance Service', () => {
  let performanceService;
  let telemetryService;
  let performanceNowStub;

  beforeEach(() => {
    telemetryService = { record: sinon.stub() };
    performanceNowStub = sinon.stub(performance, 'now');

    TestBed.configureTestingModule({
      providers: [
        { provide: TelemetryService, useValue: telemetryService },
      ]
    });
  });

  afterEach(() => sinon.restore());

  it('should not record tracking if name not set', fakeAsync(() => {
    performanceService = TestBed.inject(PerformanceService);
    flush();

    const track = performanceService.track();
    track.stop({});
    flush();

    expect(telemetryService.record.notCalled).to.be.true;
  }));

  it('should track but no record Apdex', fakeAsync(() => {
    performanceService = TestBed.inject(PerformanceService);
    flush();

    performanceNowStub.returns(97176);
    const track = performanceService.track();

    expect(track).to.not.be.undefined;
    performanceNowStub.returns(124718);
    track.stop({
      name: 'some-component'
    });
    flush();

    expect(telemetryService.record.calledOnce).to.be.true;
    expect(telemetryService.record.args[0][0]).to.equal('some-component');
    expect(telemetryService.record.args[0][1]).to.equal(27542);
  }));

  it('should track and record "satisfied" Apdex when time is less than T', fakeAsync(() => {
    performanceService = TestBed.inject(PerformanceService);
    flush();

    performanceNowStub.returns(97176);
    const track = performanceService.track();

    expect(track).to.not.be.undefined;
    performanceNowStub.returns(99176);
    track.stop({
      name: 'some-component',
      recordApdex: true
    });
    flush();

    expect(telemetryService.record.calledTwice).to.be.true;
    expect(telemetryService.record.args[0][0]).to.equal('some-component');
    expect(telemetryService.record.args[0][1]).to.equal(2000);
    expect(telemetryService.record.args[1][0]).to.equal('some-component:apdex:satisfied');
    expect(telemetryService.record.args[1][1]).to.equal(2000);
  }));

  it('should track and record "satisfied" Apdex when time is same as T', fakeAsync(() => {
    performanceService = TestBed.inject(PerformanceService);
    flush();

    performanceNowStub.returns(97176);
    const track = performanceService.track();

    expect(track).to.not.be.undefined;
    performanceNowStub.returns(100176);
    track.stop({
      name: 'some-component',
      recordApdex: true
    });
    flush();

    expect(telemetryService.record.calledTwice).to.be.true;
    expect(telemetryService.record.args[0][0]).to.equal('some-component');
    expect(telemetryService.record.args[0][1]).to.equal(3000);
    expect(telemetryService.record.args[1][0]).to.equal('some-component:apdex:satisfied');
    expect(telemetryService.record.args[1][1]).to.equal(3000);
  }));

  it('should track and record "tolerated" Apdex when time is more than T but less than 4xT', fakeAsync(() => {
    performanceService = TestBed.inject(PerformanceService);
    flush();

    performanceNowStub.returns(97176);
    const track = performanceService.track();

    expect(track).to.not.be.undefined;
    performanceNowStub.returns(107176);
    track.stop({
      name: 'some-component',
      recordApdex: true
    });
    flush();

    expect(telemetryService.record.calledTwice).to.be.true;
    expect(telemetryService.record.args[0][0]).to.equal('some-component');
    expect(telemetryService.record.args[0][1]).to.equal(10000);
    expect(telemetryService.record.args[1][0]).to.equal('some-component:apdex:tolerable');
    expect(telemetryService.record.args[1][1]).to.equal(10000);
  }));

  it('should track and record "tolerated" Apdex when time is same as 4xT', fakeAsync(() => {
    performanceService = TestBed.inject(PerformanceService);
    flush();

    performanceNowStub.returns(97176);
    const track = performanceService.track();

    expect(track).to.not.be.undefined;
    performanceNowStub.returns(109176);
    track.stop({
      name: 'some-component',
      recordApdex: true
    });
    flush();

    expect(telemetryService.record.calledTwice).to.be.true;
    expect(telemetryService.record.args[0][0]).to.equal('some-component');
    expect(telemetryService.record.args[0][1]).to.equal(12000);
    expect(telemetryService.record.args[1][0]).to.equal('some-component:apdex:tolerable');
    expect(telemetryService.record.args[1][1]).to.equal(12000);
  }));

  it('should track and record "frustrated" Apdex when time is more than 4xT', fakeAsync(() => {
    performanceService = TestBed.inject(PerformanceService);
    flush();

    performanceNowStub.returns(97176);
    const track = performanceService.track();

    expect(track).to.not.be.undefined;
    performanceNowStub.returns(112176);
    track.stop({
      name: 'some-component',
      recordApdex: true
    });
    flush();

    expect(telemetryService.record.calledTwice).to.be.true;
    expect(telemetryService.record.args[0][0]).to.equal('some-component');
    expect(telemetryService.record.args[0][1]).to.equal(15000);
    expect(telemetryService.record.args[1][0]).to.equal('some-component:apdex:frustrated');
    expect(telemetryService.record.args[1][1]).to.equal(15000);
  }));
});
