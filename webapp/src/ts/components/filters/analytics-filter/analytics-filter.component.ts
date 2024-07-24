import { AfterContentChecked, AfterContentInit, Component, Input, OnDestroy } from '@angular/core';
import { ActivatedRoute, ActivationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'mm-analytics-filters',
  templateUrl: './analytics-filter.component.html'
})
export class AnalyticsFilterComponent implements AfterContentInit, AfterContentChecked, OnDestroy {
  @Input() analyticsModules: any[] = [];
  activeModule;
  subscriptions: Subscription = new Subscription();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
  ) { }

  ngAfterContentInit() {
    const subscription = this.router.events
      .pipe(filter(event => event instanceof ActivationEnd))
      .subscribe((event: ActivationEnd) => this.setActiveModule(event?.snapshot?.data?.moduleId));
    this.subscriptions.add(subscription);
  }

  ngAfterContentChecked() {
    if (!this.activeModule && this.analyticsModules?.length) {
      this.setActiveModule(this.route.snapshot?.firstChild?.data?.moduleId);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private setActiveModule(moduleId) {
    this.activeModule = this.analyticsModules?.find(module => module.id === moduleId);
  }
}
