import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { of, Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

import { Selectors } from '@mm-selectors/index';
import { AnalyticsFilterComponent } from '@mm-components/filters/analytics-filter/analytics-filter.component';
import { AuthService } from '@mm-services/auth.service';
import { SessionService } from '@mm-services/session.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { GlobalActions } from '@mm-actions/global';

describe('Analytics Filter Component', () => {
  let component: AnalyticsFilterComponent;
  let fixture: ComponentFixture<AnalyticsFilterComponent>;
  let authService;
  let sessionService;
  let telemetryService;
  let targetAggregatesService;
  let globalActions;
  let route;
  let router;
  let routerEventSubject;
  let store: MockStore;

  beforeEach(async () => {
    authService = {
      has: sinon.stub().resolves(true),
    };
    sessionService = { isAdmin: sinon.stub() };
    telemetryService = { record: sinon.stub() };
    targetAggregatesService = {
      isEnabled: sinon.stub().resolves(false),
    };
    globalActions = {
      setSidebarFilter: sinon.stub(GlobalActions.prototype, 'setSidebarFilter'),
    };
    route = {
      snapshot: { queryParams: { query: '' }, firstChild: { data: { moduleId: 'some-module' } } },
      url: of([])
    };
    routerEventSubject = new Subject();
    router = {
      navigate: sinon.stub(),
      events: of(),
    };
    router.events.pipe = sinon.stub().returns(routerEventSubject);

    const mockedSelectors = [
      { selector: Selectors.getSidebarFilter, value: {} },
    ];

    await TestBed
      .configureTestingModule({
    imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        MatIconModule,
        AnalyticsFilterComponent,
    ],
    providers: [
        provideMockStore({ selectors: mockedSelectors }),
        { provide: AuthService, useValue: authService },
        { provide: SessionService, useValue: sessionService },
        { provide: TelemetryService, useValue: telemetryService },
        { provide: TargetAggregatesService, useValue: targetAggregatesService },
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: router },
    ]
})
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AnalyticsFilterComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        fixture.detectChanges();
      });
  });

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
  });

  it('should create AnalyticsFilterComponent', () => {
    expect(component).to.exist;
  });

  it('should display filter button when all conditions of showFilterButton are true', fakeAsync(() => {
    sinon.resetHistory();
    sessionService.isAdmin.returns(false);
    route.snapshot.firstChild.data.moduleId = 'target-aggregates';
    targetAggregatesService.isEnabled.resolves(true);

    component.ngOnInit();
    flush();

    expect(component.showFilterButton).to.be.true;
    expect(sessionService.isAdmin.callCount).to.equal(1);
    expect(targetAggregatesService.isEnabled.callCount).to.equal(1);
  }));

  it('should open and close sidebar filter', () => {
    sinon.resetHistory();
    component.openSidebar();
    component.openSidebar();
    component.openSidebar();

    expect(globalActions.setSidebarFilter.calledThrice).to.be.true;
    expect(globalActions.setSidebarFilter.args[0][0]).to.deep.equal({ isOpen: true });
    expect(globalActions.setSidebarFilter.args[1][0]).to.deep.equal({ isOpen: false });
    expect(globalActions.setSidebarFilter.args[2][0]).to.deep.equal({ isOpen: true });
    expect(telemetryService.record.calledTwice).to.be.true;
    expect(telemetryService.record.args[0]).to.deep.equal(['sidebar_filter:analytics:target_aggregates:open']);
  });

  it('should not display filter button if user is admin', fakeAsync(() => {
    sinon.resetHistory();
    sessionService.isAdmin.returns(true);

    component.ngOnInit();
    flush();

    expect(component.showFilterButton).to.be.false;
  }));

  it('should not display filter button if targetAggregate is not enabled', fakeAsync(() => {
    sinon.resetHistory();
    targetAggregatesService.isEnabled.resolves(false);

    component.ngOnInit();
    flush();

    expect(component.showFilterButton).to.be.false;
    expect(sessionService.isAdmin.callCount).to.equal(1);
    expect(targetAggregatesService.isEnabled.callCount).to.equal(1);
  }));

  it('should not display filter button if module is not target aggregates', fakeAsync(() => {
    sinon.resetHistory();
    route.snapshot.firstChild.data.moduleId = 'not-target-aggregates';

    component.ngOnInit();
    flush();

    expect(component.showFilterButton).to.be.false;
    expect(sessionService.isAdmin.callCount).to.equal(1);
    expect(targetAggregatesService.isEnabled.callCount).to.equal(1);
  }));

  it('should update the active module when route changes', fakeAsync(() => {
    component.analyticsModules = [
      { id: 'targets' },
      { id: 'target-aggregates' },
    ];

    routerEventSubject.next({ snapshot: { data: { moduleId: 'random-module' } } });
    flush();

    expect(component.activeModule).to.be.undefined;

    routerEventSubject.next({ snapshot: { data: { moduleId: 'targets' } } });
    flush();

    expect(component.activeModule).to.not.be.undefined;
    expect(component.activeModule.id).to.equal('targets');

    routerEventSubject.next({ snapshot: { data: { moduleId: 'target-aggregates' } } });
    flush();

    expect(component.activeModule).to.not.be.undefined;
    expect(component.activeModule.id).to.equal('target-aggregates');
  }));
});
