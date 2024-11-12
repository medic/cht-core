import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { expect } from 'chai';
import sinon from 'sinon';
import { of, Subject } from 'rxjs';

import { GlobalActions } from '@mm-actions/global';
import { PerformanceService } from '@mm-services/performance.service';
import { ModalLayoutComponent } from '@mm-components/modal-layout/modal-layout.component';
import { TrainingCardsFormComponent } from '@mm-components/training-cards-form/training-cards-form.component';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { FormService } from '@mm-services/form.service';
import { GeolocationService } from '@mm-services/geolocation.service';
import { EnketoComponent } from '@mm-components/enketo/enketo.component';
import { Selectors } from '@mm-selectors/index';
import { TrainingsContentComponent } from '@mm-modules/trainings/trainings-content.component';
import { ModalService } from '@mm-services/modal.service';

describe('TrainingsContentComponent', () => {
  let fixture: ComponentFixture<TrainingsContentComponent>;
  let component: TrainingsContentComponent;
  let modalService;
  let globalActions;
  let performanceService;
  let stopPerformanceTrackStub;
  let routerMock;

  beforeEach(() => {
    modalService = { show: sinon.stub() };
    routerMock = {
      navigateByUrl: sinon.stub(),
      navigate: sinon.stub(),
    };
    globalActions = {
      clearTrainingCards: sinon.stub(GlobalActions.prototype, 'clearTrainingCards'),
      setTrainingCard: sinon.stub(GlobalActions.prototype, 'setTrainingCard'),
      clearNavigation: sinon.stub(GlobalActions.prototype, 'clearNavigation'),
    };
    stopPerformanceTrackStub = sinon.stub();
    performanceService = { track: sinon.stub().returns({ stop: stopPerformanceTrackStub }) };
    const mockedSelectors = [
      { selector: Selectors.getTrainingCardFormId, value: null },
    ];

    return TestBed
      .configureTestingModule({
        imports: [
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        ],
        declarations: [
          TrainingsContentComponent,
          ModalLayoutComponent,
          TrainingCardsFormComponent,
          EnketoComponent,
        ],
        providers: [
          provideMockStore({ selectors: mockedSelectors }),
          { provide: ActivatedRoute, useValue: { params: new Subject() } },
          { provide: PerformanceService, useValue: performanceService },
          { provide: ModalService, useValue: modalService },
          { provide: Router, useValue: routerMock },
          { provide: XmlFormsService, useValue: {} },
          { provide: FormService, useValue: { unload: sinon.stub() } },
          { provide: GeolocationService, useValue: {} },
        ],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(TrainingsContentComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        sinon.resetHistory();
      });
  });

  afterEach(() => sinon.restore());

  it('should unsubscribe from store and clear training cards state', () => {
    const unsubscribeStub = sinon.stub(component.subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(unsubscribeStub.calledOnce).to.be.true;
    expect(globalActions.clearNavigation.calledOnce).to.be.true;
    expect(globalActions.clearTrainingCards.calledOnce).to.be.true;
  });

  it('should close confirmation modal when not quitting the training', () => {
    const modalRefMock = { close: sinon.stub(), afterClosed: sinon.stub().returns(of(null)) };
    modalService.show.returns(modalRefMock);
    component.quit();

    component.continueTraining();

    expect(modalRefMock.close.calledOnce).to.be.true;
  });

  it('should exit training and navigate to nextUrl if present', () => {
    const modalRefMock = { close: sinon.stub(), afterClosed: sinon.stub().returns(of(null)) };
    modalService.show.returns(modalRefMock);
    component.quit();

    component.exitTraining('/next/url');

    expect(stopPerformanceTrackStub.calledOnce).to.be.true;
    expect(modalRefMock.close.calledOnce).to.be.true;
    expect(globalActions.clearNavigation.calledOnce).to.be.true;
    expect(globalActions.clearTrainingCards.calledOnce).to.be.true;
    expect(routerMock.navigateByUrl.calledOnceWith('/next/url')).to.be.true;
  });

  it('should exit training and navigate to default path', () => {
    const modalRefMock = { close: sinon.stub(), afterClosed: sinon.stub().returns(of(null)) };
    modalService.show.returns(modalRefMock);
    component.quit();

    component.exitTraining('');

    expect(stopPerformanceTrackStub.calledOnce).to.be.true;
    expect(modalRefMock.close.calledOnce).to.be.true;
    expect(globalActions.clearNavigation.calledOnce).to.be.true;
    expect(globalActions.clearTrainingCards.calledOnce).to.be.true;
    expect(routerMock.navigateByUrl.notCalled).to.be.true;
    expect(routerMock.navigate.calledOnceWith([ '/', 'trainings' ])).to.be.true;
  });

  it('should not show confirm modal if there are errors', () => {
    component.hasError = true;

    component.quit();

    expect(routerMock.navigate.calledOnceWith([ '/', 'trainings' ])).to.be.true;
    expect(globalActions.clearNavigation.calledOnce).to.be.true;
    expect(globalActions.clearTrainingCards.calledOnce).to.be.true;
    expect(component.showConfirmExit).to.be.false;
    expect(modalService.show.notCalled).to.be.true;
  });

  it('should show confirm modal if there are not errors', () => {
    component.hasError = false;

    component.quit();

    expect(routerMock.navigate.notCalled).to.be.true;
    expect(globalActions.clearNavigation.notCalled).to.be.true;
    expect(globalActions.clearTrainingCards.notCalled).to.be.true;
    expect(component.showConfirmExit).to.be.true;
    expect(modalService.show.calledOnce).to.be.true;
  });

  it('should not deactivate navigation when it cannot exit', () => {
    const result = component.canDeactivate('/next/url');

    expect(result).to.be.false;
    expect(globalActions.setTrainingCard.calledOnceWith({ nextUrl: '/next/url' })).to.be.true;
    expect(component.showConfirmExit).to.be.true;
    expect(modalService.show.calledOnce).to.be.true;
  });

  it('should deactivate navigation when it cannot exit', () => {
    component.close();

    const result = component.canDeactivate('/next/url');

    expect(result).to.be.true;
    expect(globalActions.setTrainingCard.notCalled).to.be.true;
    expect(component.showConfirmExit).to.be.false;
    expect(modalService.show.notCalled).to.be.true;
  });
});

