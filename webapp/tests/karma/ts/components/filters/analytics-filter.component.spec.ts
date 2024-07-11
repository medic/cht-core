import { ComponentFixture, fakeAsync, flush, TestBed, waitForAsync } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

import { Selectors } from '@mm-selectors/index';
import { AnalyticsFilterComponent } from '@mm-components/filters/analytics-filter/analytics-filter.component';
import { AuthService } from '@mm-services/auth.service';
import { SessionService } from '@mm-services/session.service';
import { UserSettingsService } from '@mm-services/user-settings.service';

describe('Analytics Filter Component', () => {
  let component: AnalyticsFilterComponent;
  let fixture: ComponentFixture<AnalyticsFilterComponent>;
  let authService;
  let sessionService;
  let userSettingsService;
  let route;
  let router;
  let store: MockStore;

  beforeEach(waitForAsync(() => {
    authService = {
      has: sinon.stub().resolves(true),
    };
    sessionService = { isAdmin: sinon.stub().returns(false) };
    userSettingsService = {
      hasMultipleFacilities: sinon.stub().resolves(true)
    };
    route = {
      snapshot: { queryParams: { query: '' }, firstChild: { data: { moduleId: 'some-module' } } },
      url: of([])
    };
    router = {
      navigate: sinon.stub(),
      events: of(new NavigationEnd(0, '', '')),
    };

    const mockedSelectors = [
      { selector: Selectors.getSidebarFilter, value: {} },
    ];

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } })
        ],
        declarations: [
          AnalyticsFilterComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: AuthService, useValue: authService },
          { provide: SessionService, useValue: sessionService },
          { provide: UserSettingsService, useValue: userSettingsService },
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
  }));

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
  });

  it('should create AnalyticsFilterComponent', () => {
    expect(component).to.exist;
  });

  it('should display filter button when all conditions of showFilterButton are true', fakeAsync(() => {
    authService.has
      .withArgs(['!can_view_old_filter_and_search', '!can_view_old_action_bar'])
      .resolves(true);
    sessionService.isAdmin.returns(false);
    userSettingsService.hasMultipleFacilities.resolves(true);
    route.snapshot.firstChild.data.moduleId = 'target-aggregates';

    component.ngOnInit();
    flush();

    expect(component.showFilterButton).to.be.true;
  }));

  it('should not display filter button if user does not have multipleFacilities', fakeAsync(() => {
    userSettingsService.hasMultipleFacilities.resolves(false);

    component.ngOnInit();
    flush();

    expect(component.showFilterButton).to.be.false;
  }));

  it('should not display filter button if user is admin', fakeAsync(() => {
    sessionService.isAdmin.returns(true);

    component.ngOnInit();
    flush();

    expect(component.showFilterButton).to.be.false;
  }));

  it('should not display filter button if user old UI permissions', fakeAsync(() => {
    authService.has
      .withArgs(['!can_view_old_filter_and_search', '!can_view_old_action_bar'])
      .resolves(false);

    component.ngOnInit();
    flush();

    expect(component.showFilterButton).to.be.false;
  }));

  it('should not display filter button if module is not target aggregates', fakeAsync(() => {
    route.snapshot.firstChild.data.moduleId = 'not-target-aggregates';

    component.ngOnInit();
    flush();

    expect(component.showFilterButton).to.be.false;
  }));
});
