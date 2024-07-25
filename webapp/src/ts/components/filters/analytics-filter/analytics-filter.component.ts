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
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { AuthService } from '@mm-services/auth.service';
import { SessionService } from '@mm-services/session.service';
import { TelemetryService } from '@mm-services/telemetry.service';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { OLD_REPORTS_FILTER_PERMISSION } from '@mm-modules/reports/reports-filters.component';
import { OLD_ACTION_BAR_PERMISSION } from '@mm-components/actionbar/actionbar.component';
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
    private authService: AuthService,
    private sessionService: SessionService,
    private telemetryService: TelemetryService,
    private targetAggregatesService: TargetAggregatesService,
    private userSettingsService: UserSettingsService
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    this.canDisplayFilterButton();
    this.subscribeToRouteChanges();
    this.subscribeToStore();
  }

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

  private subscribeToStore() {
    const subscription = this.store
      .select(Selectors.getSidebarFilter)
      .subscribe((filterState) => this.isOpen = filterState?.isOpen ?? false);
    this.subscriptions.add(subscription);
  }

  private getCurrentModuleId() {
    return this.route.snapshot?.firstChild?.data?.moduleId;
  }

  private setActiveModule() {
    const currentModuleId = this.getCurrentModuleId();
    this.activeModule = this.analyticsModules?.find(module => module.id === currentModuleId);
  }

  private subscribeToRouteChanges() {
    const routeSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.canDisplayFilterButton());
    this.subscriptions.add(routeSubscription);
  }

  private checkPermissions() {
    const permissions = [
      OLD_REPORTS_FILTER_PERMISSION,
      OLD_ACTION_BAR_PERMISSION
    ];

    return this.authService
      .has(permissions)
      .then((permissions) => permissions === false);
  }

  private isTargetAggregates() {
    return this.getCurrentModuleId() === AGGREGATE_TARGETS_ID;
  }

  private isTargetAggregateEnabled() {
    return this.targetAggregatesService.isEnabled();
  }

  private async canDisplayFilterButton() {
    const isAdmin = this.sessionService.isAdmin();
    const [hasMultipleFacilities, checkPermissions, isTargetAggregateEnabled] = await Promise.all([
      this.userSettingsService.hasMultipleFacilities(),
      this.checkPermissions(),
      this.isTargetAggregateEnabled(),
    ]);

    this.showFilterButton = !isAdmin &&
      hasMultipleFacilities &&
      checkPermissions &&
      this.isTargetAggregates() &&
      isTargetAggregateEnabled;

    this.globalActions.setSidebarFilter({ hasFacilityFilter: hasMultipleFacilities });
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
