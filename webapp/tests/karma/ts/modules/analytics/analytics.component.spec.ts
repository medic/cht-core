import { async, ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';
import { of } from 'rxjs';

import { AnalyticsComponent } from '@mm-modules/analytics/analytics.component';
import { AnalyticsFilterComponent } from '@mm-components/filters/analytics-filter/analytics-filter.component';
import { AnalyticsModulesService } from '@mm-services/analytics-modules.service';
import { GlobalActions } from '@mm-actions/global';
import { AnalyticsActions } from '@mm-actions/analytics';
import { NavigationComponent } from '@mm-components/navigation/navigation.component';
import { TourService } from '@mm-services/tour.service';

describe('AnalyticsComponent', () => {
  let component: AnalyticsComponent;
  let fixture: ComponentFixture<AnalyticsComponent>;
  let analyticsModulesService;
  let globalActions;
  let analyticsActions;
  let activatedRoute;
  let router;

  beforeEach(async(() => {
    analyticsModulesService = { get: sinon.stub().resolves([]) };
    const mockSelectors = [
      { selector: 'getAnalyticsModules', value: [] },
    ];
    globalActions = {
      unsetSelected: sinon.stub(GlobalActions.prototype, 'unsetSelected')
    };
    analyticsActions = {
      setAnalyticsModules: sinon.stub(AnalyticsActions.prototype, 'setAnalyticsModules')
    };
    activatedRoute = {
      snapshot: {
        firstChild: { data: {} }
      },
      url: {
        subscribe: sinon.stub().resolves(of({})),
      }
    };

    return TestBed
      .configureTestingModule({
        declarations: [
          AnalyticsComponent,
          AnalyticsFilterComponent,
          NavigationComponent,
        ],
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
        ],
        providers: [
          provideMockStore({ selectors: mockSelectors }),
          { provide: AnalyticsModulesService, useValue: analyticsModulesService },
          { provide: ActivatedRoute, useValue: activatedRoute },
          { provide: TourService, useValue: { startIfNeeded: sinon.stub() } },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AnalyticsComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create and set up controller with no modules', () => {
    expect(component).to.exist;
    expect(component.analyticsModules).to.be.empty;
    expect(globalActions.unsetSelected.callCount).to.equal(1);
    expect(analyticsModulesService.get.callCount).to.equal(1);
  });

  it('should set analytics modules', fakeAsync(() => {
    sinon.reset();
    const analyticsModules = [
      { id: 'target-aggregates', route: ['/', 'analytics', 'target-aggregates'] },
      { id: 'targets', route: ['/', 'analytics', 'targets'] }
    ];
    activatedRoute.snapshot.firstChild.data.moduleId = 'targets';
    analyticsModulesService.get.resolves(analyticsModules);

    component.ngOnInit();
    tick(50);

    expect(analyticsModulesService.get.callCount).to.equal(1);
    expect(analyticsActions.setAnalyticsModules.callCount).to.equal(1);
    expect(analyticsActions.setAnalyticsModules.args[0]).to.deep.equal([analyticsModules]);
  }));

  it('should navigate to child route if single module is present', fakeAsync(() => {
    sinon.reset();
    activatedRoute.snapshot.firstChild.data.tab = 'analytics';
    const navigateStub = sinon.stub(router, 'navigate');
    const analyticsModules = [{ id: 'targets', route: ['/', 'analytics', 'targets'] }];
    analyticsModulesService.get.resolves(analyticsModules);

    component.ngOnInit();
    tick(50);

    expect(analyticsModulesService.get.callCount).to.equal(1);
    expect(analyticsActions.setAnalyticsModules.callCount).to.equal(1);
    expect(analyticsActions.setAnalyticsModules.args[0][0]).to.deep.equal(analyticsModules);
    expect(navigateStub.callCount).to.equal(1);
    expect(navigateStub.args[0]).to.deep.equal([['/', 'analytics', 'targets']]);
  }));

  it('should not navigate to child route if multiple modules are present', fakeAsync(() => {
    sinon.reset();
    activatedRoute.snapshot.firstChild.data.tab = 'analytics';
    const navigateStub = sinon.stub(router, 'navigate');
    const analyticsModules = [
      { id: 'target-aggregates', route: ['/', 'analytics', 'target-aggregates'] },
      { id: 'targets', route: ['/', 'analytics', 'targets'] }
    ];
    analyticsModulesService.get.resolves(analyticsModules);

    component.ngOnInit();
    tick(50);

    expect(analyticsModulesService.get.callCount).to.equal(1);
    expect(analyticsActions.setAnalyticsModules.callCount).to.equal(1);
    expect(analyticsActions.setAnalyticsModules.args[0][0]).to.deep.equal(analyticsModules);
    expect(navigateStub.callCount).to.equal(0);
  }));

  it('should navigate to child route if single module is present when it is a route event', fakeAsync(() => {
    sinon.reset();
    const event = new NavigationEnd(42, '/', '/analytics');
    activatedRoute.snapshot.firstChild.data.tab = 'analytics';
    component.analyticsModules = [{ id: 'targets', route: ['/', 'analytics', 'targets'] }];
    const navigateStub = sinon.stub(router, 'navigate');

    router.events.next(event);
    flush();

    expect(navigateStub.callCount).to.equal(1);
    expect(navigateStub.args[0]).to.deep.equal([['/', 'analytics', 'targets']]);
  }));

  it('should not navigate to child route if multiple modules are present when it is a route event', fakeAsync(() => {
    sinon.reset();
    const event = new NavigationEnd(42, '/', '/analytics');
    activatedRoute.snapshot.firstChild.data.tab = 'analytics';
    component.analyticsModules = [
      { id: 'target-aggregates', route: ['/', 'analytics', 'target-aggregates'] },
      { id: 'targets', route: ['/', 'analytics', 'targets'] }
    ];
    const navigateStub = sinon.stub(router, 'navigate');

    router.events.next(event);
    flush();

    expect(navigateStub.callCount).to.equal(0);
  }));
});
