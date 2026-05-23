import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MatIconModule } from '@angular/material/icon';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';
import { BehaviorSubject } from 'rxjs';
import { provideMockStore } from '@ngrx/store/testing';

import { UiExtensionsTabComponent } from '@mm-modules/ui-extensions/ui-extensions-tab.component';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { PerformanceService } from '@mm-services/performance.service';
import { UiExtensionsService } from '@mm-services/ui-extensions.service';
import { UserContactSummaryService } from '@mm-services/user-contact-summary.service';
import { NavigationService } from '@mm-services/navigation.service';
import { SessionService } from '@mm-services/session.service';

describe('UiExtensionsTabComponent', () => {
  let fixture: ComponentFixture<UiExtensionsTabComponent>;
  let component: UiExtensionsTabComponent;

  let uiExtensionsService;
  let chtDatasourceService;
  let performanceService;
  let userContactSummaryService;
  let trackStop;
  let routeParams$: BehaviorSubject<any>;
  let activatedRoute;

  const EXTENSION_ID = 'my-extension';
  const EXTENSION_TITLE = 'My Extension Title';
  const MOCK_CHT_API = { v1: {} };
  const MOCK_USER_SUMMARY = { context: { userRole: 'chw' } };
  const MOCK_CONFIG = { key: 'value' };
  const MOCK_ELEMENT = class extends HTMLElement {};

  beforeEach(async () => {
    trackStop = sinon.stub().resolves();
    performanceService = { track: sinon.stub().returns({ stop: trackStop }) };
    chtDatasourceService = { get: sinon.stub().resolves(MOCK_CHT_API) };
    userContactSummaryService = { get: sinon.stub().resolves(MOCK_USER_SUMMARY) };
    uiExtensionsService = {
      getExtension: sinon.stub().resolves({
        properties: {
          id: EXTENSION_ID,
          title: EXTENSION_TITLE,
          type: 'header_tab',
          config: MOCK_CONFIG
        },
        Element: MOCK_ELEMENT,
      }),
    };
    routeParams$ = new BehaviorSubject<any>({ id: EXTENSION_ID });
    activatedRoute = {
      params: routeParams$.asObservable(),
      snapshot: { params: { id: EXTENSION_ID }, data: { tab: `ui-extension-${EXTENSION_ID}` } },
    };

    await TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        RouterTestingModule,
        MatIconModule,
        UiExtensionsTabComponent,
      ],
      providers: [
        provideMockStore(),
        { provide: ActivatedRoute, useValue: activatedRoute },
        { provide: UiExtensionsService, useValue: uiExtensionsService },
        { provide: CHTDatasourceService, useValue: chtDatasourceService },
        { provide: PerformanceService, useValue: performanceService },
        { provide: UserContactSummaryService, useValue: userContactSummaryService },
        { provide: NavigationService, useValue: {} },
        { provide: SessionService, useValue: { userCtx: sinon.stub().returns({ name: 'test-user' }) } },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UiExtensionsTabComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => sinon.restore());

  it('initializes the extension', fakeAsync(() => {
    expect(component.loading).to.be.true;
    expect(component.extensionTitle).to.equal('');
    expect(component.extensionType).to.equal('');

    fixture.detectChanges();
    flush();
    const element = fixture.nativeElement.querySelector(`cht-${EXTENSION_ID}`);

    expect(element.cht).to.deep.equal(MOCK_CHT_API);
    expect(element.inputs).to.deep.equal({
      config: MOCK_CONFIG,
      userContactSummary: MOCK_USER_SUMMARY.context,
    });
    expect(component.loading).to.be.false;
    expect(component.errorStack).to.be.undefined;
    expect(component.accentColor).to.be.undefined;
    expect(component.extensionTitle).to.equal(EXTENSION_TITLE);
    expect(component.extensionType).to.equal('header_tab');
    expect(uiExtensionsService.getExtension).to.have.been.calledOnceWithExactly(EXTENSION_ID);
    expect(performanceService.track).to.have.been.calledOnceWithExactly();
    expect(trackStop).to.have.been.calledOnceWithExactly({ name: `ui-extension:${EXTENSION_ID}:render` });
    expect(chtDatasourceService.get).to.have.been.calledOnceWithExactly();
    expect(userContactSummaryService.get).to.have.been.calledOnceWithExactly();
  }));

  it('applies accent_color to the toolbar when provided', fakeAsync(() => {
    uiExtensionsService.getExtension.resolves({
      properties: {
        id: EXTENSION_ID,
        title: EXTENSION_TITLE,
        type: 'header_tab',
        config: MOCK_CONFIG,
        accent_color: '#FF5733',
      },
      Element: MOCK_ELEMENT,
    });

    fixture.detectChanges();
    flush();

    expect(component.accentColor).to.equal('#FF5733');
    expect(component.loading).to.be.false;

    fixture.detectChanges();
    const toolbar = fixture.nativeElement.querySelector('.tool-bar');
    expect(toolbar.style.getPropertyValue('--accent-color')).to.equal('#FF5733');
  }));

  it('handles an error being thrown getting the extension', fakeAsync(() => {
    const expectedError = new Error('load error');
    uiExtensionsService.getExtension.rejects(expectedError);
    const consoleErrorMock = sinon.stub(console, 'error');

    fixture.detectChanges();
    flush();
    const element = fixture.nativeElement.querySelector(`cht-${EXTENSION_ID}`);

    expect(element).to.not.exist;
    expect(component.loading).to.be.false;
    expect(component.errorStack).to.equal(expectedError.stack);
    expect(consoleErrorMock).to.have.been.calledWithExactly(
      `Error initializing UI extension: "${EXTENSION_ID}"`,
      expectedError
    );
    expect(component.extensionTitle).to.equal('');
    expect(component.extensionType).to.equal('');
    expect(uiExtensionsService.getExtension).to.have.been.calledOnceWithExactly(EXTENSION_ID);
    expect(performanceService.track).to.have.been.calledOnceWithExactly();
    expect(trackStop).to.have.been.calledOnceWithExactly({ name: `ui-extension:${EXTENSION_ID}:render` });
    expect(chtDatasourceService.get).to.not.have.been.called;
    expect(userContactSummaryService.get).to.not.have.been.called;
  }));

  it('re-initializes when route params change to a different extension', fakeAsync(() => {
    fixture.detectChanges();
    flush();

    expect(uiExtensionsService.getExtension.callCount).to.equal(1);
    expect(uiExtensionsService.getExtension.firstCall.args[0]).to.equal(EXTENSION_ID);
    const firstElement = fixture.nativeElement.querySelector(`cht-${EXTENSION_ID}`);
    expect(firstElement).to.exist;

    const otherId = 'other-extension';
    const otherTitle = 'Other Extension';
    const OtherElement = class extends HTMLElement {};
    uiExtensionsService.getExtension.resolves({
      properties: {
        id: otherId,
        title: otherTitle,
        type: 'sidebar_tab',
        config: { other: true },
      },
      Element: OtherElement,
    });
    routeParams$.next({ id: otherId });
    flush();

    expect(uiExtensionsService.getExtension.callCount).to.equal(2);
    expect(uiExtensionsService.getExtension.secondCall.args[0]).to.equal(otherId);
    expect(component.extensionTitle).to.equal(otherTitle);
    expect(component.extensionType).to.equal('sidebar_tab');
    const otherElement = fixture.nativeElement.querySelector(`cht-${otherId}`);
    expect(otherElement).to.exist;
    expect(fixture.nativeElement.querySelector(`cht-${EXTENSION_ID}`)).to.not.exist;
  }));

  it('does not re-initialize when route params emit the same extension id', fakeAsync(() => {
    fixture.detectChanges();
    flush();

    expect(uiExtensionsService.getExtension.callCount).to.equal(1);

    routeParams$.next({ id: EXTENSION_ID });
    flush();

    expect(uiExtensionsService.getExtension.callCount).to.equal(1);
  }));

  it('cleans up param subscription on destroy', fakeAsync(() => {
    fixture.detectChanges();
    flush();

    expect(uiExtensionsService.getExtension.callCount).to.equal(1);

    component.ngOnDestroy();

    routeParams$.next({ id: 'other-extension' });
    flush();

    expect(uiExtensionsService.getExtension.callCount).to.equal(1);
  }));

  describe('global error listener', () => {
    let addEventListenerSpy;
    let removeEventListenerSpy;
    let consoleErrorMock;

    beforeEach(() => {
      addEventListenerSpy = sinon.spy(globalThis, 'addEventListener');
      removeEventListenerSpy = sinon.spy(globalThis, 'removeEventListener');
      consoleErrorMock = sinon.stub(console, 'error');
    });

    const findCall = (calls, type) => calls.find(call => call.args[0] === type);

    it('logs errors with the extension id tag when an error event fires', fakeAsync(() => {
      fixture.detectChanges();
      flush();

      const errorRegistration = findCall(addEventListenerSpy.getCalls(), 'error');
      const rejectionRegistration = findCall(addEventListenerSpy.getCalls(), 'unhandledrejection');
      expect(errorRegistration!.args[1]).to.equal(rejectionRegistration!.args[1]);

      const listener = errorRegistration!.args[1] as (event: any) => void;
      const error = new Error('runtime boom');
      listener({ error, message: error.message });

      expect(consoleErrorMock).to.have.been.calledOnceWithExactly(
        `Error in UI extension: "${EXTENSION_ID}"`,
        error
      );
    }));

    it('logs the rejection reason when an unhandledrejection event fires', fakeAsync(() => {
      fixture.detectChanges();
      flush();

      const listener = findCall(addEventListenerSpy.getCalls(), 'unhandledrejection')!
        .args[1] as (event: any) => void;
      const reason = new Error('reject boom');
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason,
      });
      listener(event);

      expect(consoleErrorMock).to.have.been.calledOnceWithExactly(
        `Error in UI extension: "${EXTENSION_ID}"`,
        reason
      );
    }));

    it('falls back to event.message when ErrorEvent has no error object', fakeAsync(() => {
      fixture.detectChanges();
      flush();

      const listener = findCall(addEventListenerSpy.getCalls(), 'error')!
        .args[1] as (event: any) => void;
      listener({ error: undefined, message: 'plain message' });

      expect(consoleErrorMock).to.have.been.calledOnceWithExactly(
        `Error in UI extension: "${EXTENSION_ID}"`,
        'plain message'
      );
    }));

    it('re-registers the listener with the new extension id when switching extensions', fakeAsync(() => {
      fixture.detectChanges();
      flush();

      const initialListener = findCall(addEventListenerSpy.getCalls(), 'error')!.args[1];

      const otherId = 'other-extension';
      uiExtensionsService.getExtension.resolves({
        properties: { id: otherId, title: 'Other', type: 'header_tab' },
        Element: class extends HTMLElement {},
      });
      routeParams$.next({ id: otherId });
      flush();

      const removeErrorCall = removeEventListenerSpy.getCalls()
        .find(call => call.args[0] === 'error' && call.args[1] === initialListener);
      const removeRejectionCall = removeEventListenerSpy.getCalls()
        .find(call => call.args[0] === 'unhandledrejection' && call.args[1] === initialListener);
      expect(removeErrorCall).to.exist;
      expect(removeRejectionCall).to.exist;

      const newRegistration = addEventListenerSpy.getCalls()
        .filter(call => call.args[0] === 'error')
        .find(call => call.args[1] !== initialListener);
      const newListener = newRegistration!.args[1] as (event: any) => void;
      const error = new Error('after switch');
      newListener({ error, message: error.message });

      expect(consoleErrorMock).to.have.been.calledOnceWithExactly(
        `Error in UI extension: "${otherId}"`,
        error
      );
    }));

    it('unregisters the error listener on destroy', fakeAsync(() => {
      fixture.detectChanges();
      flush();

      const listener = findCall(addEventListenerSpy.getCalls(), 'error')!.args[1];

      component.ngOnDestroy();

      const removeErrorCall = removeEventListenerSpy.getCalls()
        .find(call => call.args[0] === 'error' && call.args[1] === listener);
      const removeRejectionCall = removeEventListenerSpy.getCalls()
        .find(call => call.args[0] === 'unhandledrejection' && call.args[1] === listener);
      expect(removeErrorCall).to.exist;
      expect(removeRejectionCall).to.exist;
    }));
  });
});
