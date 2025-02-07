import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ComponentFixture, fakeAsync, flush, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Router } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';
import { expect } from 'chai';
import sinon from 'sinon';

import { TrainingCardsComponent } from '@mm-modals/training-cards/training-cards.component';
import { GlobalActions } from '@mm-actions/global';
import { PerformanceService } from '@mm-services/performance.service';
import { ModalLayoutComponent } from '@mm-components/modal-layout/modal-layout.component';
import { TrainingCardsFormComponent } from '@mm-components/training-cards-form/training-cards-form.component';
import { XmlFormsService } from '@mm-services/xml-forms.service';
import { FormService } from '@mm-services/form.service';
import { GeolocationService } from '@mm-services/geolocation.service';
import { EnketoComponent } from '@mm-components/enketo/enketo.component';
import { Selectors } from '@mm-selectors/index';

describe('TrainingCardsComponent', () => {
  let fixture: ComponentFixture<TrainingCardsComponent>;
  let component: TrainingCardsComponent;
  let matDialogRef;
  let globalActions;
  let performanceService;
  let stopPerformanceTrackStub;
  let routerMock;

  beforeEach(() => {
    matDialogRef = { close: sinon.stub() };
    routerMock = {
      navigateByUrl: sinon.stub(),
    };
    globalActions = {
      clearTrainingCards: sinon.stub(GlobalActions.prototype, 'clearTrainingCards'),
      setTrainingCard: sinon.stub(GlobalActions.prototype, 'setTrainingCard'),
    };
    stopPerformanceTrackStub = sinon.stub();
    performanceService = { track: sinon.stub().returns({ stop: stopPerformanceTrackStub }) };
    const mockedSelectors = [
      { selector: Selectors.getTrainingCard, value: null },
      { selector: Selectors.getTrainingCardFormId, value: null },
    ];

    return TestBed
      .configureTestingModule({
    imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        TrainingCardsComponent,
        ModalLayoutComponent,
        TrainingCardsFormComponent,
        EnketoComponent,
    ],
    providers: [
        provideMockStore({ selectors: mockedSelectors }),
        { provide: PerformanceService, useValue: performanceService },
        { provide: MatDialogRef, useValue: matDialogRef },
        { provide: Router, useValue: routerMock },
        { provide: XmlFormsService, useValue: {} },
        { provide: FormService, useValue: { unload: sinon.stub() } },
        { provide: GeolocationService, useValue: {} },
    ],
})
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(TrainingCardsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        sinon.resetHistory();
      });
  });

  afterEach(() => sinon.restore());

  it('should create component', fakeAsync(() => {
    expect(component).to.exist;

    component.ngOnInit();
    flush();

    expect(globalActions.setTrainingCard.calledOnce).to.be.true;
    expect(globalActions.setTrainingCard.args[0][0]).to.deep.equal({ isOpen: true });
  }));

  it('should unsubscribe from store and clear training cards state', () => {
    const unsubscribeStub = sinon.stub(component.subscriptions, 'unsubscribe');

    component.ngOnDestroy();

    expect(unsubscribeStub.calledOnce).to.be.true;
    expect(globalActions.clearTrainingCards.calledOnce).to.be.true;
  });

  it('should set training cards state when not quitting the training', () => {
    component.continueTraining();

    expect(globalActions.setTrainingCard.calledOnce).to.be.true;
    expect(globalActions.setTrainingCard.args[0][0]).to.deep.equal({ showConfirmExit: false });
  });

  it('should exit training and navigate to nextUrl if present', () => {
    const nextUrl = '/next/page';

    component.exitTraining(nextUrl);

    expect(stopPerformanceTrackStub.calledOnce).to.be.true;
    expect(matDialogRef.close.calledOnce).to.be.true;
    expect(globalActions.clearTrainingCards.calledOnce).to.be.true;
    expect(routerMock.navigateByUrl.calledOnce).to.be.true;
    expect(routerMock.navigateByUrl.args[0][0]).to.equal(nextUrl);
  });

  it('should exit training and not navigate to nextUrl if not present', () => {
    component.exitTraining('');

    expect(stopPerformanceTrackStub.calledOnce).to.be.true;
    expect(matDialogRef.close.calledOnce).to.be.true;
    expect(globalActions.clearTrainingCards.calledOnce).to.be.true;
    expect(routerMock.navigateByUrl.notCalled).to.be.true;
  });

  it('should close training cards', () => {
    component.close();

    expect(matDialogRef.close.calledOnce).to.be.true;
    expect(globalActions.clearTrainingCards.calledOnce).to.be.true;
  });

});

