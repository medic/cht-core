import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { CheckDateService } from '@mm-services/check-date.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
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
    modal = { show: sinon.stub().resolves() };

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
    const check = service.check();
    const res = httpMock.expectOne(matchInfoEndpoint);
    res.flush({message: 'my error message'}, {status: 404, statusText: 'Not found'});

    await check;
    expect(modal.show.callCount).to.equal(0);
  });

  it('shows the modal when offline but clock is very wrong', async () => {
    const check = service.check();
    const res = httpMock.expectOne(matchInfoEndpoint);
    res.flush({message: 'my error message'}, {status: 404, statusText: 'Not found'});

    clock = sinon.useFakeTimers();

    await check;
    expect(modal.show.callCount).to.equal(1);
    expect(modal.show.args[0][0]).to.equal(CheckDateComponent);
    expect(modal.show.args[0][1].initialState.reportedLocalDate.toISOString()).to.equal('1970-01-01T00:00:00.000Z');
    expect(modal.show.args[0][1].initialState.expectedLocalDate).to.equal(undefined);
  });

  it('handles empty response', async () => {
    const check = service.check();
    const res = httpMock.expectOne(matchInfoEndpoint);
    res.flush('', { headers: { 'Date': 'xxx' } });

    await check;
    expect(modal.show.callCount).to.equal(0);
  });

  it('handles response with timestamp close enough', async () => {
    const responseDate = new Date();
    responseDate.setMinutes(responseDate.getMinutes() - 5);
    const check = service.check();
    const res = httpMock.expectOne(matchInfoEndpoint);
    res.flush('', { headers: { 'Date': responseDate.toISOString() } });

    await check;
    expect(modal.show.callCount).to.equal(0);
  });

  it('shows modal when response date is way out, man', async () => {
    clock = sinon.useFakeTimers();
    const responseDate = new Date();
    responseDate.setHours(responseDate.getHours() - 1);
    const check = service.check();
    const res = httpMock.expectOne(matchInfoEndpoint);
    res.flush('', { headers: { 'Date': responseDate.toISOString() } });

    await check;
    expect(modal.show.callCount).to.equal(1);
    expect(modal.show.args[0][0]).to.equal(CheckDateComponent);
    expect(modal.show.args[0][1].initialState.reportedLocalDate.toISOString()).to.equal('1970-01-01T00:00:00.000Z');
    expect(modal.show.args[0][1].initialState.expectedLocalDate.toISOString()).to.equal(responseDate.toISOString());
    expect(telemetryService.record.callCount).to.equal(1);
    expect(telemetryService.record.args[0][0]).to.equal('client-date-offset');
    expect(telemetryService.record.args[0][1]).to.equal(60 * 60 * 1000); // client is one hour ahead of server
  });
});
