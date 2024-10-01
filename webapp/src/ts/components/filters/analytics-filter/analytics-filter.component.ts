import {
  AfterContentChecked,
  AfterContentInit,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import { Store } from '@ngrx/store';
import { ActivatedRoute, ActivationEnd, NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { SessionService } from '@mm-services/session.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { AGGREGATE_TARGETS_ID } from '@mm-services/analytics-modules.service';

@Component({
  selector: 'mm-analytics-filters',
  templateUrl: './analytics-filter.component.html'
})
export class AnalyticsFilterComponent implements AfterContentInit, AfterContentChecked, OnInit, OnDestroy {
  @Input() analyticsModules: any[] = [];
  @Output() toggleFilter: EventEmitter<any> = new EventEmitter();

  private globalActions;
  activeModule;
  subscriptions: Subscription = new Subscription();
  showFilterButton;
  isOpen = false;

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private router: Router,
    private sessionService: SessionService,
    private telemetryService: TelemetryService,
    private targetAggregatesService: TargetAggregatesService,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    this.canDisplayFilterButton();
    this.subscribeToRouteChanges();
    this.subscribeToStore();
  }

  ngAfterContentInit() {
    const routerSubscription = this.router.events
      .pipe(filter(event => event instanceof ActivationEnd))
      .subscribe((event: ActivationEnd) => this.setActiveModule(event?.snapshot?.data?.moduleId));
    this.subscriptions.add(routerSubscription);

    const routeSubscription = this.route.url.subscribe(() => this.setActiveModule());
    this.subscriptions.add(routeSubscription);
  }

  ngAfterContentChecked() {
    if (!this.activeModule && this.analyticsModules?.length) {
      this.setActiveModule(this.route.snapshot?.firstChild?.data?.moduleId);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private subscribeToStore() {
    const subscription = this.store
      .select(Selectors.getSidebarFilter)
      .subscribe((filterState) => this.isOpen = filterState?.isOpen ?? false);
    this.subscriptions.add(subscription);
  }

  private getCurrentModuleId() {
    return this.route.snapshot?.firstChild?.data?.moduleId;
  }

  private setActiveModule(moduleId?: string) {
    if (!moduleId) {
      moduleId = this.getCurrentModuleId();
    }
    this.activeModule = this.analyticsModules?.find(module => module.id === moduleId);
  }

  private subscribeToRouteChanges() {
    const routeSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.canDisplayFilterButton());
    this.subscriptions.add(routeSubscription);
  }

  private isTargetAggregates() {
    return this.getCurrentModuleId() === AGGREGATE_TARGETS_ID;
  }

  private isTargetAggregateEnabled() {
    return this.targetAggregatesService.isEnabled();
  }

  private async canDisplayFilterButton() {
    const isAdmin = this.sessionService.isAdmin();
    const isTargetAggregateEnabled = await this.isTargetAggregateEnabled();

    this.showFilterButton = !isAdmin && this.isTargetAggregates() && isTargetAggregateEnabled;
  }

  openSidebar() {
    this.isOpen = !this.isOpen;
    this.globalActions.setSidebarFilter({ isOpen: this.isOpen });
    if (this.isOpen) {
      // Counting every time the user opens the sidebar filter in analytics_targets_aggregrate tab.
      this.telemetryService.record('sidebar_filter:analytics:target_aggregates:open');
    }
  }
}
