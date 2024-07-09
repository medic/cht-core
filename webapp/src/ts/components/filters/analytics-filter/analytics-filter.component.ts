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
import { UserSettingsService } from '@mm-services/user-settings.service';

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
      .subscribe(({ isOpen }) => this.isOpen = isOpen);
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
      '!can_view_old_filter_and_search',
      '!can_view_old_action_bar'
    ];

    return this.authService
      .has(permissions)
      .then((permissions) => permissions === true);
  }

  private isTargetAggregates() {
    const AGGREGATE_TARGET_ID = 'target-aggregates';
    return this.getCurrentModuleId() === AGGREGATE_TARGET_ID;
  }

  private async canDisplayFilterButton() {
    const isAdmin = this.sessionService.isAdmin();
    const [hasMultipleFacilities, checkPermissions] = await Promise.all([
      this.userSettingsService.hasMultipleFacilities(),
      this.checkPermissions(),
    ]);

    this.showFilterButton = !isAdmin && hasMultipleFacilities && checkPermissions && this.isTargetAggregates();
  }

  openSidebar() {
    this.globalActions.setSidebarFilter({ isOpen: !this.isOpen });
  }
}
