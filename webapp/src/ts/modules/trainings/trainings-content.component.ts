import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { GlobalActions } from '@mm-actions/global';
import { ModalService } from '@mm-services/modal.service';
import { PerformanceService } from '@mm-services/performance.service';
import { Selectors } from '@mm-selectors/index';
import { NgIf } from '@angular/common';
import { TrainingCardsFormComponent } from '../../components/training-cards-form/training-cards-form.component';
import { ModalLayoutComponent } from '../../components/modal-layout/modal-layout.component';
import { TrainingCardsConfirmComponent } from '../../modals/training-cards-confirm/training-cards-confirm.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'training-content',
    templateUrl: './trainings-content.component.html',
    standalone: true,
    imports: [NgIf, TrainingCardsFormComponent, ModalLayoutComponent, TrainingCardsConfirmComponent, TranslatePipe]
})
export class TrainingsContentComponent implements OnInit, OnDestroy {
  @ViewChild('confirmModal') confirmModalTemplate;
  private readonly globalActions: GlobalActions;
  private confirmModalRef;
  private trackRender;
  private trainingCardID;
  private canExit = false;
  showNoSelection = false;
  showConfirmExit = false;
  hasError = false;
  subscriptions: Subscription = new Subscription();

  constructor(
    private readonly store: Store,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly modalService: ModalService,
    private readonly performanceService: PerformanceService,
  ) {
    this.globalActions = new GlobalActions(this.store);
  }

  ngOnInit() {
    this.trackRender = this.performanceService.track();
    this.subscribeToRouteParams();
    this.subscribeToStore();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.globalActions.clearNavigation();
    this.globalActions.clearTrainingCards();
  }

  private subscribeToStore() {
    const reduxSubscription = this.store
      .select(Selectors.getTrainingCardFormId)
      .subscribe(trainingCardID => this.trainingCardID = trainingCardID);
    this.subscriptions.add(reduxSubscription);
  }

  private subscribeToRouteParams() {
    const routeSubscription = this.route.params.subscribe(params => {
      this.globalActions.setTrainingCard({ formId: params?.id || null });
      if (!params?.id) {
        this.showNoSelection = true;
        this.globalActions.setShowContent(false);
      }
    });
    this.subscriptions.add(routeSubscription);
  }

  close(nextUrl?) {
    this.canExit = true;
    this.globalActions.clearNavigation();
    this.globalActions.clearTrainingCards();
    if (nextUrl) {
      return this.router.navigateByUrl(nextUrl);
    }
    return this.router.navigate([ '/', 'trainings' ]);
  }

  exitTraining(nextUrl: string) {
    this.trackRender?.stop({
      name: [ 'enketo', this.trainingCardID, 'add', 'quit' ].join(':'),
    });

    this.close(nextUrl);
    this.confirmModalRef?.close();
  }

  continueTraining() {
    this.confirmModalRef?.close();
  }

  quit() {
    if (this.hasError) {
      return this.close();
    }

    this.showConfirmExit = true;
    this.confirmModalRef = this.modalService.show(this.confirmModalTemplate);
    const subscription = this.confirmModalRef
      ?.afterClosed()
      .subscribe(() => this.showConfirmExit = false);
    this.subscriptions.add(subscription);
  }

  canDeactivate(nextUrl) {
    if (this.canExit) {
      this.canExit = false;
      return true;
    }
    this.globalActions.setTrainingCard({ nextUrl });
    this.quit();
    return false;
  }
}
