import { async, ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { AnalyticsComponent } from '@mm-modules/analytics/analytics.component';
import { AnalyticsModulesService } from '@mm-services/analytics-modules.service';
import { GlobalActions } from '@mm-actions/global';
import { AnalyticsActions } from '@mm-actions/analytics';

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
      setSelectedAnalytics: sinon.stub(AnalyticsActions.prototype, 'setSelectedAnalytics'),
      setAnalyticsModules: sinon.stub(AnalyticsActions.prototype, 'setAnalyticsModules')
    };
    activatedRoute = {
      snapshot: {
        routeConfig: { path: '' },
      },
    };

    return TestBed
      .configureTestingModule({
        declarations: [ AnalyticsComponent ],
        imports: [
          RouterTestingModule,
        ],
        providers: [
          provideMockStore({ selectors: mockSelectors }),
          { provide: AnalyticsModulesService, useValue: analyticsModulesService },
          { provide: ActivatedRoute, useValue: activatedRoute },
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
    expect(analyticsActions.setSelectedAnalytics.callCount).to.equal(2);
    expect(globalActions.unsetSelected.callCount).to.equal(1);
    expect(analyticsModulesService.get.callCount).to.equal(1);
  });

  it('should set selected the specified module', fakeAsync(() => {
    sinon.reset();
    const analyticsModules = [
      { route: 'reporting' },
      { route: 'targets' }
    ];
    activatedRoute.snapshot.routeConfig.path = 'targets';
    analyticsModulesService.get.resolves(analyticsModules);

    component.ngOnInit();
    tick(50);

    expect(analyticsModulesService.get.callCount).to.equal(1);
    expect(analyticsActions.setSelectedAnalytics.callCount).to.equal(2);
    expect(analyticsActions.setSelectedAnalytics.getCall(1).args[0]).to.equal(analyticsModules[1]);
    expect(analyticsActions.setAnalyticsModules.callCount).to.equal(1);
    expect(analyticsActions.setAnalyticsModules.args[0][0]).to.have.members(analyticsModules);
  }));

  it('should jump to child route if single module is present', fakeAsync(() => {
    sinon.reset();
    activatedRoute.snapshot.routeConfig.path = 'analytics';
    const navigateStub = sinon.stub(router, 'navigate');
    const analyticsModules = [{ route: 'targets' }];
    analyticsModulesService.get.resolves(analyticsModules);

    component.ngOnInit();
    tick(50);

    expect(analyticsModulesService.get.callCount).to.equal(1);
    expect(analyticsActions.setSelectedAnalytics.callCount).to.equal(1);
    expect(analyticsActions.setAnalyticsModules.callCount).to.equal(1);
    expect(analyticsActions.setAnalyticsModules.args[0][0]).to.have.members(analyticsModules);
    expect(navigateStub.callCount).to.equal(1);
    expect(navigateStub.args[0]).to.deep.equal([['targets']]);
  }));

  it('should not jump to child route if multiple module are present', fakeAsync(() => {
    sinon.reset();
    activatedRoute.snapshot.routeConfig.path = 'analytics';
    const navigateStub = sinon.stub(router, 'navigate');
    const analyticsModules = [
      { route: 'reporting' },
      { route: 'targets' }
    ];
    analyticsModulesService.get.resolves(analyticsModules);

    component.ngOnInit();
    tick(50);

    expect(analyticsModulesService.get.callCount).to.equal(1);
    expect(analyticsActions.setSelectedAnalytics.callCount).to.equal(1);
    expect(analyticsActions.setAnalyticsModules.callCount).to.equal(1);
    expect(analyticsActions.setAnalyticsModules.args[0][0]).to.have.members(analyticsModules);
    expect(navigateStub.callCount).to.equal(0);
  }));
});
