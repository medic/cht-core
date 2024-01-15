import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { CheckDateService } from '@mm-services/check-date.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { ModalService } from '@mm-services/modal.service';
import { CheckDateComponent } from '@mm-modals/check-date/check-date.component';

describe('CheckDateService', () => {

  let service;
  let modal;
  let telemetryService;
  let clock;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    clock = null;
    telemetryService = { record: sinon.stub() };
    modal = { show: sinon.stub() };

    TestBed.configureTestingModule({
      imports: [ HttpClientTestingModule ],
      providers: [
        { provide: TelemetryService, useValue: telemetryService },
        { provide: ModalService, useValue: modal },
      ]
    });
    service = TestBed.inject(CheckDateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    sinon.restore();
    if (clock) {
      clock.restore();
    }
  });

  const matchInfoEndpoint = req => req.method === 'HEAD' && /\/api\/info\?seed=[0-9.]+/.test(req.url);

  it('does nothing when offline and roughly correct date', async () => {
    const check = service.check(true);
    const res = httpMock.expectOne(matchInfoEndpoint);
    res.flush({message: 'my error message'}, {status: 404, statusText: 'Not found'});

    await check;
    expect(modal.show.callCount).to.equal(0);
    expect(telemetryService.record.callCount).to.equal(0);
  });

  it('shows the modal when offline but clock is very wrong', async () => {
    const check = service.check(true);
    const res = httpMock.expectOne(matchInfoEndpoint);
    res.flush({message: 'my error message'}, {status: 404, statusText: 'Not found'});

    clock = sinon.useFakeTimers();

    await check;
    expect(modal.show.callCount).to.equal(1);
    expect(modal.show.args[0][0]).to.equal(CheckDateComponent);
    expect(modal.show.args[0][1].data.reportedLocalDate.toISOString()).to.equal('1970-01-01T00:00:00.000Z');
    expect(modal.show.args[0][1].data.expectedLocalDate).to.equal(undefined);
    expect(telemetryService.record.callCount).to.equal(0);
  });

  it('handles empty response', async () => {
    const check = service.check(true);
    const res = httpMock.expectOne(matchInfoEndpoint);
    res.flush('', { headers: { Date: 'xxx' } });

    await check;
    expect(modal.show.callCount).to.equal(0);
    expect(telemetryService.record.callCount).to.equal(0);
  });

  it('handles response with timestamp close enough', async () => {
    const responseDate = new Date();
    responseDate.setMinutes(responseDate.getMinutes() - 5);
    const check = service.check(true);
    const res = httpMock.expectOne(matchInfoEndpoint);
    res.flush('', { headers: { Date: responseDate.toISOString() } });

    await check;
    expect(modal.show.callCount).to.equal(0);
    expect(telemetryService.record.callCount).to.equal(0);
  });

  it('shows modal when response date is way out, man', async () => {
    clock = sinon.useFakeTimers();
    const responseDate = new Date();
    responseDate.setHours(responseDate.getHours() - 1);
    const check = service.check(true);
    const res = httpMock.expectOne(matchInfoEndpoint);
    res.flush('', { headers: { Date: responseDate.toISOString() } });

    await check;
    expect(modal.show.callCount).to.equal(1);
    expect(modal.show.args[0][0]).to.equal(CheckDateComponent);
    expect(modal.show.args[0][1].data.reportedLocalDate.toISOString()).to.equal('1970-01-01T00:00:00.000Z');
    expect(modal.show.args[0][1].data.expectedLocalDate.toISOString()).to.equal(responseDate.toISOString());
    expect(telemetryService.record.callCount).to.equal(1);
    // client is one hour ahead of server
    expect(telemetryService.record.args[0]).to.deep.equal(['client-date-offset', 60 * 60 * 1000]);
  });

  it('should not show the modal even when clock is wrong when param is not passed', async () => {
    clock = sinon.useFakeTimers();
    const responseDate = new Date();
    responseDate.setHours(responseDate.getHours() - 5);
    const check = service.check();
    const res = httpMock.expectOne(matchInfoEndpoint);
    res.flush('', { headers: { Date: responseDate.toISOString() } });

    await check;
    expect(modal.show.callCount).to.equal(0);
    expect(telemetryService.record.callCount).to.equal(1);
    // client is five hours ahead of server
    expect(telemetryService.record.args[0]).to.deep.equal(['client-date-offset', 5 * 60 * 60 * 1000]);
  });

  describe('re-checking on every try until one response from the server is received', () => {
    it('should keep re-checking, record telemetry and never check again when clock is off', async () => {
      clock = sinon.useFakeTimers(1606230000000);

      const check1 = service.check(true);
      const res1 = httpMock.expectOne(matchInfoEndpoint);
      res1.error(new ErrorEvent('Failed to fetch'));

      await check1;
      expect(modal.show.callCount).to.equal(0);
      expect(telemetryService.record.callCount).to.equal(0);

      const check2 = service.check(true);
      const res2 = httpMock.expectOne(matchInfoEndpoint);
      res2.error(new ErrorEvent('Failed to fetch'));

      await check2;
      expect(modal.show.callCount).to.equal(0);
      expect(telemetryService.record.callCount).to.equal(0);

      const check3 = service.check(true);
      const res3 = httpMock.expectOne(matchInfoEndpoint);
      res3.error(new ErrorEvent('Failed to fetch'));

      await check3;
      expect(modal.show.callCount).to.equal(0);
      expect(telemetryService.record.callCount).to.equal(0);

      const responseDate = new Date();
      responseDate.setHours(responseDate.getHours() + 3);
      const check4 = service.check(true);
      const res4 = httpMock.expectOne(matchInfoEndpoint);
      res4.flush('', { headers: { Date: responseDate.toISOString() } });

      await check4;
      expect(modal.show.callCount).to.equal(1);
      expect(telemetryService.record.callCount).to.equal(1);
      // client is 3 hours behind of server
      expect(telemetryService.record.args[0]).to.deep.equal(['client-date-offset', - 3 * 60 * 60 * 1000]);

      const check5 = service.check(true);
      httpMock.expectNone(matchInfoEndpoint);

      await check5;
      expect(modal.show.callCount).to.equal(1);
      expect(telemetryService.record.callCount).to.equal(1);

      const check6 = service.check(true);
      httpMock.expectNone(matchInfoEndpoint);

      await check6;
      expect(modal.show.callCount).to.equal(1);
      expect(telemetryService.record.callCount).to.equal(1);
    });

    it('should keep re-checking, not record telemetry and never check again when clock is on', async () => {
      clock = sinon.useFakeTimers(1606230000000);

      const check1 = service.check(true);
      const res1 = httpMock.expectOne(matchInfoEndpoint);
      res1.error(new ErrorEvent('Failed to fetch'));

      await check1;
      expect(modal.show.callCount).to.equal(0);
      expect(telemetryService.record.callCount).to.equal(0);

      const check2 = service.check(true);
      const res2 = httpMock.expectOne(matchInfoEndpoint);
      res2.error(new ErrorEvent('Failed to fetch'));

      await check2;
      expect(modal.show.callCount).to.equal(0);
      expect(telemetryService.record.callCount).to.equal(0);

      const responseDate = new Date();
      responseDate.setMinutes(responseDate.getMinutes() + 3);
      const check4 = service.check(true);
      const res4 = httpMock.expectOne(matchInfoEndpoint);
      res4.flush('', { headers: { Date: responseDate.toISOString() } });

      await check4;
      expect(modal.show.callCount).to.equal(0);
      expect(telemetryService.record.callCount).to.equal(0);

      const check5 = service.check(true);
      httpMock.expectNone(matchInfoEndpoint);

      await check5;
      expect(modal.show.callCount).to.equal(0);
      expect(telemetryService.record.callCount).to.equal(0);

      const check6 = service.check(true);
      httpMock.expectNone(matchInfoEndpoint);

      await check6;
      expect(modal.show.callCount).to.equal(0);
      expect(telemetryService.record.callCount).to.equal(0);
    });
  });
});
