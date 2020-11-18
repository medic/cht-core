import { AfterContentChecked, AfterContentInit, Component, Input, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'mm-analytics-filters',
  templateUrl: './analytics-filter.component.html'
})
export class AnalyticsFilterComponent implements AfterContentInit, AfterContentChecked, OnDestroy {
  @Input() analyticsModules = [];
  activeModule;
  subscriptions: Subscription = new Subscription();

  constructor(private router: Router) { }

  ngAfterContentInit() {
    const routeSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event:NavigationEnd) => {
        this.activeModule = this.analyticsModules.find(module => event.url.indexOf(module.route) > -1);
      });
    this.subscriptions.add(routeSubscription);
  }

  ngAfterContentChecked() {
    if (!this.activeModule) {
      this.activeModule = this.analyticsModules.find(module => this.router.url.indexOf(module.route) > -1);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  navigate(module) {
    if (!module.route) {
      return;
    }

    this.router.navigate([module.route]);
  }
}
