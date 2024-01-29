import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';
import { CookieService } from 'ngx-cookie-service';

import { DebugService } from '@mm-services/debug.service';
import { DbService } from '@mm-services/db.service';
import { FeedbackService } from '@mm-services/feedback.service';
import { SessionService } from '@mm-services/session.service';
import { TestingComponent } from '@mm-modules/testing/testing.component';

describe('Testing Component', () => {
  let component: TestingComponent;
  let fixture: ComponentFixture<TestingComponent>;
  let dbService;
  let database;
  let debugService;
  let feedbackService;
  let sessionService;
  let cookieService;

  beforeEach(waitForAsync(() => {
    database = { destroy: sinon.stub() };
    dbService = { get: sinon.stub().returns(database) };
    debugService = {
      get: sinon.stub().returns(false),
      set: sinon.stub()
    };
    feedbackService = { submit: sinon.stub() };
    sessionService = {
      isOnlineOnly: sinon.stub(),
      userCtx: sinon.stub().returns({ _id: '123' }),
      logout: sinon.stub()
    };
    cookieService = { deleteAll: sinon.stub() };

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          FormsModule
        ],
        declarations: [
          TestingComponent
        ],
        providers: [
          { provide: DbService, useValue: dbService },
          { provide: DebugService, useValue: debugService },
          { provide: FeedbackService, useValue: feedbackService },
          { provide: SessionService, useValue: sessionService },
          { provide: CookieService, useValue: cookieService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(TestingComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create TestingComponent', () => {
    expect(component).to.exist;
    expect(debugService.get.callCount).to.equal(1);
    expect(component.debugEnabled).to.equal(false);
  });

  it('should enable debug', () => {
    component.enableDebug();

    expect(debugService.set.callCount).to.equal(1);
    expect(debugService.set.args[0]).to.have.members([true]);
    expect(component.debugEnabled).to.equal(true);
  });

  it('should disable debug', () => {
    component.disableDebug();

    expect(debugService.set.callCount).to.equal(1);
    expect(debugService.set.args[0]).to.have.members([false]);
    expect(component.debugEnabled).to.equal(false);
  });

  it('should generate feedback', fakeAsync(() => {
    component.amountFeedbackDocs = 3;

    component.generateFeedback();

    expect(component.generatingFeedback).to.equal(true);
    tick();
    expect(feedbackService.submit.callCount).to.equal(3);
    expect(component.generatingFeedback).to.equal(false);
  }));

  it('should not generate feedback if amountFeedbackDocs is invalid', () => {
    component.amountFeedbackDocs = 'a';

    component.generateFeedback();

    expect(component.generatingFeedback).to.equal(false);
    expect(feedbackService.submit.callCount).to.equal(0);
  });

  it('should wipe', fakeAsync(() => {
    const clearLocalStorageStub = sinon.stub(window.localStorage, 'clear');
    const registration: any = { unregister: sinon.stub() };
    const getRegistrationsStub = sinon
      .stub(window.navigator.serviceWorker, 'getRegistrations')
      .resolves([registration]);

    component.wipe();

    expect(component.wiping).to.equal(true);
    tick();
    expect(clearLocalStorageStub.callCount).to.equal(1);
    expect(getRegistrationsStub.callCount).to.equal(1);
    expect(registration.unregister.callCount).to.equal(1);
    expect(dbService.get.callCount).to.equal(2);
    expect(dbService.get.getCall(0).args[0]).to.deep.equal({ remote: false });
    expect(dbService.get.getCall(1).args[0]).to.deep.equal({ remote: false, meta: true });
    expect(database.destroy.callCount).to.equal(2);
    expect(cookieService.deleteAll.callCount).to.equal(1);
    expect(cookieService.deleteAll.args[0][0]).to.equal('/');
    tick();
    expect(component.wiping).to.equal(false);
    expect(sessionService.logout.callCount).to.equal(1);
  }));
});
