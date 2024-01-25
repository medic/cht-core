import sinon from 'sinon';
import { expect } from 'chai';
import { TestBed, fakeAsync, flush } from '@angular/core/testing';

import { TelemetryService } from '@mm-services/telemetry.service';
import { AuthService } from '@mm-services/auth.service';
import { PerformanceService } from '@mm-services/performance.service';

describe('Performance Service', () => {
  let performanceService;
  let telemetryService;
  let authService;
  let performanceNowStub;

  beforeEach(() => {
    telemetryService = { record: sinon.stub() };
    authService = { has: sinon.stub() };
    performanceNowStub = sinon.stub(performance, 'now');

    TestBed.configureTestingModule({
      providers: [
        { provide: TelemetryService, useValue: telemetryService },
        { provide: AuthService, useValue: authService },
      ]
    });
  });

  afterEach(() => sinon.restore());

  it('should not start tracking if permission not given', fakeAsync(() => {
    authService.has.resolves(false);
    performanceService = TestBed.inject(PerformanceService);
    flush();

    const track = performanceService.track('some-component');

    expect(track).to.be.undefined;
    expect(telemetryService.record.notCalled).to.be.true;
  }));

  it('should not start tracking if name not set', fakeAsync(() => {
    authService.has.resolves(true);
    performanceService = TestBed.inject(PerformanceService);
    flush();

    const track = performanceService.track(null);

    expect(track).to.be.undefined;
    expect(telemetryService.record.notCalled).to.be.true;
  }));

  it('should track but no record Apdex', fakeAsync(() => {
    authService.has.resolves(true);
    performanceService = TestBed.inject(PerformanceService);
    flush();

    performanceNowStub.returns(97176);
    const track = performanceService.track('some-component');

    expect(track).to.not.be.undefined;
    performanceNowStub.returns(124718);
    track.stop();
    flush();

    expect(telemetryService.record.calledOnce).to.be.true;
    expect(telemetryService.record.args[0][0]).to.equal('perf:some-component');
    expect(telemetryService.record.args[0][1]).to.equal(27542);
  }));

  it('should track and record "satisfied" Apdex when time is less than T', fakeAsync(() => {
    authService.has.resolves(true);
    performanceService = TestBed.inject(PerformanceService);
    flush();

    performanceNowStub.returns(97176);
    const track = performanceService.track('some-component');

    expect(track).to.not.be.undefined;
    performanceNowStub.returns(99176);
    track.stop(true);
    flush();

    expect(telemetryService.record.calledThrice).to.be.true;
    expect(telemetryService.record.args[0][0]).to.equal('perf:some-component');
    expect(telemetryService.record.args[0][1]).to.equal(2000);
    expect(telemetryService.record.args[1][0]).to.equal('perf:some-component:apdex:satisfied');
    expect(telemetryService.record.args[1][1]).to.equal(2000);
    expect(telemetryService.record.args[2][0]).to.equal('perf:app:apdex:aggregate:satisfied');
    expect(telemetryService.record.args[2][1]).to.equal(2000);
  }));

  it('should track and record "satisfied" Apdex when time is same as T', fakeAsync(() => {
    authService.has.resolves(true);
    performanceService = TestBed.inject(PerformanceService);
    flush();

    performanceNowStub.returns(97176);
    const track = performanceService.track('some-component');

    expect(track).to.not.be.undefined;
    performanceNowStub.returns(100176);
    track.stop(true);
    flush();

    expect(telemetryService.record.calledThrice).to.be.true;
    expect(telemetryService.record.args[0][0]).to.equal('perf:some-component');
    expect(telemetryService.record.args[0][1]).to.equal(3000);
    expect(telemetryService.record.args[1][0]).to.equal('perf:some-component:apdex:satisfied');
    expect(telemetryService.record.args[1][1]).to.equal(3000);
    expect(telemetryService.record.args[2][0]).to.equal('perf:app:apdex:aggregate:satisfied');
    expect(telemetryService.record.args[2][1]).to.equal(3000);
  }));

  it('should track and record "tolerated" Apdex when time is more than T but less than 4xT', fakeAsync(() => {
    authService.has.resolves(true);
    performanceService = TestBed.inject(PerformanceService);
    flush();

    performanceNowStub.returns(97176);
    const track = performanceService.track('some-component');

    expect(track).to.not.be.undefined;
    performanceNowStub.returns(107176);
    track.stop(true);
    flush();

    expect(telemetryService.record.calledThrice).to.be.true;
    expect(telemetryService.record.args[0][0]).to.equal('perf:some-component');
    expect(telemetryService.record.args[0][1]).to.equal(10000);
    expect(telemetryService.record.args[1][0]).to.equal('perf:some-component:apdex:tolerable');
    expect(telemetryService.record.args[1][1]).to.equal(10000);
    expect(telemetryService.record.args[2][0]).to.equal('perf:app:apdex:aggregate:tolerable');
    expect(telemetryService.record.args[2][1]).to.equal(10000);
  }));

  it('should track and record "tolerated" Apdex when time is same as 4xT', fakeAsync(() => {
    authService.has.resolves(true);
    performanceService = TestBed.inject(PerformanceService);
    flush();

    performanceNowStub.returns(97176);
    const track = performanceService.track('some-component');

    expect(track).to.not.be.undefined;
    performanceNowStub.returns(109176);
    track.stop(true);
    flush();

    expect(telemetryService.record.calledThrice).to.be.true;
    expect(telemetryService.record.args[0][0]).to.equal('perf:some-component');
    expect(telemetryService.record.args[0][1]).to.equal(12000);
    expect(telemetryService.record.args[1][0]).to.equal('perf:some-component:apdex:tolerable');
    expect(telemetryService.record.args[1][1]).to.equal(12000);
    expect(telemetryService.record.args[2][0]).to.equal('perf:app:apdex:aggregate:tolerable');
    expect(telemetryService.record.args[2][1]).to.equal(12000);
  }));

  it('should track and record "frustrated" Apdex when time is more than 4xT', fakeAsync(() => {
    authService.has.resolves(true);
    performanceService = TestBed.inject(PerformanceService);
    flush();

    performanceNowStub.returns(97176);
    const track = performanceService.track('some-component');

    expect(track).to.not.be.undefined;
    performanceNowStub.returns(112176);
    track.stop(true);
    flush();

    expect(telemetryService.record.calledThrice).to.be.true;
    expect(telemetryService.record.args[0][0]).to.equal('perf:some-component');
    expect(telemetryService.record.args[0][1]).to.equal(15000);
    expect(telemetryService.record.args[1][0]).to.equal('perf:some-component:apdex:frustrated');
    expect(telemetryService.record.args[1][1]).to.equal(15000);
    expect(telemetryService.record.args[2][0]).to.equal('perf:app:apdex:aggregate:frustrated');
    expect(telemetryService.record.args[2][1]).to.equal(15000);
  }));
});
