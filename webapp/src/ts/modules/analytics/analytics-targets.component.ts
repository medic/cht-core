import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';


import { RulesEngineService } from '@mm-services/rules-engine.service';
import { PerformanceService } from '@mm-services/performance.service';
import { GlobalActions } from '@mm-actions/global';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { ErrorLogComponent } from '@mm-components/error-log/error-log.component';
import {
  AnalyticsTargetsProgressComponent
} from '@mm-components/analytics-targets-progress/analytics-targets-progress.component';
import { AnalyticsSidebarFilterComponent } from './analytics-sidebar-filter.component';
import { ReportingPeriod } from '@mm-modules/analytics/analytics-sidebar-filter.component';
import { TranslatePipe } from '@ngx-translate/core';
import { ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';
import { TranslateFromPipe } from '@mm-pipes/translate-from.pipe';
import { LocalizeNumberPipe } from '@mm-pipes/number.pipe';
import { Selectors } from '@mm-selectors/index';


@Component({
  templateUrl: './analytics-targets.component.html',
  imports: [
    NgIf,
    ErrorLogComponent,
    NgFor,
    NgClass,
    AnalyticsTargetsProgressComponent,
    AnalyticsSidebarFilterComponent,
    TranslatePipe,
    ResourceIconPipe,
    TranslateFromPipe,
    LocalizeNumberPipe,
  ],
})
export class AnalyticsTargetsComponent implements OnInit, OnDestroy {
  private readonly globalActions: GlobalActions;
  subscriptions: Subscription = new Subscription();
  targets: any[] = [];
  loading = true;
  targetsDisabled = false;
  errorStack;
  trackPerformance;
  direction;
  sidebarFilter;
  reportingPeriodFilter;


  constructor(
    private readonly rulesEngineService: RulesEngineService,
    private readonly performanceService: PerformanceService,
    private readonly store: Store
  ) {
    this.trackPerformance = this.performanceService.track();
    this.globalActions = new GlobalActions(store);
  }


  ngOnInit(): void {
    this.subscribeToStore();
    this.getTargets();
    this.setDefaultFilters();
  }


  ngOnDestroy(): void {
    this.globalActions.clearSidebarFilter();
    this.subscriptions.unsubscribe();
  }


  private subscribeToStore() {
    const selectorsSubscription = combineLatest([
      this.store.select(Selectors.getSidebarFilter),
      this.store.select(Selectors.getDirection),
    ]).subscribe(([sidebarFilter, direction]) => {
      this.sidebarFilter = sidebarFilter;
      this.direction = direction;
    });
    this.subscriptions.add(selectorsSubscription);
  }


  private setDefaultFilters() {
    const defaultFilters = {
      reportingPeriod: ReportingPeriod.CURRENT,
    };
    this.globalActions.setSidebarFilter({ defaultFilters });
    this.reportingPeriodFilter = defaultFilters.reportingPeriod;
  }


  /**
  * Converts a serialized function string (like "() => 'x'") back into a real JS function.
  */
  private reviveFunction(fnString: string): any {
    if (typeof fnString !== 'string') {
      return fnString;
    }

    // Must contain an arrow at minimum
    if (!fnString.includes('=>')) {
      return fnString;
    }

    // SECURITY: Block dangerous keywords
    const forbidden = /(require|process|global|import|while|for\s*\(|eval)/;
    if (forbidden.test(fnString)) {
      console.warn('Blocked unsafe function:', fnString);
      return fnString;
    }

    // Extract the arrow parts
    const arrowIndex = fnString.indexOf('=>');
    const args = fnString.substring(0, arrowIndex).trim();
    const body = fnString.substring(arrowIndex + 2).trim();

    // Clean argument parentheses
    const cleanedArgs = args.replace(/^\(|\)$/g, '').trim();

    try {
      if (body.startsWith('{')) {
      // BLOCK BODY  => use function body
        return new Function(cleanedArgs, body);
      } else {
      // EXPRESSION BODY => return expression
        return new Function(cleanedArgs, `return (${body});`);
      }
    } catch (err) {
      console.error('Failed to revive function:', err, fnString);
      return fnString;
    }
  }



  /**
  * Loads targets and revives any function-based keys.
  */
  getTargets(reportingPeriod?) {
    if (reportingPeriod) {
      this.reportingPeriodFilter = reportingPeriod;
    }


    return this.rulesEngineService
      .isEnabled()
      .then(isEnabled => {
        this.targetsDisabled = !isEnabled;
        return isEnabled
          ? this.rulesEngineService.fetchTargets(this.reportingPeriodFilter)
          : [];
      })
      .catch(err => {
        console.error('Error getting targets', err);
        this.errorStack = err.stack;
        return [];
      })
      .then((targets: any[] = []) => {
        this.loading = false;


        // --- REVIVE FUNCTION FIELDS HERE ---
        this.targets = targets
          .filter(target => target.visible !== false)
          .map(target => {
            if (typeof target.subtitle_translation_key === 'string' &&
               target.subtitle_translation_key.includes('=>')) {
              target.subtitle_translation_key =
               this.reviveFunction(target.subtitle_translation_key);
            }
            return target;
          });


        this.trackPerformance?.stop({
          name: ['analytics', 'targets', 'load'].join(':'),
          recordApdex: true,
        });
      });
  }


  /**
  * Returns correct subtitle for each target.
  */
  getSubtitleKey(
    subtitleKey: string | ((period: ReportingPeriod) => string),
    reportingPeriod: ReportingPeriod
  ): string {
    if (!subtitleKey) {
      return '';
    }


    if (typeof subtitleKey === 'function') {
      return subtitleKey(reportingPeriod);
    }


    return subtitleKey;
  }
}



