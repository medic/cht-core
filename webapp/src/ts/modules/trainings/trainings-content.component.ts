import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { GlobalActions } from '@mm-actions/global';
import { ModalService } from '@mm-services/modal.service';

@Component({
  selector: 'training-content',
  templateUrl: './trainings-content.component.html'
})
export class TrainingsContentComponent implements OnInit, OnDestroy {
  @ViewChild('confirmModal') confirmModal;
  private globalActions: GlobalActions;
  private confirmModalRef;
  showNoSelection = false;
  showConfirmExit = false;
  subscriptions: Subscription = new Subscription();

  constructor(
    private readonly store: Store,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly modalService: ModalService,
  ) {
    this.globalActions = new GlobalActions(this.store);
  }

  ngOnInit() {
    this.subscribeToRouteParams();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.globalActions.clearNavigation();
  }

  private subscribeToRouteParams() {
    const routeSubscription = this.route.params.subscribe(params => {
      this.globalActions.setTrainingCard({ formId: params?.id });
      if (!params?.id) {
        this.showNoSelection = true;
        this.globalActions.setShowContent(false);
      }
    });
    this.subscriptions.add(routeSubscription);
  }

  close(nextUrl?) {
    this.globalActions.clearNavigation();
    if (nextUrl) {
      return this.router.navigateByUrl(nextUrl);
    }
    return this.router.navigate([ '/', 'trainings' ]);
  }

  exitTraining(nextUrl) {
    // ToDo this.recordPerformanceQuitTraining();
    this.close(nextUrl);
    this.confirmModalRef?.close();
  }

  continueTraining() {
    this.showConfirmExit = false;
    this.confirmModalRef?.close();
  }

  quit(showConfirmExit: boolean) {
    this.showConfirmExit = showConfirmExit;
    if (!this.showConfirmExit) {
      return this.close();
    }
    this.confirmModalRef = this.modalService.show(this.confirmModal);
  }
}
