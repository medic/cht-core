import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { CookieService } from 'ngx-cookie-service';
import { DebugService } from '@mm-services/debug.service';

describe('Debug service', () => {
  let service: DebugService;
  let cookieService;
  let pouchDb;
  const windowPouchOriginal = window.PouchDB;

  beforeEach(() => {
    pouchDb = {
      debug: {
        enable: sinon.stub(),
        disable: sinon.stub()
      }
    };
    window.PouchDB = pouchDb;
    cookieService =  {
      get: sinon.stub().returns(undefined),
      set: sinon.stub(),
      delete: sinon.stub()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: CookieService, useValue: cookieService },
      ]
    });
  });

  afterEach(() => {
    sinon.restore();
    window.PouchDB = windowPouchOriginal;
  });

  it('should set false the isDebugEnable property when not cookie stored', () => {
    service = TestBed.inject(DebugService);

    expect(cookieService.get.callCount).to.equal(1);
    expect(service.get()).to.equal(false);
  });

  it('should set true the isDebugEnable property when cookie stored', () => {
    cookieService.get.returns('true'); // Originally stored as string.
    service = TestBed.inject(DebugService);

    expect(cookieService.get.callCount).to.equal(1);
    expect(service.get()).to.equal(true);
  });

  it('should enable debug in db and store cookie', () => {
    service = TestBed.inject(DebugService);

    service.set(true);

    expect(pouchDb.debug.enable.callCount).to.equal(1);
    expect(pouchDb.debug.enable.args[0]).to.have.members(['*']);
    expect(cookieService.set.callCount).to.equal(1);
    expect(cookieService.set.args[0]).to.have.members([
      'medic-webapp-debug',
      'true',
      360,
      '/'
    ]);
    expect(service.get()).to.equal(true);
  });

  it('should disable debug in db and delete cookie', () => {
    service = TestBed.inject(DebugService);

    service.set(false);

    expect(pouchDb.debug.disable.callCount).to.equal(1);
    expect(cookieService.delete.callCount).to.equal(1);
    expect(cookieService.delete.args[0]).to.have.members([
      'medic-webapp-debug',
      '/'
    ]);
    expect(service.get()).to.equal(false);
  });
});
