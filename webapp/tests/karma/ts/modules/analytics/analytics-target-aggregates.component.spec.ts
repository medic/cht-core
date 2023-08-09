import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';

import { AnalyticsTargetAggregatesComponent } from '@mm-modules/analytics/analytics-target-aggregates.component';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { TargetAggregatesActions } from '@mm-actions/target-aggregates';
import { Store } from '@ngrx/store';

describe('Analytics Target Aggregates Component', () => {
  let component: AnalyticsTargetAggregatesComponent;
  let fixture: ComponentFixture<AnalyticsTargetAggregatesComponent>;
  let targetAggregatesService;
  let targetAggregatesActions;

  beforeEach(waitForAsync(() => {
    targetAggregatesService = {
      isEnabled: sinon.stub().resolves(false),
      getAggregates: sinon.stub()
    };
    targetAggregatesActions = {
      setTargetAggregates: sinon.stub(TargetAggregatesActions.prototype, 'setTargetAggregates'),
      setTargetAggregatesError: sinon.stub(TargetAggregatesActions.prototype, 'setTargetAggregatesError'),
      setTargetAggregatesLoaded: sinon.stub(TargetAggregatesActions.prototype, 'setTargetAggregatesLoaded')
    };
    const mockedSelectors = [
      { selector: 'getSelectedTargetAggregate', value: null },
      { selector: 'getTargetAggregates', value: null },
      { selector: 'getTargetAggregatesError', value: null },
    ];

    return TestBed
      .configureTestingModule({
        declarations: [ AnalyticsTargetAggregatesComponent ],
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: TargetAggregatesService, useValue: targetAggregatesService },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AnalyticsTargetAggregatesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create component', () => {
    expect(component).to.exist;
  });

  it('should instantiate correctly', () => {

    const newComponent = new AnalyticsTargetAggregatesComponent(
      sinon.createStubInstance(Store),
      sinon.createStubInstance(TargetAggregatesService)
    );

    expect(newComponent.loading).to.equal(true);
    expect(newComponent.error).to.equal(null);
    expect(newComponent.aggregates).to.deep.equal(null);
    expect(newComponent.enabled).to.equal(false);
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    sinon.reset();
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregatesError.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregates.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregatesLoaded.callCount).to.equal(1);
  });

  it('should set correct loading and error when TargetAggregates fails', fakeAsync(() => {
    sinon.reset();
    targetAggregatesService.isEnabled.rejects({ some: 'err' });
    const consoleErrorMock = sinon.stub(console, 'error');
    
    component.ngOnInit();
    tick();

    expect(targetAggregatesService.isEnabled.callCount).to.equal(1);
    expect(targetAggregatesService.getAggregates.callCount).to.equal(0);
    expect(component.loading).to.equal(false);
    expect(targetAggregatesActions.setTargetAggregatesError.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregatesError.args[0][0]).to.deep.equal({ some: 'err' });
    expect(component.enabled).to.equal(false);
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error getting aggregate targets');
  }));

  it('should set aggregates disabled', fakeAsync(() => {
    sinon.reset();
    targetAggregatesService.isEnabled.resolves(false);

    component.ngOnInit();
    tick();

    expect(targetAggregatesService.isEnabled.callCount).to.equal(1);
    expect(targetAggregatesService.getAggregates.callCount).to.equal(0);
    expect(component.loading).to.equal(false);
    expect(component.enabled).to.equal(false);
    expect(targetAggregatesActions.setTargetAggregatesError.callCount).to.equal(0);
    expect(targetAggregatesActions.setTargetAggregates.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregates.args[0][0]).to.deep.equal(undefined);
  }));

  it('should set aggregates', fakeAsync(() => {
    sinon.reset();
    targetAggregatesService.isEnabled.resolves(true);
    targetAggregatesService.getAggregates.resolves(['some aggregates']);

    component.ngOnInit();
    tick();

    expect(targetAggregatesService.isEnabled.callCount).to.equal(1);
    expect(targetAggregatesService.getAggregates.callCount).to.equal(1);
    expect(component.loading).to.equal(false);
    expect(component.enabled).to.equal(true);
    expect(targetAggregatesActions.setTargetAggregatesError.callCount).to.equal(0);
    expect(targetAggregatesActions.setTargetAggregates.callCount).to.equal(1);
    expect(targetAggregatesActions.setTargetAggregates.args[0][0]).to.deep.equal(['some aggregates']);
  }));
});
