import { async, ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { expect } from 'chai';
import sinon from 'sinon';

import { AnalyticsTargetAggregatesComponent } from '@mm-modules/analytics/analytics-target-aggregates.component';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { TargetAggregates } from '@mm-actions/target-aggregates';

describe('Analytics Target Aggregates Component', () => {
  let component: AnalyticsTargetAggregatesComponent;
  let fixture: ComponentFixture<AnalyticsTargetAggregatesComponent>;
  let store: MockStore;
  let targetAggregatesService;
  let targetAggregatesAction;

  beforeEach(async(() => {
    targetAggregatesService = {
      isEnabled: sinon.stub().resolves(false),
      getAggregates: sinon.stub()
    };
    targetAggregatesAction = {
      setTargetAggregates: sinon.stub(TargetAggregates.prototype, 'setTargetAggregates'),
      setTargetAggregatesError: sinon.stub(TargetAggregates.prototype, 'setTargetAggregatesError')
    };
    const mockedSelectors = [
      { selector: 'getSelectedTargetAggregate', value: null },
      { selector: 'getTargetAggregates', value: null },
      { selector: 'getTargetAggregatesError', value: null },
    ];

    TestBed
      .configureTestingModule({
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
        store = TestBed.inject(MockStore);
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
    const newComponent = new AnalyticsTargetAggregatesComponent(null, null);

    expect(newComponent.loading).to.equal(true);
    expect(newComponent.error).to.equal(null);
    expect(newComponent.aggregates).to.deep.equal(null);
    expect(newComponent.enabled).to.equal(false);
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });

  it('should set correct loading and error when TargetAggregates fails', fakeAsync(() => {
    sinon.reset();
    targetAggregatesService.isEnabled.rejects({ some: 'err' });
    
    component.ngOnInit();
    tick();

    expect(targetAggregatesService.isEnabled.callCount).to.equal(1);
    expect(targetAggregatesService.getAggregates.callCount).to.equal(0);
    expect(component.loading).to.equal(false);
    expect(targetAggregatesAction.setTargetAggregatesError.callCount).to.equal(2);  // onNgInit() & getTargetAggregates() calls
    expect(targetAggregatesAction.setTargetAggregatesError.getCall(0).args[0]).to.deep.equal(null);
    expect(targetAggregatesAction.setTargetAggregatesError.getCall(1).args[0]).to.deep.equal({ some: 'err' });
    expect(targetAggregatesAction.setTargetAggregates.callCount).to.equal(1); // onNgInit call
    expect(targetAggregatesAction.setTargetAggregates.args[0]).to.deep.equal([null]);
    expect(component.enabled).to.equal(false);
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
    expect(targetAggregatesAction.setTargetAggregatesError.callCount).to.equal(1); // onNgInit() call
    expect(targetAggregatesAction.setTargetAggregatesError.args[0]).to.deep.equal([null]);
    expect(targetAggregatesAction.setTargetAggregates.callCount).to.equal(2); // onNgInit() & getTargetAggregates() calls
    expect(targetAggregatesAction.setTargetAggregates.getCall(0).args[0]).to.deep.equal(null);
    expect(targetAggregatesAction.setTargetAggregates.getCall(1).args[0]).to.deep.equal(undefined);
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
    expect(targetAggregatesAction.setTargetAggregatesError.callCount).to.equal(1); // onNgInit() call
    expect(targetAggregatesAction.setTargetAggregatesError.args[0]).to.deep.equal([null]);
    expect(targetAggregatesAction.setTargetAggregates.callCount).to.equal(2); // onNgInit() & getTargetAggregates() calls
    expect(targetAggregatesAction.setTargetAggregates.getCall(0).args[0]).to.deep.equal(null);
    expect(targetAggregatesAction.setTargetAggregates.getCall(1).args[0]).to.deep.equal(['some aggregates']);
  }));
});
