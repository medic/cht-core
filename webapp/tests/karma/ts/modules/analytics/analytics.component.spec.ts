import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import sinon from 'sinon';
import { expect } from 'chai';

import { AnalyticsComponent } from '@mm-modules/analytics/analytics.component';
import { AnalyticsFilterComponent } from '@mm-components/filters/analytics-filter/analytics-filter.component';
import { GlobalActions } from '@mm-actions/global';
import { NavigationComponent } from '@mm-components/navigation/navigation.component';
import { Selectors } from '@mm-selectors/index';
import { NavigationService } from '@mm-services/navigation.service';

describe('AnalyticsComponent', () => {
  let component: AnalyticsComponent;
  let fixture: ComponentFixture<AnalyticsComponent>;
  let globalActions;
  let store;

  beforeEach(waitForAsync(() => {
    const mockSelectors = [
      { selector: Selectors.getAnalyticsModules, value: [] },
    ];
    globalActions = {
      unsetSelected: sinon.stub(GlobalActions.prototype, 'unsetSelected')
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
          { provide: NavigationService, useValue: {} },
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
