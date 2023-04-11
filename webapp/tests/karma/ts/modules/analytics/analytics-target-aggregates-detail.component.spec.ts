import { ComponentFixture, fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { TranslateFakeLoader, TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { provideMockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';
import sinon from 'sinon';
import { expect } from 'chai';

import {
  AnalyticsTargetAggregatesDetailComponent
} from '@mm-modules/analytics/analytics-target-aggregates-detail.component';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { TargetAggregatesActions } from '@mm-actions/target-aggregates';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';

describe('AnalyticsTargetAggregatesDetailComponent', () => {
  let component: AnalyticsTargetAggregatesDetailComponent;
  let fixture: ComponentFixture<AnalyticsTargetAggregatesDetailComponent>;
  let targetAggregatesService;
  let translateService;
  let targetAggregatesActions;
  let globalActions;
  let route;

  beforeEach(waitForAsync(() => {
    targetAggregatesService = {
      getAggregateDetails: sinon.stub()
    };
    targetAggregatesActions = {
      setSelectedTargetAggregate: sinon.stub(TargetAggregatesActions.prototype, 'setSelectedTargetAggregate')
    };
    globalActions = {
      setShowContent: sinon.stub(GlobalActions.prototype, 'setShowContent'),
      setTitle: sinon.stub(GlobalActions.prototype, 'setTitle')
    };
    route = {
      params: new Subject(),
    };
    const mockSelectors = [
      { selector: Selectors.getTargetAggregates, value: [ 'aggregates' ] },
      { selector: Selectors.getSelectedTargetAggregate, value: null },
      { selector: Selectors.getTargetAggregatesError, value: null },
      { selector: Selectors.getTargetAggregatesLoaded, value: true }
    ];

    return TestBed
      .configureTestingModule({
        declarations: [ AnalyticsTargetAggregatesDetailComponent ],
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          RouterTestingModule
        ],
        providers: [
          provideMockStore({ selectors: mockSelectors }),
          { provide: TargetAggregatesService, useValue: targetAggregatesService },
          { provide: ActivatedRoute, useValue: route },
        ]
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(AnalyticsTargetAggregatesDetailComponent);
        component = fixture.componentInstance;
        translateService = TestBed.inject(TranslateService);
        fixture.detectChanges();
      });
  }));

  afterEach(() => {
    sinon.restore();
  });

  it('should create component', () => {
    expect(component).to.exist;
  });

  it('ngOnDestroy() should unsubscribe from observables', () => {
    const spySubscriptionsUnsubscribe = sinon.spy(component.subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(spySubscriptionsUnsubscribe.callCount).to.equal(1);
  });

  it('should set correct scope when no item is selected', fakeAsync(() => {
    sinon.reset();

    route.params.next({});
    tick();

    expect(globalActions.setShowContent.callCount).to.equal(1);
    expect(globalActions.setShowContent.args[0][0]).to.equal(false);
    expect(targetAggregatesActions.setSelectedTargetAggregate.callCount).to.equal(1);
    expect(targetAggregatesActions.setSelectedTargetAggregate.args[0][0]).to.equal(null);
    expect(targetAggregatesService.getAggregateDetails.callCount).to.equal(0);
    expect(globalActions.setTitle.callCount).to.equal(1);
    expect(globalActions.setTitle.args[0][0]).to.equal(undefined);
  }));

  it('should set error when aggregate is not found', fakeAsync(() => {
    const consoleErrorMock = sinon.stub(console, 'error');
    sinon.reset();
    targetAggregatesService.getAggregateDetails.returns(false);

    route.params.next({ id: 'target' });
    tick();

    expect(targetAggregatesService.getAggregateDetails.callCount).to.equal(1);
    expect(targetAggregatesService.getAggregateDetails.args[0]).to.deep.equal(['target', [ 'aggregates' ]]);
    expect(globalActions.setShowContent.callCount).to.equal(1);
    expect(globalActions.setShowContent.args[0][0]).to.equal(true);
    expect(targetAggregatesActions.setSelectedTargetAggregate.callCount).to.equal(1);
    const error = targetAggregatesActions.setSelectedTargetAggregate.args[0][0].error;
    expect(error.translationKey).to.deep.equal('analytics.target.aggregates.error.not.found');
    expect(consoleErrorMock.callCount).to.equal(1);
    expect(consoleErrorMock.args[0][0]).to.equal('Error selecting target: target with id target not found');
  }));

  it('should set title', fakeAsync(() => {
    sinon.reset();
    targetAggregatesService.getAggregateDetails.returns({
      an: 'aggregate',
      translation_key: 'the_title',
      heading: 'the translated title'
    });
    translateService.instant = sinon.stub().returns('target aggregate');

    route.params.next({ id: 'target' });
    tick();

    expect(targetAggregatesService.getAggregateDetails.callCount).to.equal(1);
    expect(targetAggregatesService.getAggregateDetails.args[0]).to.deep.equal(['target', [ 'aggregates' ]]);
    expect(globalActions.setShowContent.callCount).to.equal(1);
    expect(globalActions.setShowContent.args[0][0]).to.equal(true);
    expect(globalActions.setTitle.callCount).to.equal(1);
    expect(globalActions.setTitle.args[0][0]).to.equal('target aggregate');
    expect(targetAggregatesActions.setSelectedTargetAggregate.callCount).to.equal(1);
    expect(targetAggregatesActions.setSelectedTargetAggregate.args[0][0]).to.deep.equal({
      an: 'aggregate',
      translation_key: 'the_title',
      heading: 'the translated title',
    });
    expect(translateService.instant.callCount).to.equal(1);
    expect(translateService.instant.args[0]).to.deep.equal(['analytics.target.aggregates', undefined]);
  }));
});
