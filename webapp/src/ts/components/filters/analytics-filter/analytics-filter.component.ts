import { AfterContentChecked, AfterContentInit, Component, Input, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'mm-analytics-filters',
  templateUrl: './analytics-filter.component.html'
})
export class AnalyticsFilterComponent implements AfterContentInit, AfterContentChecked, OnDestroy {
  @Input() analyticsModules = [];
  activeModule;
  subscriptions: Subscription = new Subscription();

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngAfterContentInit() {
    const subscription = this.route.url.subscribe(() => this.setActiveModule());
    this.subscriptions.add(subscription);
  }

  ngAfterContentChecked() {
    if (!this.activeModule && this.analyticsModules?.length) {
      this.setActiveModule();
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

  private setActiveModule() {
    this.activeModule = this.analyticsModules?.find(module => {
      return module.id === this.route.snapshot?.firstChild?.data?.moduleId;
    });
  }
}
