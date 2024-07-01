import {
  AfterContentChecked,
  AfterContentInit,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'mm-analytics-filters',
  templateUrl: './analytics-filter.component.html'
})
export class AnalyticsFilterComponent implements AfterContentInit, AfterContentChecked, OnDestroy {
  @Input() analyticsModules: any[] = [];
  @Input() showFilterButton: boolean = false;
  @Output() toggleFilter: EventEmitter<any> = new EventEmitter();
  activeModule;
  subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
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

  private setActiveModule() {
    this.activeModule = this.analyticsModules?.find(module => {
      return module.id === this.route.snapshot?.firstChild?.data?.moduleId;
    });
  }
}
