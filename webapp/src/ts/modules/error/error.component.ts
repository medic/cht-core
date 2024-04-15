import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription, timer } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { TranslateService } from '@mm-services/translate.service';
import { NavigationService } from '@mm-services/navigation.service';

@Component({
  templateUrl: './error.component.html'
})
export class ErrorComponent implements OnInit, OnDestroy {
  private windowRef;
  private readonly TIMEOUT_DURATION = 5 * 1000;
  private readonly ERRORS = {
    403: {
      title: 'error.403.title',
      description: 'error.403.description',
      showBackLink: true,
    },
    404: {
      title: 'error.404.title',
      description: 'error.404.description',
      showBackLink: true,
    },
    503: {
      title: 'error.503.description',
      description: 'error.503.description'
    },
  };

  error;
  translationsLoaded = false;
  timeoutElapsed = false;
  subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private translateService: TranslateService,
    private store: Store,
    private router: Router,
    private navigationService: NavigationService,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.windowRef = this.document.defaultView;
  }

  ngOnInit(): void {
    this.error = this.ERRORS[this.route.snapshot.params.code] || this.ERRORS['404'];
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
    const timeoutTimer = timer(this.TIMEOUT_DURATION).subscribe(() => this.timeoutElapsed = true);
    this.subscriptions.add(timeoutTimer);
  }

  async exit() {
    const HOME = '/home';
    const prevUrl = this.navigationService.getPreviousUrl();
    const isHomePage = prevUrl === '/' || prevUrl === HOME;
    const isErrorPage = prevUrl?.startsWith('/error');

    if (!prevUrl || isHomePage || isErrorPage) {
      await this.router.navigate([ HOME ]);
      this.windowRef?.location?.reload();
      return;
    }

    await this.router.navigateByUrl(prevUrl);
  }
}
