import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription, timer } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { TranslateService } from '@mm-services/translate.service';

const errors = {
  403: {
    title: 'error.403.title',
    description: 'error.403.description'
  },
  404: {
    title: 'error.404.title',
    description: 'error.404.description'
  },
  503: {
    title: 'error.503.description',
    description: 'error.503.description'
  },
};
const timeoutDuration = 5000; // 5 seconds

@Component({
  templateUrl: './error.component.html'
})
export class ErrorComponent implements OnInit, OnDestroy {
  error;
  translationsLoaded = false;
  timeoutElapsed = false;
  subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private translateService: TranslateService,
    private store: Store,
  ) {}

  ngOnInit(): void {
    this.error = errors[this.route.snapshot.params.code] || errors['404'];
    this.translationsLoaded = this.translateService.instant('error.403.description') !== 'error.403.description';

    const subscription = this.store
      .select(Selectors.getTranslationsLoaded)
      .subscribe(isLoaded => {
        if (isLoaded) {
          this.timeoutElapsed = false;
        } else {
          // Translations are not yet loaded, start timeout to give more time before displaying the default message
          this.startTimeout();
        }
        this.translationsLoaded = !!isLoaded;
      });

    this.subscriptions.add(subscription);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private startTimeout(): void {
    const timeoutTimer = timer(timeoutDuration).subscribe(() => {
      this.timeoutElapsed = true;
    });
    this.subscriptions.add(timeoutTimer);
  }
}
