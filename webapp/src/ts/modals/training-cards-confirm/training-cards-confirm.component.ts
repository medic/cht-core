import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'training-cards-confirm',
  templateUrl: './training-cards-confirm.component.html',
  imports: [MatButton, TranslatePipe]
})
export class TrainingCardsConfirmComponent implements OnInit, OnDestroy {
  @Output() exit = new EventEmitter();
  @Output() stay = new EventEmitter();
  nextUrl: null | string = null;
  subscriptions: Subscription = new Subscription();

  constructor(private readonly store: Store) {}

  ngOnInit() {
    this.subscribeToStore();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private subscribeToStore() {
    const reduxSubscription = this.store
      .select(Selectors.getTrainingCard)
      .subscribe(trainingCard => this.nextUrl = trainingCard.nextUrl);
    this.subscriptions.add(reduxSubscription);
  }
}
