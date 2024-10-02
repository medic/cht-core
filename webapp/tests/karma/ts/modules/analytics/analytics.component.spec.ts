import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { RouterTestingModule } from '@angular/router/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';

import { AnalyticsComponent } from '@mm-modules/analytics/analytics.component';
import { AnalyticsFilterComponent } from '@mm-components/filters/analytics-filter/analytics-filter.component';
import { ToolBarComponent } from '@mm-components/tool-bar/tool-bar.component';
import { GlobalActions } from '@mm-actions/global';
import { NavigationComponent } from '@mm-components/navigation/navigation.component';
import { Selectors } from '@mm-selectors/index';
import { NavigationService } from '@mm-services/navigation.service';
import { AuthService } from '@mm-services/auth.service';
import { SessionService } from '@mm-services/session.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { UserSettingsService } from '@mm-services/user-settings.service';

describe('AnalyticsComponent', () => {
  let component: AnalyticsComponent;
  let fixture: ComponentFixture<AnalyticsComponent>;
  let globalActions;
  let authService;
  let sessionService;
  let userSettingsService;
  let telemetryService;
  let targetAggregatesService;
  let store;

  beforeEach(waitForAsync(() => {
    const mockSelectors = [
      { selector: Selectors.getAnalyticsModules, value: [] },
    ];
    authService = {
      has: sinon.stub().resolves(true),
    };
    userSettingsService = {
      hasMultipleFacilities: sinon.stub().resolves(true)
    };
    sessionService = {
      isAdmin: sinon.stub().returns(false)
    };
    telemetryService = { record: sinon.stub() };
    targetAggregatesService = {
      isEnabled: sinon.stub().resolves(false),
    };
    globalActions = {
      unsetSelected: sinon.stub(GlobalActions.prototype, 'unsetSelected')
    };

    return TestBed
      .configureTestingModule({
        declarations: [
          AnalyticsComponent,
          AnalyticsFilterComponent,
          NavigationComponent,
          ToolBarComponent,
        ],
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule,
          MatIconModule,
        ],
        providers: [
          provideMockStore({ selectors: mockSelectors }),
          { provide: NavigationService, useValue: {} },
          { provide: AuthService, useValue: authService },
          { provide: SessionService, useValue: sessionService },
          { provide: TelemetryService, useValue: telemetryService },
          { provide: TargetAggregatesService, useValue: targetAggregatesService },
          { provide: UserSettingsService, useValue: userSettingsService}
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AnalyticsComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(MockStore);
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
  });

  it('should create and set up controller with no modules', () => {
    expect(component).to.exist;
    expect(component.analyticsModules).to.be.empty;
    expect(globalActions.unsetSelected.callCount).to.equal(1);
  });

  it('should set analytics module when store emits', () => {
    store.overrideSelector(Selectors.getAnalyticsModules, [
      { id: 'target-aggregates', route: ['/', 'analytics', 'target-aggregates'] },
      { id: 'targets', route: ['/', 'analytics', 'targets'] }
    ]);
    store.refreshState();

    expect(component.analyticsModules).to.deep.equal([
      { id: 'target-aggregates', route: ['/', 'analytics', 'target-aggregates'] },
      { id: 'targets', route: ['/', 'analytics', 'targets'] }
    ]);
  });
});
