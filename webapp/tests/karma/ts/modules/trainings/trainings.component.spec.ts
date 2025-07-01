import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { expect } from 'chai';
import sinon from 'sinon';

import { GlobalActions } from '@mm-actions/global';
import { PerformanceService } from '@mm-services/performance.service';
import { ModalLayoutComponent } from '@mm-components/modal-layout/modal-layout.component';
import { TrainingCardsFormComponent } from '@mm-components/training-cards-form/training-cards-form.component';
import { EnketoComponent } from '@mm-components/enketo/enketo.component';
import { Selectors } from '@mm-selectors/index';
import { TrainingsComponent } from '@mm-modules/trainings/trainings.component';
import { TrainingCardsService } from '@mm-services/training-cards.service';
import { ScrollLoaderProvider } from '@mm-providers/scroll-loader.provider';
import { ToolBarComponent } from '@mm-components/tool-bar/tool-bar.component';

describe('TrainingsComponent', () => {
  let fixture: ComponentFixture<TrainingsComponent>;
  let component: TrainingsComponent;
  let globalActions;
  let performanceService;
  let stopPerformanceTrackStub;
  let trainingCardsService;
  let scrollLoaderProvider;
  let consoleErrorMock;
  let store;

  beforeEach(() => {
    consoleErrorMock = sinon.stub(console, 'error');
    globalActions = {
      unsetSelected: sinon.stub(GlobalActions.prototype, 'unsetSelected'),
    };
    stopPerformanceTrackStub = sinon.stub();
    performanceService = { track: sinon.stub().returns({ stop: stopPerformanceTrackStub }) };
    trainingCardsService = { getNextTrainings: sinon.stub() };
    scrollLoaderProvider = { init: sinon.stub() };
    const mockedSelectors = [
      { selector: Selectors.getTrainingMaterials, value: null },
      { selector: Selectors.getTrainingCardFormId, value: null },
    ];

    return TestBed
      .configureTestingModule({
        imports: [
          RouterModule,
          MatIconModule,
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
          TrainingsComponent,
          ModalLayoutComponent,
          TrainingCardsFormComponent,
          EnketoComponent,
          ToolBarComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: PerformanceService, useValue: performanceService },
          { provide: TrainingCardsService, useValue: trainingCardsService },
          { provide: ScrollLoaderProvider, useValue: scrollLoaderProvider },
        ],
      })
      .overrideComponent(ToolBarComponent, {
        set: {
          selector: 'mm-tool-bar',
          template: '<div>Tool bar mock</div>'
        }
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(TrainingsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        sinon.resetHistory();
        store = TestBed.inject(MockStore);
      });
  });

  afterEach(() => {
    store.resetSelectors();
    sinon.restore();
  });

  it('should unsubscribe from store and clear selected from global state', () => {
    const unsubscribeStub = sinon.stub(component.subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(unsubscribeStub.calledOnce).to.be.true;
    expect(globalActions.unsetSelected.calledOnce).to.be.true;
  });

  it('should not get trainings when no forms', fakeAsync(() => {
    store.overrideSelector(Selectors.getTrainingMaterials, []);
    store.refreshState();
    flush();

    expect(trainingCardsService.getNextTrainings.notCalled).to.be.true;
  }));

  it('should load trainings when there are forms', fakeAsync(() => {
    trainingCardsService.getNextTrainings.returns([ { code: 'form-1' } ]);
    store.overrideSelector(Selectors.getTrainingMaterials, [ { _id: 'form-1' }, { _id: 'form-2' } ]);
    store.refreshState();
    flush();

    expect(trainingCardsService.getNextTrainings.calledOnce).to.be.true;
    expect(trainingCardsService.getNextTrainings.args[0]).to.have.deep.members([
      [ { _id: 'form-1' }, { _id: 'form-2' } ],
      50,
      0,
    ]);
    expect(component.moreTrainings).to.be.false;
    expect(component.loading).to.be.false;
    expect(component.trainingList).to.have.deep.members([ { code: 'form-1' } ]);
    expect(stopPerformanceTrackStub.calledOnce).to.be.true;
    expect(scrollLoaderProvider.init.calledOnce).to.be.true;
    expect(consoleErrorMock.notCalled).to.be.true;
  }));

  it('should load next page of trainings', fakeAsync(async () => {
    store.overrideSelector(Selectors.getTrainingMaterials, [ { _id: 'form-3' }, { _id: 'form-4' } ]);
    store.refreshState();
    flush();
    sinon.resetHistory();
    const previousPage = Array
      .from({ length: 50 })
      .map((form, index) => ({
        code: 'form-x-' + index,
        id: 'form-id',
        title: 'training-x',
        startDate: new Date(),
        duration: 1,
        userRoles: [ 'chw' ],
        isCompletedTraining: true,
      }));
    const nextPage = Array
      .from({ length: 50 })
      .map((form, index) => ({
        code: 'form-y-' + index,
        id: 'form-id',
        title: 'training-y',
        startDate: new Date(),
        duration: 1,
        userRoles: [ 'chw' ],
        isCompletedTraining: true,
      }));
    component.trainingList = [...previousPage];
    trainingCardsService.getNextTrainings.returns(nextPage);

    await component.getTrainings();

    expect(trainingCardsService.getNextTrainings.calledOnce).to.be.true;
    expect(trainingCardsService.getNextTrainings.args[0]).to.have.deep.members([
      [ { _id: 'form-3' }, { _id: 'form-4' } ],
      50,
      50,
    ]);
    expect(component.moreTrainings).to.be.true;
    expect(component.loading).to.be.false;
    expect(component.trainingList).to.have.deep.members([ ...previousPage, ...nextPage ]);
    expect(scrollLoaderProvider.init.calledOnce).to.be.true;
    expect(consoleErrorMock.notCalled).to.be.true;
  }));

  it('should catch error when loading a page of trainings', fakeAsync(async () => {
    store.overrideSelector(Selectors.getTrainingMaterials, [ { _id: 'form-3' } ]);
    store.refreshState();
    flush();
    sinon.resetHistory();
    component.trainingList = [{
      code: 'form-x',
      id: 'form-id',
      title: 'training-x',
      startDate: new Date(),
      duration: 1,
      userRoles: [ 'chw' ],
      isCompletedTraining: true,
    }];
    trainingCardsService.getNextTrainings.throws(new Error('Ups an error'));

    await component.getTrainings();

    expect(trainingCardsService.getNextTrainings.calledOnce).to.be.true;
    expect(trainingCardsService.getNextTrainings.args[0]).to.have.deep.members([
      [ { _id: 'form-3' } ],
      50,
      1,
    ]);
    expect(component.loading).to.be.false;
    expect(stopPerformanceTrackStub.notCalled).to.be.true;
    expect(scrollLoaderProvider.init.notCalled).to.be.true;
    expect(consoleErrorMock.calledOnce).to.be.true;
    expect(consoleErrorMock.args[0][0]).to.equal('Error getting training materials.');
  }));
});

